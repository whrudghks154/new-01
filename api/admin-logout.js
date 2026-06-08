const { clearSessionCookie, requireAdminPostSecurity } = require("./lib/admin-auth");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      code: "METHOD_NOT_ALLOWED",
      message: "POST 요청만 가능합니다."
    });
  }

  if (!requireAdminPostSecurity(req, res)) return;

  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
};
