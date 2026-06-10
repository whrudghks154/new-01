/* ═══════════════════════════════════════════
   REDBEAN DESIGN — detail.js
   상품 상세페이지 로직
═══════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── 유틸 ─── */
  const fmt = n => n.toLocaleString('ko-KR') + '원';

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return [...(ctx || document).querySelectorAll(sel)]; }

  /* ─── URL 파라미터에서 상품 ID 추출 ─── */
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId || typeof RB_PRODUCTS === 'undefined') {
    console.error('[detail.js] 상품 데이터를 찾을 수 없습니다.');
    document.title = '상품 없음 | 레드빈디자인';
    const main = qs('main');
    if (main) {
      main.innerHTML = `
        <div class="container" style="padding-top:160px;padding-bottom:80px;text-align:center;">
          <p style="color:rgba(255,255,255,0.4);font-size:15px;">요청하신 상품을 찾을 수 없습니다.</p>
          <a href="../../products.html" style="display:inline-block;margin-top:24px;color:var(--red);font-weight:700;">← 상품 목록으로</a>
        </div>
      `;
    }
    return;
  }

  const product = RB_PRODUCTS.products.find(p => p.id === productId);

  if (!product) {
    console.error('[detail.js] id=' + productId + ' 에 해당하는 상품이 없습니다.');
    document.title = '상품 없음 | 레드빈디자인';
    const main = qs('main');
    if (main) {
      main.innerHTML = `
        <div class="container" style="padding-top:160px;padding-bottom:80px;text-align:center;">
          <p style="color:rgba(255,255,255,0.4);font-size:15px;">요청하신 상품을 찾을 수 없습니다.</p>
          <a href="../../products.html" style="display:inline-block;margin-top:24px;color:var(--red);font-weight:700;">← 상품 목록으로</a>
        </div>
      `;
    }
    return;
  }

  const category = RB_PRODUCTS.categories.find(c => c.id === product.categoryId);
  const catName = category ? category.name : '';

  /* ─── 페이지 메타 업데이트 ─── */
  document.title = product.name + ' | 레드빈디자인';
  qs('meta[name="description"]').setAttribute('content',
    product.shortDesc + ' — 레드빈디자인의 디자인 서비스입니다.'
  );

  /* ─── 기본 정보 렌더 ─── */
  qs('#detailBadge').textContent = catName;
  qs('#detailName').textContent = product.name;
  qs('#detailDesc').textContent = product.shortDesc;

  // 카테고리별 아이콘 이모지 매핑
  const iconMap = {
    homepage: '🌐', sns: '📱', video: '🎬', branding: '✨',
    catalog: '📚', ppt: '📊', outdoor: '🏙', card: '💳',
    sticker: '🏷', invite: '✉️', envelope: '📩', election: '🗳',
  };
  qs('#imageIcon').textContent = iconMap[product.categoryId] || '🖼';
  qs('#imageCategoryLabel').textContent = product.name;

  // 상품 대표 이미지 표시 (있을 때만)
  if (product.image) {
    const imageArea = qs('#detailImageArea');
    const img = document.createElement('img');
    img.src = '../../' + product.image;
    img.alt = product.name;
    img.className = 'detail-product-img';
    img.loading = 'eager';
    img.onload = function () {
      imageArea.classList.add('has-img');
    };
    img.onerror = function () {
      img.remove();
    };
    imageArea.insertBefore(img, imageArea.firstChild);
  }

  // 뒤로가기 링크에 카테고리 파라미터 추가
  qs('#backLink').href = '../../products.html?cat=' + product.categoryId;

  /* ─── 가격 계산 ─── */
  let currentPrice = 0;

  function updateTotal(price) {
    currentPrice = price;
    const totalEl = qs('#totalPrice');
    if (totalEl) totalEl.textContent = fmt(price);
    // 주문 요약 금액도 동기화
    const summaryAmount = qs('#orderSummaryAmount');
    if (summaryAmount) summaryAmount.textContent = fmt(price);
  }

  /* ─── 옵션 영역 렌더 ─── */
  const priceArea = qs('#priceArea');

  function renderPriceArea() {
    switch (product.optionType) {

      /* ── fixed: 기본형/고급형 라디오 ── */
      case 'fixed': {
        let html = `<p class="option-label">옵션 선택</p>
          <div class="option-radio-group" id="fixedGroup">`;
        product.tiers.forEach((tier, i) => {
          html += `
            <label class="option-radio-btn">
              <input type="radio" name="fixedOption" value="${i}" ${i === 0 ? 'checked' : ''}>
              ${tier.label}
              <span class="option-price-hint">${fmt(tier.price)}</span>
            </label>`;
        });
        html += `</div>`;
        html += totalBlock(product.tiers[0].price);
        priceArea.innerHTML = html;

        // 이벤트
        qsa('input[name="fixedOption"]', priceArea).forEach(radio => {
          radio.addEventListener('change', e => {
            const idx = parseInt(e.target.value);
            updateTotal(product.tiers[idx].price);
          });
        });
        updateTotal(product.tiers[0].price);
        break;
      }

      /* ── pages: 드롭다운 (4P 단위) ── */
      case 'pages': {
        // basePrice가 없으면 새 방식(pages × pricePerPage), 있으면 구 방식(basePrice + pricePerPage × steps)
        const calcPrice = pages =>
          product.basePrice != null
            ? product.basePrice + product.pricePerPage * (pages / product.pageStep)
            : product.pricePerPage * pages;

        let options = '';
        for (let p = product.minPages; p <= product.maxPages; p += product.pageStep) {
          const price = calcPrice(p);
          options += `<option value="${p}">${p}P — ${fmt(price)} (VAT 포함)</option>`;
        }
        const initPrice = calcPrice(product.minPages);

        // 페이지당 단가 안내 (basePrice 없는 신규 방식만)
        const perPageNote = product.basePrice == null
          ? `<p class="option-vat-note">1P 기준 ${fmt(product.pricePerPage)} VAT 포함 · 공급가 ${fmt(Math.round(product.pricePerPage / 1.1))} VAT 별도</p>`
          : '';

        priceArea.innerHTML = `
          <p class="option-label">페이지 수 선택</p>
          ${perPageNote}
          <select class="option-select" id="pagesSelect">${options}</select>
          ${totalBlock(initPrice)}
        `;

        qs('#pagesSelect', priceArea).addEventListener('change', e => {
          updateTotal(calcPrice(parseInt(e.target.value)));
        });
        updateTotal(initPrice);
        break;
      }

      /* ── sides: 단면/양면 라디오 ── */
      case 'sides': {
        priceArea.innerHTML = `
          <p class="option-label">인쇄 방식 선택</p>
          <div class="option-radio-group" id="sidesGroup">
            <label class="option-radio-btn">
              <input type="radio" name="sidesOption" value="single" checked>
              단면
              <span class="option-price-hint">${fmt(product.singlePrice)}</span>
            </label>
            <label class="option-radio-btn">
              <input type="radio" name="sidesOption" value="double">
              양면
              <span class="option-price-hint">${fmt(product.doublePrice)}</span>
            </label>
          </div>
          ${totalBlock(product.singlePrice)}
        `;

        qsa('input[name="sidesOption"]', priceArea).forEach(radio => {
          radio.addEventListener('change', e => {
            const price = e.target.value === 'single' ? product.singlePrice : product.doublePrice;
            updateTotal(price);
          });
        });
        updateTotal(product.singlePrice);
        break;
      }

      /* ── minutes: number input + range ── */
      case 'minutes': {
        const initMin = product.minMinutes;
        const initPrice = product.pricePerMinute * initMin;
        priceArea.innerHTML = `
          <p class="option-label">작업 분량 (분)</p>
          <div class="option-minutes-wrap">
            <input
              class="option-minutes-input"
              type="number"
              id="minutesInput"
              min="${product.minMinutes}"
              max="${product.maxMinutes}"
              value="${initMin}"
            >
            <span class="option-minutes-unit">분 × ${fmt(product.pricePerMinute)}/분 (VAT 포함)</span>
          </div>
          <input
            class="option-range"
            type="range"
            id="minutesRange"
            min="${product.minMinutes}"
            max="${product.maxMinutes}"
            value="${initMin}"
          >
          ${totalBlock(initPrice)}
        `;

        const numInput = qs('#minutesInput', priceArea);
        const rangeInput = qs('#minutesRange', priceArea);

        function onMinutesChange(val) {
          val = Math.min(Math.max(parseInt(val) || product.minMinutes, product.minMinutes), product.maxMinutes);
          numInput.value = val;
          rangeInput.value = val;
          updateTotal(product.pricePerMinute * val);
        }

        numInput.addEventListener('input', e => onMinutesChange(e.target.value));
        rangeInput.addEventListener('input', e => onMinutesChange(e.target.value));
        updateTotal(initPrice);
        break;
      }

      default:
        priceArea.innerHTML = `<p style="color:rgba(255,255,255,0.45);font-size:14px;">가격은 상담 후 안내드립니다.</p>`;
        break;
    }
  }

  function totalBlock(price) {
    return `
      <div class="detail-total">
        <span>총 결제금액</span>
        <div class="detail-total-right">
          <strong id="totalPrice">${fmt(price)}</strong>
          <small class="vat-label">VAT 포함</small>
        </div>
      </div>
    `;
  }

  renderPriceArea();

  /* ─── 주문서 모달 ─── */

  function getCurrentOptionLabel() {
    switch (product.optionType) {
      case 'fixed': {
        const checked = qs('input[name="fixedOption"]:checked', priceArea);
        return checked ? product.tiers[parseInt(checked.value)].label : '—';
      }
      case 'pages': {
        const sel = qs('#pagesSelect', priceArea);
        return sel ? sel.value + 'P' : '—';
      }
      case 'sides': {
        const checked = qs('input[name="sidesOption"]:checked', priceArea);
        return checked ? (checked.value === 'single' ? '단면' : '양면') : '—';
      }
      case 'minutes': {
        const inp = qs('#minutesInput', priceArea);
        return inp ? inp.value + '분' : '—';
      }
      default: return '—';
    }
  }

  const orderOverlay   = qs('#orderOverlay');
  const orderModalClose = qs('#orderModalClose');
  const orderForm      = qs('#orderForm');
  const orderFormError = qs('#orderFormError');
  const orderSubmitBtn = qs('#orderSubmitBtn');
  const bizNumberField = qs('#bizNumberField');

  function openOrderModal() {
    if (!orderOverlay) return;
    // 주문 요약 채우기
    const nameEl   = qs('#orderSummaryName');
    const optEl    = qs('#orderSummaryOption');
    const amtEl    = qs('#orderSummaryAmount');
    if (nameEl) nameEl.textContent   = product.name;
    if (optEl)  optEl.textContent    = getCurrentOptionLabel();
    if (amtEl)  amtEl.textContent    = fmt(currentPrice);

    orderOverlay.removeAttribute('aria-hidden');
    orderOverlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    // 첫 입력 필드로 포커스
    const firstInput = orderOverlay.querySelector('input:not([type="hidden"]):not([tabindex="-1"])');
    if (firstInput) firstInput.focus();
  }

  function closeOrderModal() {
    if (!orderOverlay) return;
    orderOverlay.setAttribute('aria-hidden', 'true');
    orderOverlay.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // 구매하기 버튼
  const btnBuy = qs('#btnBuy');
  if (btnBuy) {
    btnBuy.addEventListener('click', () => {
      if (currentPrice <= 0) {
        alert('옵션을 선택해주세요.');
        return;
      }
      openOrderModal();
    });
  }

  // 닫기 버튼 / 오버레이 외부 클릭
  if (orderModalClose) orderModalClose.addEventListener('click', closeOrderModal);
  if (orderOverlay) {
    orderOverlay.addEventListener('click', (e) => {
      if (e.target === orderOverlay) closeOrderModal();
    });
  }

  // ESC 키
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && orderOverlay && !orderOverlay.hasAttribute('aria-hidden')) {
      closeOrderModal();
    }
  });

  // 세금계산서 체크 → 사업자번호 필드 토글
  const needTaxCheck = qs('#needTaxCheck');
  if (needTaxCheck && bizNumberField) {
    needTaxCheck.addEventListener('change', (e) => {
      bizNumberField.style.display = e.target.checked ? '' : 'none';
    });
  }

  // 폼 제출
  if (orderForm) {
    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (orderFormError) orderFormError.textContent = '';

      const fd = new FormData(orderForm);
      const data = Object.fromEntries(fd.entries());

      // 개인정보 동의
      if (!data.privacyAgree) {
        orderFormError.textContent = '개인정보 수집 및 이용에 동의해주세요.';
        qs('#privacyAgree').focus();
        return;
      }

      // 필수 항목 순서대로 검사
      const required = [
        ['customerName', '고객명/담당자명'],
        ['phone',        '연락처'],
        ['email',        '이메일'],
        ['companyName',  '회사명/상호명'],
        ['message',      '요청사항'],
      ];
      for (const [field, label] of required) {
        if (!data[field] || !String(data[field]).trim()) {
          orderFormError.textContent = `${label}을(를) 입력해주세요.`;
          qs(`[name="${field}"]`, orderForm).focus();
          return;
        }
      }

      orderSubmitBtn.disabled = true;
      orderSubmitBtn.textContent = '처리 중...';

      try {
        const payload = {
          customerName: data.customerName,
          phone:        data.phone,
          email:        data.email,
          companyName:  data.companyName,
          message:      data.message,
          refUrl:       data.refUrl       || '',
          deadline:     data.deadline     || '',
          needTax:      !!data.needTax,
          bizNumber:    data.bizNumber    || '',
          website:      data.website      || '', // honeypot
          productName:  product.name,
          optionLabel:  getCurrentOptionLabel(),
          amount:       currentPrice,
        };

        const resp = await fetch('/api/order-pay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await resp.json().catch(() => ({}));

        if (!resp.ok || !result.ok) {
          throw new Error(result.message || '주문 처리 중 오류가 발생했습니다.');
        }

        // 결제 페이지로 이동
        window.location.href = result.paymentUrl;

      } catch (err) {
        if (orderFormError) orderFormError.textContent = err.message || '오류가 발생했습니다. 다시 시도해주세요.';
        orderSubmitBtn.disabled = false;
        orderSubmitBtn.textContent = '결제하기';
      }
    });
  }

  /* ─── 탭 전환 ─── */
  qsa('.detail-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;

      qsa('.detail-tab-btn').forEach(b => b.classList.remove('active'));
      qsa('.detail-tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = qs('[data-panel="' + target + '"]');
      if (panel) panel.classList.add('active');
    });
  });

})();
