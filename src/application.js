import {PRICING, calculateFirstMonthPrice} from './commercial.js';
import {createPolicyConsentEvidence} from './policy-documents.js';

const plans = PRICING.plans;
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
          <p id="customer-note" class="customer-note">*신청 내용 검토 및 연락을 위한 정보입니다. 신청만으로 결제·고객 등록·제작·게시가 시작되지 않습니다.</p>
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
          <label><input type="checkbox" name="termsConsent" required /><span><a href="/terms" target="_blank" rel="noopener">이용약관</a>에 동의합니다</span></label>
          <label><input type="checkbox" name="refundConsent" required /><span><a href="/refund" target="_blank" rel="noopener">환불 정책</a>에 동의합니다</span></label>
          <label><input type="checkbox" name="processingConsent" required />편집 · 외부 AI 처리 희망 사항이며 실제 제작은 별도 협의·확정 후 진행됨을 이해합니다</label>
          <label data-posting-consent><input type="checkbox" name="postingConsent" required />자동 게시 희망 사항이며 실제 게시 권한은 별도 협의·확정이 필요함을 이해합니다</label>
          <label><input type="checkbox" name="privacyConsent" required />신청 검토 및 연락을 위해 성함·전화번호·신청 내용·선택 및 동의 항목을 서버에 저장하는 데 동의합니다. 동의하지 않으면 신청을 접수할 수 없습니다</label><p class="customer-note policy-links"><a href="/terms" target="_blank" rel="noopener">이용약관</a> · <a href="/privacy" target="_blank" rel="noopener">개인정보처리방침</a> · <a href="/refund" target="_blank" rel="noopener">환불 정책</a> (새 창)</p>
        </fieldset>
        <fieldset class="consents application-notices"><legend>주의 사항</legend>
          <p>결제일에 설치를 시작합니다. 초기 상담에서 고객은 <strong>파이프라인 가이드라인 수정을 최대 2회</strong> 요청할 수 있습니다. 이는 가이드라인 확정을 위한 횟수이며 <strong>개별 콘텐츠마다 제공되는 수정 권리가 아닙니다.</strong></p>
          <p>콘텐츠 제공은 가이드라인 확정 후 <strong>고객이 선택한 시작일부터 한 달간 달력일마다 1개</strong> 진행합니다. 계약 시 확정한 약정 콘텐츠 수는 임의로 변경하지 않습니다. 연장은 매달 직접 결제하며 자동 정기결제되지 않습니다.</p>
          <label><input type="checkbox" name="noticeConsent" required />네 이해했습니다.</label>
        </fieldset>
      </div>
      <div class="payment-dock"><div class="order-summary" aria-live="polite"><div data-setup><span>파이프라인 설치 비용</span><strong>${money(PRICING.setupSupplyWon)}</strong></div><div><span id="order-service"></span><strong id="order-price"></strong></div><div><span>부가세 (10%)</span><strong id="order-vat"></strong></div></div>
      <p class="price-note">설치비와 서비스비는 부가세 별도이며, 아래 합계에는 부가세 10%가 포함됩니다.</p>
      <div class="checkout"><strong id="order-total" aria-live="polite"></strong><button type="submit">신청 접수하기</button></div>
      <p class="checkout-note">2026.09.23 상업·결제·환불 조건은 PG 검토용 최종 기준으로 확정되었습니다. 그러나 실제 결제 처리자의 수령 법인, 처리 국가와 보유 기간이 확인·공개되기 전까지 결제 활성화는 차단되며, 개인정보 처리 공개가 완결되었다고 주장하지 않습니다. 현재는 검토 대기 접수만 진행하고 결제·자동 제작·자동 게시·고객 등록은 실행하지 않습니다. 접수번호를 보관해주세요. Order 화면은 예시이며 실제 접수 조회 기능은 아닙니다.</p>
      <p id="checkout-status" role="status"></p></div>
    </form>
  </main></div>`;
}

export function bindApplication(root) {
  const form = root.querySelector('#application-form');
  if (!form) return;
  const field = name => form.elements.namedItem(name);
  let busy = false, completed = false;
  let idempotencyKey;
  try { idempotencyKey = sessionStorage.getItem('cjy-intake-key'); } catch {}
  if (!/^[a-f0-9-]{36}$/.test(idempotencyKey || '')) idempotencyKey = crypto.randomUUID();
  try { sessionStorage.setItem('cjy-intake-key', idempotencyKey); } catch {}
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
    const plan = field('plan').value;
    const price = plans[plan];
    const firstMonth = calculateFirstMonthPrice(plan);
    root.querySelector('#order-service').textContent = `매일 릴스 솔루션 (${field('plan').value})`;
    root.querySelector('#order-price').textContent = money(price);
    root.querySelector('#order-vat').textContent = money(firstMonth.vatWon);
    root.querySelector('#order-total').textContent = `총 가격: ${money(firstMonth.totalWon)}`;
    if (!busy && !completed) root.querySelector('#checkout-status').textContent = '';
  };
  form.addEventListener('change', sync);
  for (const name of ['customerName','customerPhone','brief']) field(name).addEventListener('input',()=>field(name).setCustomValidity(''));
  form.querySelector('.brief-help').addEventListener('click', event => {
    const guide = root.querySelector('#brief-guide');
    guide.hidden = !guide.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!guide.hidden));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || completed) return;
    const phone = field('customerPhone').value.trim();
    field('customerPhone').setCustomValidity(/^[+\d][\d ()-]{5,29}$/.test(phone) && phone.replace(/\D/g,'').length >= 7 && phone.replace(/\D/g,'').length <= 15 ? '' : '연락 가능한 전화번호를 확인해주세요.');
    for (const name of ['customerName','brief']) field(name).setCustomValidity(field(name).value.trim() ? '' : '내용을 입력해주세요.');
    if (!form.reportValidity()) return;
    busy = true;
    const payload = {};
    for (const name of ['customerName','customerPhone','service','plan','autoPost','existingAccount','brief','channel']) payload[name] = field(name).value.trim();
    if (payload.autoPost === 'no') payload.existingAccount = 'no';
    for (const name of ['termsConsent','refundConsent','processingConsent','postingConsent','privacyConsent','noticeConsent']) payload[name] = field(name).checked;
    payload.policyEvidence = createPolicyConsentEvidence();
    const status = root.querySelector('#checkout-status');
    const submit = form.querySelector('button[type=submit]');
    submit.disabled = true;
    status.textContent = '신청 내용을 접수하고 있습니다…';
    try {
      const response = await fetch('https://customer-gateway-staging.up.railway.app/api/applications', {
        method:'POST', credentials:'omit', referrerPolicy:'no-referrer', signal:AbortSignal.timeout(20000), headers:{'Content-Type':'application/json','Idempotency-Key':idempotencyKey}, body:JSON.stringify(payload)
      });
      if (!response.ok) throw Object.assign(new Error('submit_failed'), {status:response.status});
      const result = await response.json();
      if (result.status !== 'pending-review' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(result.receipt || '')) throw new Error('invalid_receipt');
      status.textContent = `신청이 검토 대기로 접수되었습니다. 접수번호: ${result.receipt}. 결제·제작·게시는 시작되지 않았습니다.`;
      submit.textContent = '접수 완료';
      completed = true;
    } catch (error) {
      const messages = {400:'입력 내용과 필수 동의 항목을 확인해주세요.',409:'이전 신청과 내용이 다릅니다. 중복 접수를 막기 위해 전송하지 않았습니다. 이전 신청 내용을 확인해주세요.',429:'접수 요청이 많습니다. 한 시간 후 다시 시도해주세요.'};
      status.textContent = messages[error.status] || '접수 결과를 확인하지 못했습니다. 내용을 바꾸거나 창을 닫지 말고 잠시 후 다시 시도해주세요. 같은 접수번호로 확인하여 중복 저장을 방지합니다.';
      submit.disabled = false;
    } finally { busy = false; }
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
