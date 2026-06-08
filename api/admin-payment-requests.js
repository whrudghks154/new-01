const crypto = require("crypto");
const { query } = require("./lib/db");
const { requireAdmin, requireAdminPostSecurity } = require("./lib/admin-auth");

const sendJson = (res, statusCode, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;

  try {
    return JSON.parse(req.body);
  } catch {
    return Object.fromEntries(new URLSearchParams(req.body).entries());
  }
};

const getSiteBaseUrl = (req) => {
  const configured = String(process.env.SITE_BASE_URL || "").replace(/\/+$/, "");
  if (configured) return configured;

  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
};

const createPublicToken = () => crypto.randomBytes(32).toString("base64url");

const normalizeRequest = (body) => {
  const companyName = String(body.companyName || "").trim();
  const itemName = String(body.itemName || "").trim();
  const amount = Number(body.amount);
  const vatIncluded = body.vatIncluded !== false && body.vatIncluded !== "false";
  const memo = String(body.memo || "").trim() || null;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;

  if (!companyName || !itemName) {
    const error = new Error("고객사명과 결제 항목명을 입력해 주세요.");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    const error = new Error("결제 금액은 1원 이상의 정수여야 합니다.");
    error.statusCode = 400;
    throw error;
  }

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    const error = new Error("유효기간 형식이 올바르지 않습니다.");
    error.statusCode = 400;
    throw error;
  }

  return {
    companyName,
    itemName,
    goodsName: itemName,
    amount,
    vatIncluded,
    memo,
    expiresAt: expiresAt ? expiresAt.toISOString() : null
  };
};

const listPaymentRequests = async () => {
  await query(
    `update payment_attempts pa
     set status = 'recovery_required',
         result_code = coalesce(result_code, 'PROCESSING_TIMEOUT'),
         result_message = coalesce(result_message, 'processing 만료로 운영 확인 필요'),
         updated_at = now()
     from payment_requests pr
     where pa.payment_request_id = pr.id
       and pr.status = 'processing'
       and pr.processing_expires_at is not null
       and pr.processing_expires_at < now()
       and pa.status in ('created', 'authenticated')`
  );

  await query(
    `update payment_requests
     set status = 'recovery_required'
         , updated_at = now()
     where status = 'processing'
       and processing_expires_at is not null
       and processing_expires_at < now()`
  );

  await query(
    `update payment_requests
     set status = 'expired'
     where status = 'pending'
       and expires_at is not null
       and expires_at <= now()`
  );

  const result = await query(
    `select
       public_token, company_name, item_name, amount, vat_included, memo, status,
       expires_at, paid_at, closed_at, created_at, updated_at
     from payment_requests
     order by created_at desc
     limit 100`
  );

  return result.rows;
};

module.exports = async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "GET 또는 POST 요청만 가능합니다."
    });
  }

  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === "GET") {
      const rows = await listPaymentRequests();
      return sendJson(res, 200, { ok: true, requests: rows });
    }

    if (!requireAdminPostSecurity(req, res)) return;

    const data = normalizeRequest(parseBody(req));
    const token = createPublicToken();
    const result = await query(
      `insert into payment_requests
         (public_token, company_name, item_name, goods_name, amount, vat_included, memo, expires_at, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
       returning public_token, company_name, item_name, amount, vat_included, memo, status, expires_at, created_at`,
      [
        token,
        data.companyName,
        data.itemName,
        data.goodsName,
        data.amount,
        data.vatIncluded,
        data.memo,
        data.expiresAt
      ]
    );

    const paymentUrl = `${getSiteBaseUrl(req)}/payment.html?token=${encodeURIComponent(token)}`;
    return sendJson(res, 201, {
      ok: true,
      request: result.rows[0],
      paymentUrl
    });
  } catch (error) {
    console.error("ADMIN_PAYMENT_REQUESTS_ERROR", { message: error.message });
    return sendJson(res, error.statusCode || 500, {
      ok: false,
      code: error.statusCode ? "INVALID_PAYMENT_REQUEST" : "PAYMENT_REQUEST_ERROR",
      message: error.statusCode ? error.message : "결제 요청 처리 중 오류가 발생했습니다."
    });
  }
};
