/* ═══════════════════════════════════════════
   REDBEAN DESIGN — 상품 데이터
   이 파일 하나만 수정하면 모든 가격/상품 정보가 반영됩니다.
   모든 가격은 VAT(부가세 10%) 포함 금액입니다.

   [이미지 교체 방법]
   각 상품의 image 필드 경로에 맞게 파일을 저장하면 자동 적용됩니다.
   이미지가 없거나 로딩 실패 시 placeholder 배경이 표시됩니다.
   저장 위치: products/
═══════════════════════════════════════════ */

const RB_PRODUCTS = {

  categories: [
    { id: 'homepage',  name: '홈페이지',       icon: 'WEB' },
    { id: 'sns',       name: 'SNS',             icon: 'SNS' },
    { id: 'video',     name: '영상 편집',       icon: 'VID' },
    { id: 'branding',  name: '브랜딩',          icon: 'BRD' },
    { id: 'catalog',   name: '책자/카탈로그',   icon: 'CAT' },
    { id: 'ppt',       name: 'PPT',             icon: 'PPT' },
    { id: 'outdoor',   name: '옥외 홍보물',     icon: 'OUT' },
    { id: 'card',      name: '명함',            icon: 'CRD' },
    { id: 'sticker',   name: '스티커',          icon: 'STK' },
    { id: 'invite',    name: '초대장',          icon: 'INV' },
    { id: 'envelope',  name: '봉투',            icon: 'ENV' },
    { id: 'election',  name: '선거홍보물',      icon: 'ELC' },
  ],

  products: [

    /* ─── 홈페이지 ─── */
    {
      id: 'detail-page',
      categoryId: 'homepage',
      image: 'products/detail-page.jpg',
      name: '상세페이지',
      shortDesc: '쇼핑몰·스마트스토어용 판매 상세페이지 제작',
      optionType: 'fixed',
      // 공급가 300,000원 × 1.1 = 330,000원 / 공급가 600,000원 × 1.1 = 660,000원
      tiers: [
        { label: '기본형', price: 330000 },
        { label: '고급형', price: 660000 },
      ],
    },
    {
      id: 'website',
      categoryId: 'homepage',
      image: 'products/website.jpg',
      name: '홈페이지',
      shortDesc: '기업·브랜드 홈페이지 제작',
      optionType: 'fixed',
      // 공급가 800,000원 × 1.1 = 880,000원 / 공급가 1,500,000원 × 1.1 = 1,650,000원
      tiers: [
        { label: '기본형', price: 880000 },
        { label: '고급형', price: 1650000 },
      ],
    },

    /* ─── SNS ─── */
    {
      id: 'web-banner',
      categoryId: 'sns',
      image: 'products/web-banner.jpg',
      name: '웹 배너',
      shortDesc: '온라인 광고·이벤트용 웹 배너 제작',
      optionType: 'fixed',
      // 공급가 50,000원 × 1.1 = 55,000원 / 공급가 100,000원 × 1.1 = 110,000원
      tiers: [
        { label: '기본형', price: 55000 },
        { label: '고급형', price: 110000 },
      ],
    },
    {
      id: 'insta-thumb',
      categoryId: 'sns',
      image: 'products/instagram-thumbnail.jpg',
      name: '인스타그램 썸네일',
      shortDesc: '인스타그램 피드·릴스 썸네일 디자인',
      optionType: 'fixed',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 60,000원 × 1.1 = 66,000원
      tiers: [
        { label: '기본형', price: 44000 },
        { label: '고급형', price: 66000 },
      ],
    },
    {
      id: 'naver-blog-thumb',
      categoryId: 'sns',
      image: 'products/blog-thumbnail.jpg',
      name: '네이버 블로그 썸네일',
      shortDesc: '네이버 블로그 포스팅 썸네일 디자인',
      optionType: 'fixed',
      // 공급가 30,000원 × 1.1 = 33,000원 / 공급가 50,000원 × 1.1 = 55,000원
      tiers: [
        { label: '기본형', price: 33000 },
        { label: '고급형', price: 55000 },
      ],
    },
    {
      id: 'youtube-thumb',
      categoryId: 'sns',
      image: 'products/youtube-thumbnail.jpg',
      name: '유튜브 썸네일',
      shortDesc: '클릭률 높은 유튜브 썸네일 디자인',
      optionType: 'fixed',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 50,000원 × 1.1 = 55,000원
      tiers: [
        { label: '기본형', price: 44000 },
        { label: '고급형', price: 55000 },
      ],
    },
    {
      id: 'naver-cafe',
      categoryId: 'sns',
      image: 'products/naver-cafe.jpg',
      name: '네이버 카페 디자인',
      shortDesc: '네이버 카페 스킨·배너·메뉴 디자인',
      optionType: 'fixed',
      // 공급가 150,000원 × 1.1 = 165,000원 / 공급가 300,000원 × 1.1 = 330,000원
      tiers: [
        { label: '기본형', price: 165000 },
        { label: '고급형', price: 330000 },
      ],
    },

    /* ─── 영상 편집 ─── */
    {
      id: 'caption-work',
      categoryId: 'video',
      image: 'products/caption-work.jpg',
      name: '자막작업',
      shortDesc: '영상 자막 디자인 및 삽입',
      optionType: 'minutes',
      // 공급가 20,000원/분 × 1.1 = 22,000원/분 VAT 포함
      pricePerMinute: 22000,
      minMinutes: 1,
      maxMinutes: 120,
    },
    {
      id: 'graphic-work',
      categoryId: 'video',
      image: 'products/graphic-work.jpg',
      name: '모션그래픽',
      shortDesc: '영상 내 모션 그래픽·CG 요소 제작',
      optionType: 'minutes',
      // 공급가 300,000원/분 × 1.1 = 330,000원/분 VAT 포함
      pricePerMinute: 330000,
      minMinutes: 1,
      maxMinutes: 120,
    },
    {
      id: 'video-edit',
      categoryId: 'video',
      image: 'products/video-edit.jpg',
      name: '영상편집',
      shortDesc: '촬영본 편집·색보정·사운드 믹싱',
      optionType: 'minutes',
      // 공급가 150,000원/분 × 1.1 = 165,000원/분 VAT 포함
      pricePerMinute: 165000,
      minMinutes: 1,
      maxMinutes: 120,
    },

    /* ─── 브랜딩 ─── */
    {
      id: 'package',
      categoryId: 'branding',
      image: 'products/package.jpg',
      name: '패키지',
      shortDesc: '제품 패키지·박스 디자인',
      optionType: 'fixed',
      // 공급가 300,000원 × 1.1 = 330,000원 / 공급가 700,000원 × 1.1 = 770,000원
      tiers: [
        { label: '기본형', price: 330000 },
        { label: '고급형', price: 770000 },
      ],
    },
    {
      id: 'product-detail',
      categoryId: 'branding',
      image: 'products/product-detail.jpg',
      name: '상품 상세페이지',
      shortDesc: '브랜딩 기반 프리미엄 상품 상세페이지',
      optionType: 'fixed',
      // 공급가 400,000원 × 1.1 = 440,000원 / 공급가 800,000원 × 1.1 = 880,000원
      tiers: [
        { label: '기본형', price: 440000 },
        { label: '고급형', price: 880000 },
      ],
    },
    {
      id: 'logo',
      categoryId: 'branding',
      image: 'products/logo.jpg',
      name: '로고',
      shortDesc: '브랜드 아이덴티티 로고 디자인',
      optionType: 'fixed',
      // 공급가 200,000원 × 1.1 = 220,000원 / 공급가 500,000원 × 1.1 = 550,000원
      tiers: [
        { label: '기본형', price: 220000 },
        { label: '고급형', price: 550000 },
      ],
    },

    /* ─── 책자/카탈로그 ─── */
    // 계산: 선택 페이지 수 × 44,000원 (공급가 40,000원/P × 1.1 = 44,000원/P VAT 포함)
    {
      id: 'catalog-book',
      categoryId: 'catalog',
      image: 'products/catalog.jpg',
      name: '카탈로그',
      shortDesc: '제품·서비스 카탈로그 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'brochure',
      categoryId: 'catalog',
      image: 'products/brochure.jpg',
      name: '브로슈어',
      shortDesc: '브랜드·서비스 브로슈어 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'report',
      categoryId: 'catalog',
      image: 'products/report.jpg',
      name: '보고서',
      shortDesc: '사업·연구·성과 보고서 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'company-intro-book',
      categoryId: 'catalog',
      image: 'products/company-profile.jpg',
      name: '회사소개서',
      shortDesc: '기업 회사소개서 편집 디자인 (책자형)',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'newsletter',
      categoryId: 'catalog',
      image: 'products/newsletter.jpg',
      name: '소식지',
      shortDesc: '기업·단체 소식지 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'periodical',
      categoryId: 'catalog',
      image: 'products/periodical.jpg',
      name: '정기간행물',
      shortDesc: '정기 발행 간행물 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'magazine',
      categoryId: 'catalog',
      image: 'products/magazine.jpg',
      name: '잡지',
      shortDesc: '잡지·매거진 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },
    {
      id: 'esg-report',
      categoryId: 'catalog',
      image: 'products/esg-report.png',
      name: 'ESG보고서',
      shortDesc: 'ESG·지속가능경영 보고서 편집 디자인',
      optionType: 'pages',
      pricePerPage: 44000,  // 1P당 VAT 포함가 (공급가 40,000원)
      minPages: 4,
      maxPages: 400,
      pageStep: 4,
    },

    /* ─── PPT ─── */
    // 계산: 선택 페이지 수 × 55,000원 (공급가 50,000원/P × 1.1 = 55,000원/P VAT 포함)
    {
      id: 'proposal-ppt',
      categoryId: 'ppt',
      image: 'products/ppt-proposal.jpg',
      name: '제안서',
      shortDesc: '투자·입찰·비즈니스 제안서 PPT 디자인',
      optionType: 'pages',
      pricePerPage: 55000,  // 1P당 VAT 포함가 (공급가 50,000원)
      minPages: 4,
      maxPages: 200,
      pageStep: 4,
    },
    {
      id: 'company-intro-ppt',
      categoryId: 'ppt',
      image: 'products/ppt-company.jpg',
      name: '회사소개서',
      shortDesc: '기업 회사소개서 PPT 디자인',
      optionType: 'pages',
      pricePerPage: 55000,  // 1P당 VAT 포함가 (공급가 50,000원)
      minPages: 4,
      maxPages: 200,
      pageStep: 4,
    },

    /* ─── 옥외 홍보물 ─── */
    {
      id: 'leaflet',
      categoryId: 'outdoor',
      image: 'products/leaflet.jpg',
      name: '3단 리플렛',
      shortDesc: '3단 접지형 홍보 리플렛 디자인',
      optionType: 'sides',
      // 공급가 100,000원 × 1.1 = 110,000원 / 공급가 200,000원 × 1.1 = 220,000원
      singlePrice: 110000,
      doublePrice: 220000,
    },
    {
      id: 'banner',
      categoryId: 'outdoor',
      image: 'products/banner.jpg',
      name: '현수막',
      shortDesc: '행사·홍보용 현수막 디자인',
      optionType: 'fixed',
      // 공급가 60,000원 × 1.1 = 66,000원 / 공급가 100,000원 × 1.1 = 110,000원
      tiers: [
        { label: '기본형', price: 66000 },
        { label: '고급형', price: 110000 },
      ],
    },
    {
      id: 'poster',
      categoryId: 'outdoor',
      image: 'products/poster.jpg',
      name: '포스터',
      shortDesc: '행사·상품 홍보 포스터 디자인',
      optionType: 'fixed',
      // 공급가 100,000원 × 1.1 = 110,000원 / 공급가 120,000원 × 1.1 = 132,000원
      tiers: [
        { label: '기본형', price: 110000 },
        { label: '고급형', price: 132000 },
      ],
    },
    {
      id: 'signboard',
      categoryId: 'outdoor',
      image: 'products/signboard.jpg',
      name: '간판',
      shortDesc: '매장·업체 간판 디자인',
      optionType: 'fixed',
      // 공급가 150,000원 × 1.1 = 165,000원 / 공급가 350,000원 × 1.1 = 385,000원
      tiers: [
        { label: '기본형', price: 165000 },
        { label: '고급형', price: 385000 },
      ],
    },
    {
      id: 'flyer',
      categoryId: 'outdoor',
      image: 'products/flyer.jpg',
      name: '전단지',
      shortDesc: '행사·이벤트 전단지 디자인',
      optionType: 'sides',
      // 공급가 50,000원 × 1.1 = 55,000원 / 공급가 100,000원 × 1.1 = 110,000원
      singlePrice: 55000,
      doublePrice: 110000,
    },
    {
      id: 'x-banner',
      categoryId: 'outdoor',
      image: 'products/x-banner.jpg',
      name: 'X배너',
      shortDesc: '전시·매장용 X배너 스탠드 디자인',
      optionType: 'sides',
      // 공급가 80,000원 × 1.1 = 88,000원 / 공급가 120,000원 × 1.1 = 132,000원
      singlePrice: 88000,
      doublePrice: 132000,
    },

    /* ─── 명함 ─── */
    {
      id: 'regular-card',
      categoryId: 'card',
      image: 'products/business-card.jpg',
      name: '일반 명함',
      shortDesc: '기본 명함 디자인',
      optionType: 'sides',
      // 공급가 50,000원 × 1.1 = 55,000원 / 공급가 70,000원 × 1.1 = 77,000원
      singlePrice: 55000,
      doublePrice: 77000,
    },
    {
      id: 'premium-card',
      categoryId: 'card',
      image: 'products/business-card.jpg',
      name: '고급 명함',
      shortDesc: '고급 소재·특수인쇄 명함 디자인',
      optionType: 'sides',
      // 공급가 90,000원 × 1.1 = 99,000원 / 공급가 130,000원 × 1.1 = 143,000원
      singlePrice: 99000,
      doublePrice: 143000,
    },

    /* ─── 스티커 ─── */
    {
      id: 'regular-sticker',
      categoryId: 'sticker',
      image: 'products/sticker.jpg',
      name: '일반 스티커',
      shortDesc: '제품·판촉용 일반 스티커 디자인',
      optionType: 'fixed',
      // 공급가 20,000원 × 1.1 = 22,000원 / 공급가 80,000원 × 1.1 = 88,000원
      tiers: [
        { label: '기본형', price: 22000 },
        { label: '고급형', price: 88000 },
      ],
    },
    {
      id: 'premium-sticker',
      categoryId: 'sticker',
      image: 'products/sticker.jpg',
      name: '고급 스티커',
      shortDesc: '특수 소재·형태 컷팅 고급 스티커 디자인',
      optionType: 'fixed',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 150,000원 × 1.1 = 165,000원
      tiers: [
        { label: '기본형', price: 44000 },
        { label: '고급형', price: 165000 },
      ],
    },

    /* ─── 초대장 ─── */
    {
      id: 'gift-certificate',
      categoryId: 'invite',
      image: 'products/gift-certificate.jpg',
      name: '상품권',
      shortDesc: '브랜드 상품권·교환권 디자인',
      optionType: 'sides',
      // 공급가 60,000원 × 1.1 = 66,000원 / 공급가 90,000원 × 1.1 = 99,000원
      singlePrice: 66000,
      doublePrice: 99000,
    },
    {
      id: 'invitation',
      categoryId: 'invite',
      image: 'products/invitation.jpg',
      name: '초대장',
      shortDesc: '행사·결혼·파티 초대장 디자인',
      optionType: 'sides',
      // 공급가 70,000원 × 1.1 = 77,000원 / 공급가 100,000원 × 1.1 = 110,000원
      singlePrice: 77000,
      doublePrice: 110000,
    },
    {
      id: 'ticket',
      categoryId: 'invite',
      image: 'products/ticket.jpg',
      name: '티켓',
      shortDesc: '공연·이벤트 입장권 티켓 디자인',
      optionType: 'sides',
      // 공급가 50,000원 × 1.1 = 55,000원 / 공급가 80,000원 × 1.1 = 88,000원
      singlePrice: 55000,
      doublePrice: 88000,
    },
    {
      id: 'postcard',
      categoryId: 'invite',
      image: 'products/postcard.jpg',
      name: '엽서',
      shortDesc: '브랜드·기념 엽서 디자인',
      optionType: 'sides',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 65,000원 × 1.1 = 71,500원
      singlePrice: 44000,
      doublePrice: 71500,
    },
    {
      id: 'coupon',
      categoryId: 'invite',
      image: 'products/coupon.jpg',
      name: '쿠폰',
      shortDesc: '할인·판촉 쿠폰 디자인',
      optionType: 'sides',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 60,000원 × 1.1 = 66,000원
      singlePrice: 44000,
      doublePrice: 66000,
    },

    /* ─── 봉투 ─── */
    {
      id: 'large-envelope',
      categoryId: 'envelope',
      image: 'products/envelope.jpg',
      name: '대봉투',
      shortDesc: 'A4 서류용 대봉투 디자인',
      optionType: 'fixed',
      // 공급가 60,000원 × 1.1 = 66,000원 / 공급가 100,000원 × 1.1 = 110,000원
      tiers: [
        { label: '기본형', price: 66000 },
        { label: '고급형', price: 110000 },
      ],
    },
    {
      id: 'medium-envelope',
      categoryId: 'envelope',
      image: 'products/envelope.jpg',
      name: '중봉투',
      shortDesc: '중형 서류봉투 디자인',
      optionType: 'fixed',
      // 공급가 50,000원 × 1.1 = 55,000원 / 공급가 85,000원 × 1.1 = 93,500원
      tiers: [
        { label: '기본형', price: 55000 },
        { label: '고급형', price: 93500 },
      ],
    },
    {
      id: 'small-envelope',
      categoryId: 'envelope',
      image: 'products/envelope.jpg',
      name: '소봉투',
      shortDesc: '소형 서류·카드봉투 디자인',
      optionType: 'fixed',
      // 공급가 40,000원 × 1.1 = 44,000원 / 공급가 70,000원 × 1.1 = 77,000원
      tiers: [
        { label: '기본형', price: 44000 },
        { label: '고급형', price: 77000 },
      ],
    },

    /* ─── 선거홍보물 ─── */
    {
      id: 'election-report',
      categoryId: 'election',
      image: 'products/election.png',
      name: '선거공보',
      shortDesc: '선거관리위원회 규격 선거공보 편집 디자인',
      optionType: 'pages',
      // 공급가 기본 100,000원 × 1.1 = 110,000원 / 공급가 30,000원/P × 1.1 = 33,000원/P
      basePrice: 110000,
      pricePerPage: 33000,
      minPages: 4,
      maxPages: 40,
      pageStep: 4,
    },
    {
      id: 'election-report-3fold',
      categoryId: 'election',
      image: 'products/election.png',
      name: '선거공보 3단접지',
      shortDesc: '3단 접지 선거공보 편집 디자인',
      optionType: 'fixed',
      // 공급가 200,000원 × 1.1 = 220,000원 / 공급가 350,000원 × 1.1 = 385,000원
      tiers: [
        { label: '기본형', price: 220000 },
        { label: '고급형', price: 385000 },
      ],
    },
    {
      id: 'election-report-2fold',
      categoryId: 'election',
      image: 'products/election.png',
      name: '선거공보 2단접지',
      shortDesc: '2단 접지 선거공보 편집 디자인',
      optionType: 'fixed',
      // 공급가 170,000원 × 1.1 = 187,000원 / 공급가 300,000원 × 1.1 = 330,000원
      tiers: [
        { label: '기본형', price: 187000 },
        { label: '고급형', price: 330000 },
      ],
    },
    {
      id: 'election-poster',
      categoryId: 'election',
      image: 'products/election-poster.png',
      name: '선거벽보 포스터',
      shortDesc: '선거관리위원회 규격 선거벽보 디자인',
      optionType: 'fixed',
      // 공급가 150,000원 × 1.1 = 165,000원 / 공급가 280,000원 × 1.1 = 308,000원
      tiers: [
        { label: '기본형', price: 165000 },
        { label: '고급형', price: 308000 },
      ],
    },
    {
      id: 'election-card',
      categoryId: 'election',
      image: 'products/election-card.png',
      name: '선거 명함',
      shortDesc: '후보자 선거 명함 디자인',
      optionType: 'sides',
      // 공급가 80,000원 × 1.1 = 88,000원 / 공급가 120,000원 × 1.1 = 132,000원
      singlePrice: 88000,
      doublePrice: 132000,
    },
  ],

};
