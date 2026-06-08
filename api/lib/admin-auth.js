const crypto = require("crypto");

const COOKIE_NAME = "redbean_admin_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

const getString = (value) => String(value || "").trim();

const timingSafeEqual = (a, b) => {
  const left = Buffer.from(String(a), "utf8");
  const right = Buffer.from(String(b), "utf8");

  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
};

const hashPassword = ({ password, salt, iterations }) => {
  return crypto
    .pbkdf2Sync(password, salt, Number(iterations), 32, "sha256")
    .toString("base64url");
};

const verifyPassword = (password) => {
  const passwordHash = getString(process.env.ADMIN_PASSWORD_HASH);
  const parts = passwordHash.split("$");

  if (parts.length !== 4 || parts[0] !== "pbkdf2") {
    throw new Error("ADMIN_PASSWORD_HASH 형식이 올바르지 않습니다.");
  }

  const [, iterations, salt, expectedHash] = parts;
  const actualHash = hashPassword({ password, salt, iterations });
  return timingSafeEqual(actualHash, expectedHash);
};

const getSessionSecret = () => {
  const secret = getString(process.env.ADMIN_SESSION_SECRET);
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.");
  }
  return secret;
};

const getAllowedOrigins = () => {
  const origins = [];
  const configured = getString(process.env.SITE_BASE_URL);

  if (configured) {
    origins.push(new URL(configured).origin);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173");
  }

  return origins;
};

const requireAdminPostSecurity = (req, res) => {
  const origin = getString(req.headers.origin);
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  const allowedOrigins = getAllowedOrigins();

  if (!origin || !allowedOrigins.includes(origin)) {
    res.status(403).json({
      ok: false,
      code: "ORIGIN_FORBIDDEN",
      message: "허용되지 않은 요청입니다."
    });
    return false;
  }

  if (!contentType.includes("application/json")) {
    res.status(415).json({
      ok: false,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "JSON 요청만 가능합니다."
    });
    return false;
  }

  return true;
};

const sign = (payload) => {
  return crypto.createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
};

const createSessionValue = () => {
  const payload = Buffer.from(
    JSON.stringify({
      role: "admin",
      expiresAt: Date.now() + SESSION_TTL_MS,
      nonce: crypto.randomBytes(16).toString("base64url")
    }),
    "utf8"
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
};

const parseCookies = (req) => {
  const header = String(req.headers.cookie || "");
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      })
  );
};

const verifySession = (req) => {
  const value = parseCookies(req)[COOKIE_NAME];
  if (!value) return false;

  const [payload, receivedSignature] = value.split(".");
  if (!payload || !receivedSignature || !timingSafeEqual(sign(payload), receivedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.role === "admin" && Number(session.expiresAt) > Date.now();
  } catch {
    return false;
  }
};

const serializeCookie = (value, maxAge) => {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ];

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    parts.push("Secure");
  }

  return parts.join("; ");
};

const setSessionCookie = (res) => {
  res.setHeader("Set-Cookie", serializeCookie(createSessionValue(), Math.floor(SESSION_TTL_MS / 1000)));
};

const clearSessionCookie = (res) => {
  res.setHeader("Set-Cookie", serializeCookie("", 0));
};

const requireAdmin = (req, res) => {
  if (verifySession(req)) return true;

  res.status(401).json({
    ok: false,
    code: "UNAUTHORIZED",
    message: "관리자 로그인이 필요합니다."
  });
  return false;
};

module.exports = {
  clearSessionCookie,
  getSessionSecret,
  requireAdmin,
  requireAdminPostSecurity,
  setSessionCookie,
  verifyPassword,
  verifySession
};
