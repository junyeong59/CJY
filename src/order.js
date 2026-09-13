const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const header = () => `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴"><a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31"></a><a href="/#product" data-link>Product</a><a href="/#pricing" data-link>Pricing</a><a href="/order" data-link aria-current="page">Order</a></nav></header>`;
const number = () => new URLSearchParams(location.search).get('number')?.slice(0,80) || '12345678';
const demoNote = '<p class="order-demo">예시 주문 · 실제 주문 및 결제 내역이 아닙니다.</p>';
const statusUrl = () => `/order/status?number=${encodeURIComponent(number())}`;
export function renderOrderLookup() {
 return `<div class="landing application order-page">${header()}<main class="order-lookup"><h1>주문 현황</h1><form id="order-lookup-form"><label class="customer-field">주문 번호<input name="number" required maxlength="80" autocomplete="off"></label><label class="customer-field">주문자 성함<input name="name" maxlength="100" autocomplete="name"></label><p class="order-demo">임의의 주문 번호로 예시 현황을 확인할 수 있습니다.</p><button class="order-button" type="submit">확인하기</button></form></main></div>`;
}
export function bindOrder(root, navigate) {
 root.querySelector('#order-lookup-form')?.addEventListener('submit', e => {
 e.preventDefault(); const input=e.currentTarget.elements.number; const value=input.value.trim();
 if (!value) { input.setCustomValidity('주문 번호를 입력해주세요.'); input.reportValidity(); return; }
 input.setCustomValidity(''); navigate(`/order/status?number=${encodeURIComponent(value)}`);
 });
 root.querySelector('[name="number"]')?.addEventListener('input', e => e.target.setCustomValidity(''));
}
export function renderOrderStatus() {
 const steps=[['payment','결제 완료','결제를 확인하고 초기 파이프라인을 제작하고 있어요.'],['discussion','협의 및 파이프라인 확정','초기 파이프라인의 결과물을 전달하고 수정사항을 협의합니다.'],['upload','협의 날짜에 따라 작업 시작','최종 파이프라인을 통해 작업을 시작합니다.']];
 return `<div class="landing application order-page">${header()}<main class="order-status"><div class="order-heading"><h1>결제가 완료되었습니다</h1><p class="order-number">주문 번호: ${esc(number())}</p><p class="order-hint">*주문 번호는 현재 처리 단계를 조회할 때 필요합니다.</p>${demoNote}</div><section aria-labelledby="stage-title"><h2 id="stage-title">현재 단계: 결제 완료</h2><ol class="order-steps">${steps.map(([icon,title,copy],i)=>`<li class="${i?'is-pending':'is-current'}" ${i?'':'aria-current="step"'}><img src="/assets/order/${icon}.png" alt="" width="274" height="274"><h3>${title}</h3><p>${copy}</p><span class="order-step-state">${i?'대기':'현재 단계'}</span></li>`).join('')}</ol></section><div class="order-actions"><a data-link href="/order/details?number=${encodeURIComponent(number())}">신청 내용 확인하기</a><a class="order-button" href="mailto:cjy.support@gmail.com?subject=${encodeURIComponent('CJY 주문 문의: '+number())}">문의하기</a></div></main></div>`;
}
export function renderOrderDetails() {
 const rows=[['성함','예시 고객'],['연락 가능한 전화번호','010-0000-0000'],['서비스 종류','매일 릴스 솔루션'],['요금제','Standard'],['자동 게시 여부','사용함'],['기존 계정 사용 여부','사용하지 않음'],['업로드 결과 전달 채널','텔레그램'],['콘텐츠 스타일 및 내용','브랜드와 서비스를 소개하는 릴스를 매일 제작해주세요. 밝고 친근한 분위기를 원합니다. (예시)'],['필수 동의 항목','편집·외부 AI 처리, 자동 게시, 개인정보 수집 동의 (예시)'],['주의 사항 확인','확인 완료 (예시)'],['결제 금액','349,000₩ (파이프라인 설치 비용 포함)']];
 return `<div class="landing application order-page">${header()}<main class="order-details"><h1>신청 내용 확인하기</h1><p class="order-number">주문 번호: ${esc(number())}</p>${demoNote}<dl>${rows.map(([label,value])=>`<div><dt>${label}</dt><dd>${value}</dd></div>`).join('')}</dl><a class="order-button" data-link href="${statusUrl()}">주문 현황으로 돌아가기</a></main></div>`;
}
