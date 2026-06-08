(function () {
  const form = document.querySelector("#payment-form");
  const formMessage = document.querySelector("#form-message");
  const listMessage = document.querySelector("#list-message");
  const requestsBody = document.querySelector("#requests-body");
  const createdLink = document.querySelector("#created-link");
  const createdUrl = document.querySelector("#created-url");
  const copyCreatedUrl = document.querySelector("#copy-created-url");
  const logoutButton = document.querySelector("#logout-button");

  const formatAmount = (amount) => `${Number(amount).toLocaleString("ko-KR")}원`;
  const formatDate = (value) => (value ? new Date(value).toLocaleString("ko-KR") : "-");
  const paymentUrl = (token) => `${window.location.origin}/payment.html?token=${encodeURIComponent(token)}`;

  const setMessage = (element, text, isError) => {
    element.textContent = text || "";
    element.classList.toggle("error", Boolean(isError));
  };

  const copyText = async (text) => {
    await navigator.clipboard.writeText(text);
  };

  const renderRequests = (requests) => {
    requestsBody.textContent = "";

    requests.forEach((request) => {
      const row = document.createElement("tr");
      const values = [
        request.company_name,
        request.item_name,
        formatAmount(request.amount),
        request.status,
        formatDate(request.created_at),
        formatDate(request.expires_at)
      ];

      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });

      const linkCell = document.createElement("td");
      const button = document.createElement("button");
      button.className = "btn secondary";
      button.type = "button";
      button.textContent = "복사";
      button.addEventListener("click", async () => {
        await copyText(paymentUrl(request.public_token));
        setMessage(listMessage, "링크를 복사했습니다.", false);
      });
      linkCell.appendChild(button);
      row.appendChild(linkCell);
      requestsBody.appendChild(row);
    });
  };

  const loadRequests = async () => {
    try {
      const response = await fetch("/api/admin-payment-requests", {
        headers: { Accept: "application/json" }
      });

      if (response.status === 401) {
        window.location.href = "/admin-login.html";
        return;
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "요청 목록을 불러오지 못했습니다.");
      }

      renderRequests(payload.requests);
    } catch (error) {
      setMessage(listMessage, error.message, true);
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(formMessage, "생성 중입니다.", false);

    const formData = new FormData(form);
    const payload = {
      companyName: formData.get("companyName"),
      itemName: formData.get("itemName"),
      amount: Number(formData.get("amount")),
      vatIncluded: formData.get("vatIncluded") === "on",
      memo: formData.get("memo"),
      expiresAt: formData.get("expiresAt") || null
    };

    try {
      const response = await fetch("/api/admin-payment-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.location.href = "/admin-login.html";
        return;
      }

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "결제 링크를 생성하지 못했습니다.");
      }

      createdUrl.value = result.paymentUrl;
      createdLink.hidden = false;
      setMessage(formMessage, "결제 링크가 생성되었습니다.", false);
      form.reset();
      form.elements.vatIncluded.checked = true;
      await loadRequests();
    } catch (error) {
      setMessage(formMessage, error.message, true);
    }
  });

  copyCreatedUrl.addEventListener("click", async () => {
    await copyText(createdUrl.value);
    setMessage(formMessage, "링크를 복사했습니다.", false);
  });

  logoutButton.addEventListener("click", async () => {
    await fetch("/api/admin-logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({})
    });
    window.location.href = "/admin-login.html";
  });

  loadRequests();
})();
