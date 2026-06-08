const crypto = require("crypto");
const { query } = require("./lib/db");
const { getSessionSecret, requireAdminPostSecurity, setSessionCookie, verifyPassword } = require("./lib/admin-auth");

const LOGIN_WINDOW_MINUTES = 10;
const LOGIN_MAX_FAILURES = 5;
const LOGIN_LOCK_MINUTES = 15;

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

const getClientAccessKey = (req) => {
  const forwardedFor = String(req.headers["x-forwarded-for"] || "");
  const ip = forwardedFor.split(",")[0].trim() || String(req.socket && req.socket.remoteAddress || "");
  const userAgent = String(req.headers["user-agent"] || "");

  return crypto
    .createHmac("sha256", getSessionSecret())
    .update(`${ip}|${userAgent}`)
    .digest("hex");
};

const isLoginLocked = async (accessKey) => {
  const result = await query(
    `select locked_until
     from admin_login_attempts
     where access_key = $1
       and locked_until is not null
       and locked_until > now()
     limit 1`,
    [accessKey]
  );

  return result.rowCount > 0;
};

const recordLoginFailure = async (accessKey) => {
  await query(
    `insert into admin_login_attempts
       (access_key, failed_count, window_started_at, locked_until)
     values ($1, 1, now(), null)
     on conflict (access_key) do update
     set failed_count = case
           when admin_login_attempts.window_started_at < now() - ($2::int * interval '1 minute') then 1
           else admin_login_attempts.failed_count + 1
         end,
         window_started_at = case
           when admin_login_attempts.window_started_at < now() - ($2::int * interval '1 minute') then now()
           else admin_login_attempts.window_started_at
         end,
         locked_until = case
           when (
             case
               when admin_login_attempts.window_started_at < now() - ($2::int * interval '1 minute') then 1
               else admin_login_attempts.failed_count + 1
             end
           ) >= $3 then now() + ($4::int * interval '1 minute')
           else admin_login_attempts.locked_until
         end`,
    [accessKey, LOGIN_WINDOW_MINUTES, LOGIN_MAX_FAILURES, LOGIN_LOCK_MINUTES]
  );
};

const clearLoginFailures = async (accessKey) => {
  await query(
    `delete from admin_login_attempts
     where access_key = $1`,
    [accessKey]
  );
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
    if (!requireAdminPostSecurity(req, res)) return;

    const accessKey = getClientAccessKey(req);

    if (await isLoginLocked(accessKey)) {
      console.warn("ADMIN_LOGIN_LOCKED");
      return sendJson(res, 429, {
        ok: false,
        code: "LOGIN_LOCKED",
        message: "잠시 후 다시 시도해 주세요."
      });
    }

    const password = String(parseBody(req).password || "");

    if (!password || !verifyPassword(password)) {
      await recordLoginFailure(accessKey);
      console.warn("ADMIN_LOGIN_FAILED");
      return sendJson(res, 401, {
        ok: false,
        code: "LOGIN_FAILED",
        message: "로그인에 실패했습니다."
      });
    }

    await clearLoginFailures(accessKey);
    setSessionCookie(res);
    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error("ADMIN_LOGIN_ERROR", { message: error.message });
    return sendJson(res, 500, {
      ok: false,
      code: "ADMIN_LOGIN_CONFIG_ERROR",
      message: "관리자 로그인 설정을 확인해 주세요."
    });
  }
};
