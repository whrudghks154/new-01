'use strict';

/* ══ 카카오톡 상담 링크 (변경 시 이 값만 수정) ══ */
const KAKAO_CHAT_URL = 'https://pf.kakao.com/_IDxinX/chat';

/* ══ Header scroll effect ══ */
const header = document.querySelector('[data-header]');
window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ══ Mobile menu ══ */
const menuBtn  = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
menuBtn?.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', open);
});
mobileNav?.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => mobileNav.classList.remove('open'))
);

/* ══ Reveal on scroll ══ */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 0.08 + 's';
  observer.observe(el);
});

/* ══ Portfolio Fan Deck ══
   포트폴리오 항목은 portfolio-data.js 파일에서 관리합니다.
   새 항목 추가:  node tools/add-portfolio.js
*/
// PORTFOLIO_DATA는 portfolio-data.js 에서 정의됩니다.
const portfolioItems = (typeof PORTFOLIO_DATA !== 'undefined' ? PORTFOLIO_DATA : []).map(
  (item, i) => ({ ...item, no: String(i + 1).padStart(2, '0') })
);

function initPortfolio() {
  const wrap = document.querySelector('[data-portfolio]');
  if (!wrap) return;

  const deck      = wrap.querySelector('[data-portfolio-stack]');
  const labelEl   = wrap.querySelector('[data-portfolio-label]');
  const titleEl   = wrap.querySelector('[data-portfolio-title]');
  const descEl    = wrap.querySelector('[data-portfolio-description]');
  const tagsEl    = wrap.querySelector('[data-portfolio-tags]');
  const currentEl = wrap.querySelector('[data-portfolio-current]');
  const totalEl   = wrap.querySelector('[data-portfolio-total]');
  const prevBtn   = wrap.querySelector('[data-portfolio-prev]');
  const nextBtn   = wrap.querySelector('[data-portfolio-next]');

  if (!deck) return;

  const total = portfolioItems.length;
  let activeIndex = 0;

  if (totalEl) totalEl.textContent = String(total).padStart(2, '0');

  const POS = ['is-active', 'is-prev', 'is-next', 'is-far-prev', 'is-far-next', 'is-hidden'];

  function getPositionClass(index) {
    const forward  = (index - activeIndex + total) % total;
    const backward = (activeIndex - index + total) % total;
    if (index === activeIndex) return 'is-active';
    if (backward === 1)        return 'is-prev';
    if (forward  === 1)        return 'is-next';
    if (backward === 2)        return 'is-far-prev';
    if (forward  === 2)        return 'is-far-next';
    return 'is-hidden';
  }

  /* 레코드 회전형 카드 생성 */
  portfolioItems.forEach((item, i) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'wheel-card';
    card.dataset.wheelIndex = String(i);
    card.setAttribute('aria-label', item.title);

    /* 플레이스홀더 */
    const ph = document.createElement('div');
    ph.className = 'wheel-card-ph';
    ph.innerHTML = `<span class="wc-ph-no">${item.no}</span><span class="wc-ph-lbl">${item.label}</span>`;
    card.appendChild(ph);

    /* 이미지 */
    const img = document.createElement('img');
    img.className = 'wheel-card-img';
    img.alt = item.title;
    img.loading = 'lazy';
    img.onload = () => img.classList.add('loaded');
    img.src = item.image;
    card.appendChild(img);

    card.addEventListener('click', () => setActive(i));
    deck.appendChild(card);
  });

  function updateDeck() {
    deck.querySelectorAll('.wheel-card').forEach(card => {
      const i = Number(card.dataset.wheelIndex);
      card.classList.remove(...POS);
      card.classList.add(getPositionClass(i));
      card.setAttribute('aria-selected', String(i === activeIndex));
    });
  }

  function updateInfo() {
    const item = portfolioItems[activeIndex];
    if (labelEl)   labelEl.textContent   = item.label;
    if (titleEl)   titleEl.textContent   = item.title;
    if (descEl)    descEl.textContent    = item.description;
    if (tagsEl)    tagsEl.innerHTML      = item.tags.map(t => `<span>${t}</span>`).join('');
    if (currentEl) currentEl.textContent = item.no;
  }

  function setActive(index) {
    activeIndex = (index + total) % total;
    updateDeck();
    updateInfo();
  }

  prevBtn?.addEventListener('click', () => setActive(activeIndex - 1));
  nextBtn?.addEventListener('click', () => setActive(activeIndex + 1));
  setActive(0);
}
initPortfolio();

/* ══ 카카오톡 플로팅 상담 버튼 ══ */
(function () {
  const btn = document.createElement('a');
  btn.href = KAKAO_CHAT_URL;
  btn.target = '_blank';
  btn.rel = 'noopener noreferrer';
  btn.className = 'kakao-float';
  btn.setAttribute('aria-label', '카카오톡 상담하기');
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.528 1.548 4.756 3.9 6.1L4.9 20l4.1-2.1A11.5 11.5 0 0012 18c5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
    </svg>
    <span>카카오톡 상담</span>
  `;
  document.body.appendChild(btn);
})();

/* ══ Contact form ══ */
const form = document.querySelector('[data-contact-form]');
const msg  = document.querySelector('[data-form-message]');

form?.addEventListener('submit', async e => {
  e.preventDefault();
  if (form.querySelector('[name="website"]')?.value) return;

  const submitBtn = form.querySelector('[type="submit"]');
  if (submitBtn) submitBtn.disabled = true;
  if (msg) { msg.textContent = ''; msg.className = 'form-msg'; }

  const data = Object.fromEntries(new FormData(form).entries());
  delete data.website;

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.ok) throw new Error(result.message || '전송에 실패했습니다.');
    form.reset();
    if (msg) { msg.textContent = result.message || '상담 요청이 전송되었습니다. 확인 후 연락드리겠습니다.'; msg.className = 'form-msg success'; }
  } catch (err) {
    if (msg) { msg.textContent = err.message || '전송에 실패했습니다. 잠시 후 다시 시도해주세요.'; msg.className = 'form-msg error'; }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
