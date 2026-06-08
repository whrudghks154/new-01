(function () {
  const payButton = document.querySelector("#pay-button");
  const message = document.querySelector("#payment-message");
  const companyNameEl = document.querySelector("#company-name");
  const goodsNameEl = document.querySelector("#goods-name");
  const amountEl = document.querySelector("#amount");
  const vatIncludedEl = document.querySelector("#vat-included");
  const note = document.querySelector("#payment-note");
  const closedNotice = document.querySelector("#payment-closed-notice");
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";
  let payable = false;

  const setMessage = (text, isError) => {
    message.textContent = text;
    message.classList.toggle("error", Boolean(isError));
  };

  const stopPaymentRequest = (text) => {
    payable = false;
    payButton.disabled = true;
    payButton.setAttribute("aria-disabled", "true");
    payButton.textContent = "결제 불가";
    if (closedNotice) {
      closedNotice.hidden = false;
      closedNotice.textContent = text;
    }
    setMessage(text, true);
  };

  const formatAmount = (amount) => `${Number(amount).toLocaleString("ko-KR")}원`;

  const statusMessage = {
    paid: "이미 결제가 완료된 요청입니다.",
    closed: "종료된 결제 요청입니다.",
    expired: "결제 요청 유효기간이 만료되었습니다.",
    cancelled: "취소된 결제 요청입니다.",
    processing: "결제 처리가 진행 중입니다. 추가 결제를 진행하지 마시고 잠시 기다려 주세요.",
    recovery_required: "결제 처리 결과를 확인하고 있습니다. 추가 결제를 진행하지 마시고 레드빈디자인으로 문의해 주세요."
  };

  const renderRequest = (request) => {
    companyNameEl.textContent = request.companyName;
    goodsNameEl.textContent = request.itemName;
    amountEl.textContent = formatAmount(request.amount);
    vatIncludedEl.textContent = request.vatIncluded ? "포함" : "별도";
    note.textContent = "아래 결제 정보를 확인한 뒤 결제를 진행해 주세요.";

    if (request.status === "pending") {
      payable = true;
      payButton.disabled = false;
      setMessage("", false);
      return;
    }

    stopPaymentRequest(statusMessage[request.status] || "결제를 진행할 수 없는 요청입니다.");
  };

  const loadRequest = async () => {
    if (!token) {
      stopPaymentRequest("결제 링크 토큰이 없습니다.");
      return;
    }

    try {
      const response = await fetch(`/api/payment-request?token=${encodeURIComponent(token)}`, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message || "결제 정보를 불러오지 못했습니다.");
      }

      renderRequest(payload.request);
    } catch (error) {
      stopPaymentRequest(error.message || "결제 정보를 불러오지 못했습니다.");
    }
  };

  const loadConfig = async () => {
    const response = await fetch(`/api/nicepay-config?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {
        Accept: "application/json"
      }
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.message || "결제 설정을 불러오지 못했습니다.");
    }

    return payload.config;
  };

  const requestPayment = async () => {
    if (!payable) {
      setMessage("현재 결제를 진행할 수 없습니다.", true);
      return;
    }

    payButton.disabled = true;
    setMessage("결제창을 준비하고 있습니다.", false);

    try {
      const config = await loadConfig();

      goodsNameEl.textContent = config.displayGoodsName || config.goodsName;
      amountEl.textContent = formatAmount(config.amount);

      if (!window.AUTHNICE || typeof window.AUTHNICE.requestPay !== "function") {
        throw new Error("NICEPAY 결제창 스크립트를 불러오지 못했습니다.");
      }

      window.AUTHNICE.requestPay({
        clientId: config.clientId,
        method: "card",
        orderId: config.orderId,
        amount: config.amount,
        goodsName: config.goodsName,
        mallReserved: config.mallReserved,
        returnUrl: config.returnUrl,
        fnError: function (result) {
          setMessage(result.errorMsg || "결제창 호출 중 오류가 발생했습니다.", true);
          payButton.disabled = false;
        }
      });
    } catch (error) {
      setMessage(error.message || "결제를 시작할 수 없습니다.", true);
      if (payable) {
        await loadRequest();
      }
    }
  };

  payButton.disabled = true;
  payButton.addEventListener("click", requestPayment);
  loadRequest();
})();
