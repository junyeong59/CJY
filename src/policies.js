import {POLICY_DOCUMENTS, POLICY_METADATA} from './policy-documents.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderPolicy(kind) {
  const page = POLICY_DOCUMENTS[kind];
  const metadata = POLICY_METADATA.documents[kind];
  if (!page || !metadata) throw new RangeError(`Unknown policy: ${kind}`);
  const displayDate = metadata.versionDate.replaceAll('-', '.');
  return `<div class="landing policy-page"><header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31" /></a><a href="/#product" data-link>Product</a><a href="/#pricing" data-link>Pricing</a><a href="/order" data-link>Order</a></nav></header><main class="policy-main"><h1>${esc(page.title)}</h1><p class="policy-draft">시행일 ${displayDate} · 버전 ${displayDate} · 상업·결제·환불 조건 확정 · 결제 활성화 차단</p><p class="policy-draft">실제 결제 처리자의 수령 법인, 처리 국가와 보유 기간이 확인·공개되기 전까지 결제를 활성화하지 않습니다. 개인정보 처리방침이 완결되었다는 의미가 아닙니다.</p><article aria-label="${esc(page.label)}" data-policy-kind="${esc(kind)}" data-policy-version="${metadata.versionDate}" data-policy-hash="${metadata.canonicalSha256}" data-effective-state="${POLICY_METADATA.effectiveState}" data-checkout-eligible="${POLICY_METADATA.checkoutEligible}" data-payment-live="${POLICY_METADATA.paymentLive}">${page.sections.map(([heading,...paragraphs])=>`<section><h2>${esc(heading)}</h2>${paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('')}</article></main></div>`;
}

export function renderFooter() {
  return `<footer class="business-footer"><nav aria-label="정책 안내"><a href="/terms" data-link>이용약관</a><a href="/privacy" data-link><strong>개인정보처리방침</strong></a><a href="/refund" data-link>환불 정책</a></nav><p>상호: 씨제이와이(CJY) · 대표자: 최준영 · 사업자등록번호: 626-51-01216</p><p>사업장 주소: 서울특별시 서대문구 이화여대7길 37, 3층 S125호(대현동)</p><p>고객 문의: <a href="mailto:cjy.support@gmail.com">cjy.support@gmail.com</a></p><p>고객센터 전화번호: <a href="tel:07081212974">070-8121-2974</a></p><small>© CJY</small></footer>`;
}
