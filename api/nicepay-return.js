const crypto = require("crypto");
const { query, withTransaction } = require("./lib/db");

const redirect = (res, location) => {
  res.statusCode = 302;
  res.setHeader("Location", location);
  return res.end();
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;

  const contentType = String(req.headers["content-type"] || "");

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const params = new URLSearchParams(req.body);
  return Object.fromEntries(params.entries());
};

const getString = (value) => String(value || "").trim();

const timingSafeEqual = (a, b) => {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const createBasicAuth = (clientId, secretKey) => {
  const credentials = Buffer.from(`${clientId}:${secretKey}`, "utf8").toString("base64");
  return `Basic ${credentials}`;
};

const createAuthSignature = ({ authToken, clientId, amount, secretKey }) => {
  return crypto
    .createHash("sha256")
    .update(`${authToken}${clientId}${amount}${secretKey}`)
    .digest("hex");
};

const createApprovalSignature = ({ tid, amount, ediDate, secretKey }) => {
  return crypto
    .createHash("sha256")
    .update(`${tid}${amount}${ediDate}${secretKey}`)
    .digest("hex");
};

const verifyOrderToken = ({ token, orderId, amount, secret }) => {
  const [encodedPayload, receivedSignature] = getString(token).split(".");

  if (!encodedPayload || !receivedSignature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("hex");

  if (!timingSafeEqual(expectedSignature, receivedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    return (
      payload.orderId === orderId &&
      Number(payload.amount) === amount &&
      Number(payload.expiresAt) > Date.now()
    );
  } catch {
    return false;
  }
};

const approvePayment = async ({ tid, amount, clientId, secretKey }) => {
  const baseUrl = String(process.env.NICEPAY_API_BASE_URL || "").replace(/\/+$/, "");

  if (!baseUrl) {
    const error = new Error("NICEPAY_API_BASE_URL 환경변수가 설정되지 않았습니다.");
    error.status = 500;
    throw error;
  }

  let response;

  try {
    response = await fetch(`${baseUrl}/v1/payments/${encodeURIComponent(tid)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: createBasicAuth(clientId, secretKey)
      },
      body: JSON.stringify({ amount })
    });
  } catch (cause) {
    const error = new Error("NICEPAY 승인 API 결과를 확인할 수 없습니다.");
    error.resultUnknown = true;
    error.cause = cause;
    throw error;
  }

  let payload;

  try {
    payload = await response.json();
  } catch (cause) {
    const error = new Error("NICEPAY 승인 응답을 해석할 수 없습니다.");
    error.resultUnknown = true;
    error.status = response.status;
    error.cause = cause;
    throw error;
  }

  if (!response.ok) {
    const error = new Error(payload.resultMsg || "NICEPAY 승인 API 호출에 실패했습니다.");
    error.payload = payload;
    error.status = response.status;
    error.resultUnknown = response.status >= 500;
    error.definiteFailure = response.status < 500 && Boolean(payload.resultCode);
    throw error;
  }

  if (payload.resultCode !== "0000") {
    const error = new Error(payload.resultMsg || "NICEPAY 승인이 거절되었습니다.");
    error.payload = payload;
    error.status = response.status;
    error.definiteFailure = Boolean(payload.resultCode);
    error.resultUnknown = !payload.resultCode;
    throw error;
  }

  if (payload.status !== "paid" || Number(payload.amount) !== amount) {
    const error = new Error("NICEPAY 승인 결과를 확정할 수 없습니다.");
    error.payload = payload;
    error.status = response.status;
    error.resultUnknown = true;
    throw error;
  }

  const approvalSignature = getString(payload.signature);
  const ediDate = getString(payload.ediDate);
  const approvedTid = getString(payload.tid || tid);
  const approvedAmount = Number(payload.amount);

  if (!approvalSignature || !ediDate || !approvedTid || !Number.isInteger(approvedAmount)) {
    const error = new Error("NICEPAY 승인 응답 서명 검증 정보가 없습니다.");
    error.payload = payload;
    error.status = response.status;
    error.resultUnknown = true;
    throw error;
  }

  const expectedSignature = createApprovalSignature({
    tid: approvedTid,
    amount: approvedAmount,
    ediDate,
    secretKey
  });

  if (!timingSafeEqual(expectedSignature, approvalSignature)) {
    const error = new Error("NICEPAY 승인 응답 서명이 일치하지 않습니다.");
    error.payload = payload;
    error.status = response.status;
    error.resultUnknown = true;
    throw error;
  }

  return payload;
};

const markRecoveryRequired = async ({ orderId, reason }) => {
  await query(
    `update payment_attempts
     set status = 'recovery_required',
         result_code = coalesce(result_code, $2),
         result_message = coalesce(result_message, $3)
     where order_id = $1`,
    [orderId, "RESULT_UNKNOWN", reason || "NICEPAY 승인 결과 확인 필요"]
  ).catch((error) => {
    console.error("NICEPAY_RECOVERY_ATTEMPT_SAVE_ERROR", { orderId, message: error.message });
  });

  await query(
    `update payment_requests pr
     set status = 'recovery_required',
         processing_expires_at = null
     from payment_attempts pa
     where pa.order_id = $1
       and pa.payment_request_id = pr.id`,
    [orderId]
  ).catch((error) => {
    console.error("NICEPAY_RECOVERY_REQUEST_SAVE_ERROR", { orderId, message: error.message });
  });
};

const getAttemptState = async (orderId) => {
  const result = await query(
    `select
       pa.status as attempt_status,
       pr.status as request_status
     from payment_attempts pa
     join payment_requests pr on pr.id = pa.payment_request_id
     where pa.order_id = $1
     limit 1`,
    [orderId]
  );

  return result.rows[0] || null;
};

const redirectDuplicateCallback = async ({ res, orderId }) => {
  const state = await getAttemptState(orderId).catch((error) => {
    console.error("NICEPAY_DUPLICATE_STATE_LOOKUP_FAILED", { orderId, message: error.message });
    return null;
  });

  console.warn("NICEPAY_DUPLICATE_CALLBACK_BLOCKED", {
    orderId,
    requestStatus: state && state.request_status,
    attemptStatus: state && state.attempt_status
  });

  if (state && state.request_status === "paid") {
    return redirect(res, "/payment-complete.html");
  }

  return redirect(res, "/payment-review.html");
};

const failAttempt = async ({ orderId, resultCode, resultMessage, resetRequest }) => {
  if (!orderId) return;

  await query(
    `update payment_attempts
     set status = 'failed',
         result_code = coalesce($2, result_code),
         result_message = coalesce($3, result_message)
     where order_id = $1`,
    [orderId, resultCode || null, resultMessage || null]
  ).catch((error) => {
    console.error("NICEPAY_ATTEMPT_FAIL_SAVE_ERROR", { orderId, message: error.message });
  });

  if (resetRequest) {
    await query(
      `update payment_requests pr
       set status = 'pending',
           processing_expires_at = null
       from payment_attempts pa
       where pa.order_id = $1
         and pa.payment_request_id = pr.id
         and pr.status = 'processing'`,
      [orderId]
    ).catch((error) => {
      console.error("NICEPAY_REQUEST_RESET_ERROR", { orderId, message: error.message });
    });
  }
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return redirect(res, "/payment-failed.html?reason=method");
  }

  const clientId = process.env.NICEPAY_CLIENT_ID;
  const secretKey = process.env.NICEPAY_SECRET_KEY;
  const signingSecret = process.env.NICEPAY_ORDER_SIGNING_SECRET;

  if (!clientId || !secretKey || !signingSecret) {
    console.error("NICEPAY_CONFIG_MISSING");
    return redirect(res, "/payment-failed.html?reason=config");
  }

  const body = parseBody(req);
  const authResultCode = getString(body.authResultCode);
  const amount = Number(getString(body.amount));
  const tid = getString(body.tid);
  const receivedClientId = getString(body.clientId);
  const orderId = getString(body.orderId);
  const authToken = getString(body.authToken);
  const signature = getString(body.signature);
  const mallReserved = getString(body.mallReserved);
  let attempt;

  if (authResultCode !== "0000") {
    console.warn("NICEPAY_AUTH_FAILED_REVIEW_REQUIRED", {
      authResultCode,
      hasOrderId: Boolean(orderId)
    });
    return redirect(res, "/payment-review.html");
  }

  if (!authToken || !signature || !tid || !receivedClientId || !orderId || !Number.isInteger(amount)) {
    console.warn("NICEPAY_RETURN_VALIDATION_REJECTED", {
      hasAuthToken: Boolean(authToken),
      hasSignature: Boolean(signature),
      tidExists: Boolean(tid),
      hasClientId: Boolean(receivedClientId),
      hasOrderId: Boolean(orderId),
      receivedAmount: body.amount
    });
    return redirect(res, "/payment-review.html");
  }

  try {
    const attemptResult = await query(
      `select
         pa.id as attempt_id, pa.order_id, pa.amount as attempt_amount, pa.status as attempt_status,
         pr.id as request_id, pr.amount as request_amount, pr.status as request_status,
         pr.processing_expires_at
       from payment_attempts pa
       join payment_requests pr on pr.id = pa.payment_request_id
       where pa.order_id = $1
       limit 1`,
      [orderId]
    );

    if (attemptResult.rowCount === 0) {
      console.error("NICEPAY_ATTEMPT_NOT_FOUND", { orderId });
      return redirect(res, "/payment-review.html");
    }

    attempt = attemptResult.rows[0];
  } catch (error) {
    console.error("NICEPAY_ATTEMPT_LOOKUP_FAILED", { orderId, message: error.message });
    return redirect(res, "/payment-review.html");
  }

  if (attempt.request_status === "paid") {
    console.error("NICEPAY_ALREADY_PAID_BLOCKED", { orderId });
    return redirect(res, "/payment-complete.html");
  }

  if (
    attempt.request_status !== "processing" ||
    !attempt.processing_expires_at ||
    new Date(attempt.processing_expires_at).getTime() <= Date.now() ||
    !["created", "authenticated"].includes(attempt.attempt_status)
  ) {
    console.warn("NICEPAY_CALLBACK_STATE_BLOCKED", {
      orderId,
      requestStatus: attempt.request_status,
      attemptStatus: attempt.attempt_status
    });
    return redirectDuplicateCallback({ res, orderId });
  }

  if (receivedClientId !== clientId || amount !== attempt.attempt_amount || amount !== attempt.request_amount) {
    console.warn("NICEPAY_RETURN_VALIDATION_REJECTED", {
      clientIdMatches: receivedClientId === clientId,
      receivedAmount: body.amount
    });
    return redirect(res, "/payment-review.html");
  }

  const expectedSignature = createAuthSignature({
    authToken,
    clientId,
    amount,
    secretKey
  });

  if (!timingSafeEqual(expectedSignature, signature)) {
    console.warn("NICEPAY_RETURN_SIGNATURE_REJECTED", {
      tid,
      orderId
    });
    return redirect(res, "/payment-review.html");
  }

  if (!verifyOrderToken({
    token: mallReserved,
    orderId,
    amount,
    secret: signingSecret
  })) {
    console.warn("NICEPAY_RETURN_TOKEN_REJECTED", {
      tid,
      orderId
    });
    return redirect(res, "/payment-review.html");
  }

  try {
    const claimed = await query(
      `update payment_attempts
       set status = 'authenticated',
           tid = $2,
           auth_result_code = $3
       where order_id = $1
         and status = 'created'
       returning id`,
      [orderId, tid, authResultCode]
    );

    if (claimed.rowCount !== 1) {
      return redirectDuplicateCallback({ res, orderId });
    }

    const approval = await approvePayment({
      tid,
      amount,
      clientId,
      secretKey
    });

    console.info("NICEPAY_APPROVED", {
      tid: approval.tid,
      orderId: approval.orderId,
      amount: approval.amount,
      status: approval.status
    });

    try {
      await withTransaction(async (client) => {
        await client.query(
          `update payment_attempts
           set status = 'approved',
               tid = $2,
               result_code = $3,
               result_message = $4
           where order_id = $1`,
          [orderId, approval.tid || tid, approval.resultCode || null, approval.resultMsg || null]
        );

        const paid = await client.query(
          `update payment_requests pr
           set status = 'paid',
               paid_at = now(),
               processing_expires_at = null
           from payment_attempts pa
           where pa.order_id = $1
             and pa.payment_request_id = pr.id
             and pr.status = 'processing'
           returning pr.id`,
          [orderId]
        );

        if (paid.rowCount !== 1) {
          throw new Error("결제 요청 paid 상태 저장에 실패했습니다.");
        }
      });
    } catch (saveError) {
      console.error("NICEPAY_APPROVED_DB_SAVE_FAILED", {
        tid,
        orderId,
        amount,
        message: saveError.message
      });

      await query(
        `update payment_requests pr
         set status = 'recovery_required'
         from payment_attempts pa
         where pa.order_id = $1
           and pa.payment_request_id = pr.id`
      , [orderId]).catch((recoveryError) => {
        console.error("NICEPAY_RECOVERY_MARK_FAILED", {
          orderId,
          message: recoveryError.message
        });
      });

      await query(
        `update payment_attempts
         set status = 'recovery_required',
             result_code = coalesce($2, result_code),
             result_message = 'NICEPAY 승인 성공 후 DB 저장 실패'
         where order_id = $1`,
        [orderId, approval.resultCode || null]
      ).catch(() => {});

      return redirect(res, "/payment-complete.html?recovery=required");
    }

    return redirect(res, "/payment-complete.html");
  } catch (error) {
    if (error.resultUnknown || !error.definiteFailure) {
      console.error("NICEPAY_APPROVAL_RESULT_UNKNOWN", {
        tid,
        orderId,
        status: error.status,
        message: error.message
      });

      await markRecoveryRequired({
        orderId,
        reason: error.message
      });

      return redirect(res, "/payment-review.html");
    }

    console.error("NICEPAY_APPROVAL_FAILED", {
      tid,
      status: error.status,
      resultCode: error.payload && error.payload.resultCode,
      message: error.message
    });

    await failAttempt({
      orderId,
      resultCode: error.payload && error.payload.resultCode,
      resultMessage: error.message,
      resetRequest: true
    });

    return redirect(res, "/payment-failed.html?reason=approval");
  }
};
