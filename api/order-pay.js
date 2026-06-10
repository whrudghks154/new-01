const crypto = require("crypto");
const { query } = require("./lib/db");
const nodemailer = require("nodemailer");

const MAX_FIELD = 2000;
const RL_WINDOW = 10 * 60 * 1000;
const RL_MAX = 8;
const LINK_TTL_HOURS = 24;

const buckets = new Map();
const sendJson = (res, code, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(code).json(body);
};

const cl = (v) => String(v || "").trim().slice(0, MAX_FIELD);

const getIp = (req) => {
  const fwd = req.headers["x-forwarded-for"];
  return (typeof fwd === "string" && fwd.length > 0)
    ? fwd.split(",")[0].trim()
    : req.socket?.remoteAddress || "unknown";
};

const isLimited = (key) => {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + RL_WINDOW };
  if (b.reset <= now) { b.n = 0; b.reset = now + RL_WINDOW; }
  b.n += 1;
  buckets.set(key, b);
  return b.n > RL_MAX;
};

const parseBody = (req) => {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
};

const fmt = (n) => Number(n).toLocaleString("ko-KR") + "원";

const siteBase = (req) => {
  const env = String(process.env.SITE_BASE_URL || "").replace(/\/+$/, "");
  if (env) return env;
  const proto = req.headers["x-forwarded-proto"] || "https";
  return `${proto}://${req.headers.host}`;
};

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { ok: false, code: "METHOD_NOT_ALLOWED", message: "POST 요청만 가능합니다." });
  }

  if (isLimited(getIp(req))) {
    return sendJson(res, 429, { ok: false, code: "RATE_LIMITED", message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." });
  }

  const body = parseBody(req);

  /* honeypot */
  if (cl(body.website)) {
    return sendJson(res, 200, { ok: true, code: "ACCEPTED" });
  }

  /* ── 필드 추출 ── */
  const customerName = cl(body.customerName);
  const phone        = cl(body.phone);
  const email        = cl(body.email);
  const companyName  = cl(body.companyName);
  const message      = cl(body.message);
  const productName  = cl(body.productName);
  const optionLabel  = cl(body.optionLabel);
  const amount       = Number(body.amount);
  const refUrl       = cl(body.refUrl);
  const deadline     = cl(body.deadline);
  const needTax      = Boolean(body.needTax);
  const bizNumber    = cl(body.bizNumber);

  /* ── 유효성 검사 ── */
  if (!customerName || customerName.length < 2) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", field: "customerName", message: "고객명을 2자 이상 입력해주세요." });
  }
  if (!/^[0-9\-+\s()]{8,}$/.test(phone)) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", field: "phone", message: "연락처를 올바르게 입력해주세요." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", field: "email", message: "이메일을 올바르게 입력해주세요." });
  }
  if (!companyName) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", field: "companyName", message: "회사명을 입력해주세요." });
  }
  if (!message || message.length < 5) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", field: "message", message: "요청사항을 5자 이상 입력해주세요." });
  }
  if (!productName || !Number.isInteger(amount) || amount <= 0) {
    return sendJson(res, 400, { ok: false, code: "VALIDATION_FAILED", message: "상품 정보가 올바르지 않습니다." });
  }

  /* ── SMTP 환경변수 확인 ── */
  const missingEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"].filter(k => !process.env[k]);
  if (missingEnv.length > 0) {
    return sendJson(res, 500, { ok: false, code: "MAIL_CONFIG_MISSING", message: "메일 전송 설정이 완료되지 않았습니다." });
  }

  /* ── DB에 payment_requests 레코드 생성 ── */
  const token      = crypto.randomBytes(32).toString("base64url");
  const expiresAt  = new Date(Date.now() + LINK_TTL_HOURS * 3600 * 1000).toISOString();
  const itemName   = optionLabel ? `${productName} (${optionLabel})` : productName;
  const memo       = `담당자:${customerName} / 연락처:${phone} / 요청:${message.slice(0, 150)}`.slice(0, 500);

  try {
    await query(
      `insert into payment_requests
         (public_token, company_name, item_name, goods_name, amount, vat_included, memo, expires_at, status)
       values ($1, $2, $3, $4, $5, true, $6, $7, 'pending')`,
      [token, companyName, itemName, productName, amount, memo, expiresAt]
    );
  } catch (dbErr) {
    console.error("ORDER_PAY_DB_ERROR", { message: dbErr.message });
    return sendJson(res, 500, { ok: false, code: "DB_ERROR", message: "주문 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." });
  }

  const paymentUrl = `${siteBase(req)}/payment.html?token=${encodeURIComponent(token)}`;
  const orderAt    = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });

  /* ── 이메일 발송 ── */
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const adminBody = [
    "════════════════════════════════════",
    "    레드빈디자인 — 신규 주문 접수",
    "════════════════════════════════════",
    "",
    "▣ 주문 정보",
    `  주문일시  : ${orderAt}`,
    `  상품명    : ${productName}`,
    `  선택 옵션 : ${optionLabel || "—"}`,
    `  결제금액  : ${fmt(amount)} (VAT 포함)`,
    "",
    "▣ 고객 정보",
    `  고객명/담당자 : ${customerName}`,
    `  회사명/상호명 : ${companyName}`,
    `  연락처        : ${phone}`,
    `  이메일        : ${email}`,
    "",
    "▣ 요청사항",
    `  ${message}`,
    "",
    "▣ 추가 정보",
    `  참고 URL       : ${refUrl || "—"}`,
    `  희망 납기일    : ${deadline || "—"}`,
    `  세금계산서     : ${needTax ? "필요" : "불필요"}`,
    `  사업자등록번호 : ${bizNumber || "—"}`,
    "",
    "▣ 결제 링크 (고객 전달 또는 직접 처리)",
    `  ${paymentUrl}`,
    "",
    "────────────────────────────────────",
    "※ 링크 유효기간: 24시간",
  ].join("\n");

  const customerBody = [
    `${customerName}님, 주문이 접수되었습니다.`,
    "",
    "담당자 검토 후 결제 링크를 안내드리거나 직접 연락드리겠습니다.",
    "",
    "──────────────────────",
    "▣ 주문 내역",
    `  상품명    : ${itemName}`,
    `  결제금액  : ${fmt(amount)} (VAT 포함)`,
    `  접수일시  : ${orderAt}`,
    "──────────────────────",
    "",
    "레드빈디자인",
    "전화: 010-8945-7660",
    "이메일: whrudghks154@naver.com",
    "운영시간: 24시간",
  ].join("\n");

  try {
    await Promise.all([
      transporter.sendMail({
        from:    `"레드빈디자인 주문시스템" <${process.env.SMTP_USER}>`,
        to:      process.env.CONTACT_TO || "whrudghks154@naver.com",
        replyTo: email,
        subject: `[레드빈디자인 주문] ${companyName} — ${productName} ${fmt(amount)}`,
        text:    adminBody,
      }),
      transporter.sendMail({
        from:    `"레드빈디자인" <${process.env.SMTP_USER}>`,
        to:      email,
        subject: `[레드빈디자인] 주문 접수 완료 — ${itemName}`,
        text:    customerBody,
      }),
    ]);
  } catch (mailErr) {
    /* 이메일 실패 시에도 DB 레코드는 유효 — 결제 진행 가능 */
    console.error("ORDER_PAY_MAIL_ERROR", { code: mailErr.code });
  }

  return sendJson(res, 200, {
    ok:         true,
    code:       "ORDER_CREATED",
    token,
    paymentUrl,
  });
};
