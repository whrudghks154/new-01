const { query } = require("./lib/db");

const sendJson = (res, statusCode, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
};

const getPublicStatus = (row) => row.status;

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "GET 요청만 가능합니다."
    });
  }

  const token = String(req.query.token || "").trim();
  if (!token) {
    return sendJson(res, 400, {
      ok: false,
      code: "TOKEN_REQUIRED",
      message: "결제 링크 토큰이 필요합니다."
    });
  }

  try {
    await query(
      `update payment_attempts pa
       set status = 'recovery_required',
           result_code = coalesce(result_code, 'PROCESSING_TIMEOUT'),
           result_message = coalesce(result_message, 'processing 만료로 운영 확인 필요'),
           updated_at = now()
       from payment_requests pr
       where pa.payment_request_id = pr.id
         and pr.public_token = $1
         and pr.status = 'processing'
         and pr.processing_expires_at is not null
         and pr.processing_expires_at < now()
         and pa.status in ('created', 'authenticated')`,
      [token]
    );

    await query(
      `update payment_requests
       set status = 'recovery_required'
           , updated_at = now()
       where public_token = $1
         and status = 'processing'
         and processing_expires_at is not null
         and processing_expires_at < now()`,
      [token]
    );

    await query(
      `update payment_requests
       set status = 'expired'
       where public_token = $1
         and status = 'pending'
         and expires_at is not null
         and expires_at <= now()`,
      [token]
    );

    const result = await query(
      `select company_name, item_name, amount, vat_included, status, expires_at, processing_expires_at
       from payment_requests
       where public_token = $1
       limit 1`,
      [token]
    );

    if (result.rowCount === 0) {
      return sendJson(res, 404, {
        ok: false,
        code: "PAYMENT_REQUEST_NOT_FOUND",
        message: "결제 요청을 찾을 수 없습니다."
      });
    }

    const row = result.rows[0];
    return sendJson(res, 200, {
      ok: true,
      request: {
        companyName: row.company_name,
        itemName: row.item_name,
        amount: row.amount,
        vatIncluded: row.vat_included,
        status: getPublicStatus(row),
        expiresAt: row.expires_at
      }
    });
  } catch (error) {
    console.error("PUBLIC_PAYMENT_REQUEST_ERROR", { message: error.message });
    return sendJson(res, 500, {
      ok: false,
      code: "PAYMENT_REQUEST_ERROR",
      message: "결제 요청을 불러오지 못했습니다."
    });
  }
};
