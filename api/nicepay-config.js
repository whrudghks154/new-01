const crypto = require("crypto");
const { withTransaction } = require("./lib/db");

const TOKEN_TTL_MS = 10 * 60 * 1000;
const PROCESSING_TTL_MINUTES = 15;

const sendJson = (res, statusCode, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
};

const createOrderId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString("hex");
  return `redbean-${timestamp}-${random}`;
};

const toBase64Url = (value) => {
  return Buffer.from(value, "utf8").toString("base64url");
};

const createToken = ({ orderId, amount, secret }) => {
  const payload = JSON.stringify({
    orderId,
    amount,
    expiresAt: Date.now() + TOKEN_TTL_MS
  });
  const encodedPayload = toBase64Url(payload);
  const signature = crypto
    .createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("hex");

  return `${encodedPayload}.${signature}`;
};

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "GET 요청만 가능합니다."
    });
  }

  const clientId = process.env.NICEPAY_CLIENT_ID;
  const returnUrl = process.env.NICEPAY_RETURN_URL;
  const signingSecret = process.env.NICEPAY_ORDER_SIGNING_SECRET;
  const token = String(req.query.token || "").trim();

  if (!clientId || !returnUrl || !signingSecret) {
    return sendJson(res, 500, {
      ok: false,
      code: "NICEPAY_CONFIG_MISSING",
      message: "NICEPAY 결제 설정이 완료되지 않았습니다."
    });
  }

  if (!token) {
    return sendJson(res, 400, {
      ok: false,
      code: "TOKEN_REQUIRED",
      message: "결제 링크 토큰이 필요합니다."
    });
  }

  try {
    const config = await withTransaction(async (client) => {
      const orderId = createOrderId();

      await client.query(
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

      await client.query(
        `update payment_requests
         set status = 'recovery_required'
             , updated_at = now()
         where public_token = $1
           and status = 'processing'
           and processing_expires_at is not null
           and processing_expires_at < now()`,
        [token]
      );

      await client.query(
        `update payment_requests
         set status = 'expired'
         where public_token = $1
           and status = 'pending'
           and expires_at is not null
           and expires_at <= now()`,
        [token]
      );

      const locked = await client.query(
        `update payment_requests
         set status = 'processing',
             processing_expires_at = now() + ($2::int * interval '1 minute')
         where public_token = $1
           and status = 'pending'
           and (expires_at is null or expires_at > now())
         returning id, goods_name, item_name, amount`,
        [token, PROCESSING_TTL_MINUTES]
      );

      if (locked.rowCount === 0) {
        const error = new Error("결제를 진행할 수 없는 요청입니다.");
        error.statusCode = 409;
        throw error;
      }

      const request = locked.rows[0];
      await client.query(
        `insert into payment_attempts (payment_request_id, order_id, amount, status)
         values ($1, $2, $3, 'created')`,
        [request.id, orderId, request.amount]
      );

      return {
        clientId,
        returnUrl,
        orderId,
        mallReserved: createToken({
          orderId,
          amount: request.amount,
          secret: signingSecret
        }),
        goodsName: request.goods_name,
        displayGoodsName: request.item_name,
        amount: request.amount
      };
    });

    return sendJson(res, 200, {
      ok: true,
      config
    });
  } catch (error) {
    console.error("NICEPAY_CONFIG_ERROR", { message: error.message });
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      code: error.statusCode ? "PAYMENT_REQUEST_LOCKED" : "NICEPAY_CONFIG_ERROR",
      message: error.statusCode ? error.message : "결제 설정을 불러오지 못했습니다."
    });
  }
};
