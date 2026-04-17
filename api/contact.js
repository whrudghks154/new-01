const nodemailer = require("nodemailer");

const MAX_FIELD_LENGTH = 2000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const DEFAULT_CONTACT_TO = "whrudghks154@naver.com";
const requestBuckets = new Map();

const validators = {
  name: (value) => typeof value === "string" && value.trim().length >= 2,
  phone: (value) => typeof value === "string" && /^[0-9\-+\s()]{8,}$/.test(value.trim()),
  email: (value) => typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  service: (value) => typeof value === "string" && value.trim().length > 0,
  message: (value) => typeof value === "string" && value.trim().length >= 10
};

const clean = (value) => String(value || "").trim().slice(0, MAX_FIELD_LENGTH);

const sendJson = (res, statusCode, payload) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(statusCode).json(payload);
};

const parseBody = (body) => {
  if (!body) return {};
  if (typeof body === "object") return body;
  try {
    return JSON.parse(body);
  } catch {
    return {};
  }
};

const getClientKey = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
};

const isRateLimited = (key) => {
  const now = Date.now();
  const bucket = requestBuckets.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }

  bucket.count += 1;
  requestBuckets.set(key, bucket);

  return bucket.count > RATE_LIMIT_MAX;
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

  if (isRateLimited(getClientKey(req))) {
    return sendJson(res, 429, {
      ok: false,
      code: "RATE_LIMITED",
      message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."
    });
  }

  const body = parseBody(req.body);

  if (clean(body.website)) {
    return sendJson(res, 200, {
      ok: true,
      code: "ACCEPTED",
      message: "문의가 접수되었습니다."
    });
  }

  const inquiry = {
    name: clean(body.name),
    phone: clean(body.phone),
    email: clean(body.email),
    service: clean(body.service),
    message: clean(body.message)
  };

  const invalidField = Object.keys(validators).find((key) => !validators[key](inquiry[key]));

  if (invalidField) {
    return sendJson(res, 400, {
      ok: false,
      code: "VALIDATION_FAILED",
      field: invalidField,
      message: "입력 내용을 확인해주세요. 문의 내용은 10자 이상 작성해야 합니다."
    });
  }

  const requiredEnv = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    return sendJson(res, 500, {
      ok: false,
      code: "MAIL_CONFIG_MISSING",
      message: "메일 전송 설정이 완료되지 않았습니다."
    });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: String(process.env.SMTP_SECURE || "true") === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const subject = `[레드빈디자인 문의] ${inquiry.name}님의 상담 요청`;
  const text = [
    "레드빈디자인 홈페이지 문의",
    "",
    `이름/회사명: ${inquiry.name}`,
    `연락처: ${inquiry.phone}`,
    `이메일: ${inquiry.email}`,
    `필요한 서비스: ${inquiry.service}`,
    "",
    "문의 내용",
    inquiry.message
  ].join("\n");

  try {
    await transporter.sendMail({
      from: `"레드빈디자인 홈페이지" <${process.env.SMTP_USER}>`,
      to: process.env.CONTACT_TO || DEFAULT_CONTACT_TO,
      replyTo: inquiry.email,
      subject,
      text
    });

    return sendJson(res, 200, {
      ok: true,
      code: "SENT",
      message: "상담 요청이 전송되었습니다. 확인 후 연락드리겠습니다."
    });
  } catch (error) {
    console.error("MAIL_SEND_FAILED", {
      code: error.code,
      command: error.command,
      responseCode: error.responseCode
    });

    return sendJson(res, 502, {
      ok: false,
      code: "MAIL_SEND_FAILED",
      message: "메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요."
    });
  }
};
