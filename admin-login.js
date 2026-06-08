(function () {
  const form = document.querySelector("#admin-login-form");
  const password = document.querySelector("#admin-password");
  const message = document.querySelector("#admin-message");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    try {
      const response = await fetch("/api/admin-login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ password: password.value })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "로그인에 실패했습니다.");
      }

      window.location.href = "/admin-payments.html";
    } catch (error) {
      message.textContent = error.message || "로그인에 실패했습니다.";
    }
  });
})();
