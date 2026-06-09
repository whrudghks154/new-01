const crypto = require("crypto");
const { query } = require("./lib/db");

const REVIEW_AMOUNT = 1004;
const REVIEW_COMPANY = "나이스페이 심사";
const REVIEW_ITEM = "디자인 용역 서비스 결제";
const EXPIRES_MINUTES = 30;

const sendJson = (res, statusCode, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
};

const createPublicToken = () => crypto.randomBytes(32).toString("base64url");

const getSiteBaseUrl = (req) => {
  const configured = String(process.env.SITE_BASE_URL || "").replace(/\/+$/, "");
  if (configured) return configured;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, {
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "POST 요청만 가능합니다."
    });
  }

  try {
    const token = createPublicToken();
    const expiresAt = new Date(Date.now() + EXPIRES_MINUTES * 60 * 1000).toISOString();

    await query(
      `insert into payment_requests
         (public_token, company_name, item_name, goods_name, amount, vat_included, memo, expires_at, status)
       values ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')`,
      [
        token,
        REVIEW_COMPANY,
        REVIEW_ITEM,
        REVIEW_ITEM,
        REVIEW_AMOUNT,
        true,
        "나이스페이먼츠 심사용 결제 확인",
        expiresAt
      ]
    );

    const paymentUrl = `${getSiteBaseUrl(req)}/payment.html?token=${encodeURIComponent(token)}`;
    return sendJson(res, 200, { ok: true, paymentUrl });
  } catch (error) {
    console.error("REVIEW_PAYMENT_ERROR", { message: error.message });
    return sendJson(res, 500, {
      ok: false,
      code: "REVIEW_PAYMENT_ERROR",
      message: "결제 링크 생성 중 오류가 발생했습니다."
    });
  }
};
