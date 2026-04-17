const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileNav = document.querySelector("[data-mobile-nav]");
const form = document.querySelector("[data-contact-form]");
const formMessage = document.querySelector("[data-form-message]");

const updateHeader = () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 24);
};

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

if (menuToggle && mobileNav) {
  const setMenu = (isOpen) => {
    menuToggle.classList.toggle("is-open", isOpen);
    mobileNav.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  };

  menuToggle.addEventListener("click", () => {
    setMenu(!menuToggle.classList.contains("is-open"));
  });

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenu(false));
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

const validators = {
  name: (value) => value.trim().length >= 2,
  phone: (value) => /^[0-9\-+\s()]{8,}$/.test(value.trim()),
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()),
  service: (value) => value.trim().length > 0,
  message: (value) => value.trim().length >= 10
};

if (form && formMessage) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const invalidField = Object.keys(validators).find((key) => !validators[key](data.get(key) || ""));

    if (invalidField) {
      const field = form.elements[invalidField];
      if (field) field.focus();
      formMessage.textContent = "입력 내용을 확인해주세요. 문의 내용은 10자 이상 작성해야 합니다.";
      formMessage.className = "form-message error";
      return;
    }

    const inquiry = {
      name: data.get("name").trim(),
      phone: data.get("phone").trim(),
      email: data.get("email").trim(),
      service: data.get("service").trim(),
      message: data.get("message").trim(),
      website: data.get("website") || ""
    };

    const submitButton = form.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;
    formMessage.textContent = "상담 요청을 전송하고 있습니다.";
    formMessage.className = "form-message";

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inquiry)
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "메일 전송에 실패했습니다.");
      }

      form.reset();
      formMessage.textContent = result.message || "상담 요청이 전송되었습니다. 확인 후 연락드리겠습니다.";
      formMessage.className = "form-message success";
    } catch (error) {
      formMessage.textContent = error.message || "메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.";
      formMessage.className = "form-message error";
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}
