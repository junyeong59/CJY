const plans = { Standard: 149000, Deluxe: 599000, Premium: 999000 };
const money = value => `${value.toLocaleString('ko-KR')}₩`;

export function renderApplication() {
  return `<div class="landing application"><header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴">
    <a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31" /></a>
    <a href="/#product" data-link>Product</a><a href="/#pricing" data-link>Pricing</a><a href="/order" data-link>Order</a>
  </nav></header>
  <main class="application-main"><h1>서비스 신청하기</h1>
    <form id="application-form">
      <div class="application-fields">
        <section class="customer-section" aria-labelledby="customer-heading">
          <h2 id="customer-heading" class="application-section-title">고객 정보</h2>
          <div class="customer-fields">
            <label class="customer-field">성함<input type="text" name="customerName" autocomplete="name" required maxlength="100" aria-describedby="customer-note" /></label>
            <label class="customer-field">연락 가능한 전화번호<input type="tel" name="customerPhone" autocomplete="tel" inputmode="tel" required maxlength="30" aria-describedby="customer-note" /></label>
          </div>
          <p id="customer-note" class="customer-note">*결제 확인 후 솔루션 전달을 위해 반드시 필요한 정보이니 정확하게 작성해주세요.</p>
        </section>
        <h2 class="application-section-title">서비스 신청</h2>
        <label class="form-field">서비스 종류<select name="service"><option value="reels">매일 릴스 솔루션</option></select></label>
        <div data-reels>
          <label class="form-field">요금제<select name="plan"><option>Standard</option><option>Deluxe</option><option>Premium</option></select></label>
          <label class="form-field">자동 게시 여부<select name="autoPost"><option value="yes">사용함</option><option value="no">사용하지 않음</option></select></label>
          <div data-account>
            <label class="form-field">기존 계정 사용 여부<select name="existingAccount" aria-describedby="existing-account-note"><option value="no">사용하지 않음</option><option value="yes">사용함</option></select></label>
            <p id="existing-account-note" class="customer-note">*기존 계정을 사용 할 시, 별도의 추가 작업이 필요할 수 있습니다</p>
          </div>
        </div>
        <div class="brief-field">
          <div class="brief-heading"><label for="application-brief" id="brief-label">콘텐츠 스타일 및 내용</label><button type="button" class="brief-help" aria-expanded="false" aria-controls="brief-guide">꼭 포함되어야 하는 내용</button></div>
          <p id="brief-guide" hidden><strong>- 브랜드·서비스 소개:</strong><br><strong>- 주제와 주로 보여주고 싶은 대상:</strong><br><strong>- 원하는 분위기·말투:</strong><br><strong>- 참고 계정 또는 콘텐츠 링크:</strong><br><strong>- 꼭 포함하거나 제외할 내용:</strong></p>
          <textarea id="application-brief" name="brief" required maxlength="10000" placeholder="꼭 포함되어야 하는 내용을 포함해서 자유롭게 작성해주세요."></textarea>
        </div>
        <div data-reels>
          <fieldset class="delivery"><legend>업로드 결과 전달 채널</legend><div class="delivery-options">
            <label><input type="radio" name="channel" value="discord" /><span>디스코드</span></label>
            <label><input type="radio" name="channel" value="telegram" checked /><span>텔레그램</span></label>
            <label><input type="radio" name="channel" value="gmail" /><span>지메일</span></label>
          </div></fieldset>
        </div>
        <fieldset class="consents"><legend>필수 동의 항목</legend>
          <label><input type="checkbox" name="processingConsent" required />계약 범위의 편집 · 외부 AI 처리를 허용합니다</label>
          <label data-posting-consent><input type="checkbox" name="postingConsent" required />자동 게시 신청 시 지정 계정의 계약 범위의 게시를 허용합니다</label>
          <label><input type="checkbox" name="privacyConsent" required />솔루션 전달을 위한 전화번호 및 성함과 같은 개인정보 수집에 동의합니다</label>
        </fieldset>
        <fieldset class="consents application-notices"><legend>주의 사항</legend>
          <p>결제일 이후 고객 맞춤 파이프라인 확정을 위해 추가적인 협의가 필요하며, 협의는 <strong>메시지로 진행됩니다.</strong></p>
          <p>콘텐츠 업로드는 파이프라인 확정 이후, <strong>협의된 날짜부터 시작되며 한 달간 진행됩니다.</strong> 이후 추가 이용을 위해서는 추가금을 납부해야 합니다.</p>
          <label><input type="checkbox" name="noticeConsent" required />네 이해했습니다.</label>
        </fieldset>
      </div>
      <div class="payment-dock"><div class="order-summary" aria-live="polite"><div data-setup><span>파이프라인 설치 비용</span><strong>200,000₩</strong></div><div><span id="order-service"></span><strong id="order-price"></strong></div></div>
      <div class="checkout"><strong id="order-total" aria-live="polite"></strong><button type="button" disabled>결제하기</button></div>
      <p class="checkout-note">결제 연결 준비 중입니다. 현재 신청 내용은 전송되거나 결제되지 않습니다.</p>
      <p id="checkout-status" role="status"></p></div>
    </form>
  </main></div>`;
}

export function bindApplication(root) {
  const form = root.querySelector('#application-form');
  if (!form) return;
  const field = name => form.elements.namedItem(name);
  const params = new URLSearchParams(window.location.search);
  field('service').value = 'reels';
  field('plan').value = Object.hasOwn(plans, params.get('plan')) ? params.get('plan') : 'Standard';
  const sync = () => {
    const autoPost = field('autoPost').value === 'yes';
    form.querySelector('[data-account]').hidden = !autoPost;
    field('existingAccount').disabled = !autoPost;
    field('postingConsent').required = autoPost;
    field('postingConsent').disabled = !autoPost;
    if (!autoPost) field('postingConsent').checked = false;
    form.querySelector('[data-posting-consent]').hidden = !autoPost;
    const price = plans[field('plan').value];
    root.querySelector('#order-service').textContent = `매일 릴스 솔루션 (${field('plan').value})`;
    root.querySelector('#order-price').textContent = money(price);
    root.querySelector('#order-total').textContent = `총 가격: ${money(price + 200000)}`;
    root.querySelector('#checkout-status').textContent = '';
  };
  form.addEventListener('change', sync);
  form.querySelector('.brief-help').addEventListener('click', event => {
    const guide = root.querySelector('#brief-guide');
    guide.hidden = !guide.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!guide.hidden));
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    root.querySelector('#checkout-status').textContent = '결제 서비스 연결 준비 중입니다. 신청 내용은 전송되지 않았으며 결제도 진행되지 않았습니다.';
  });
  sync();
  const dock = form.querySelector('.payment-dock');
  const updateDockSpace = () => {
    if (dock.isConnected) form.style.paddingBottom = `${dock.getBoundingClientRect().height + 40}px`;
  };
  updateDockSpace();
  const observer = new ResizeObserver(updateDockSpace);
  observer.observe(dock);
  return () => observer.disconnect();
}
