const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
export function validateBankOrder(r,draftId){
 if(r.status==='session-expired'||!uuid.test(draftId??'')||r.draftId!==draftId||r.environment!=='live'||r.paymentMethod!=='bank_transfer'||!['pending_payment','paid','manual_hold','cancelled','refunded','partially_refunded','disputed'].includes(r.state)||typeof r.orderId!=='string'||!r.orderId.trim()||r.currency!=='KRW'||!Number.isSafeInteger(r.totalAmount)||r.totalAmount<=0||!r.bankTransfer||['bankName','accountNumber','accountHolder'].some(k=>typeof r.bankTransfer[k]!=='string'||!r.bankTransfer[k].trim()))throw Error('invalid_bank_order');
 return r;
}
// Only an actual pending bank order has deposit authority. Saved intake and
// paid/refunded/unknown/legacy PG records never expose bank instructions.
export function renderBankDetails(r){
 if(r.state!=='pending_payment'||r.paymentMethod!=='bank_transfer'||r.environment!=='live')return '';
 validateBankOrder(r,r.draftId);
 return `<section data-bank-guide aria-label="결제 대기중 입금 안내"><div data-bank-info><h2>입금 안내</h2><p class="customer-note">아래 최종 금액을 이체해주세요. 운영자가 입금을 확인한 뒤 주문 현황이 결제 완료로 변경됩니다. 상태 조회는 입금 확인을 요청하거나 결제를 확정하지 않습니다.</p><dl class="order-summary"><div><dt>은행</dt><dd>${esc(r.bankTransfer.bankName)}</dd></div><div><dt>계좌번호</dt><dd>${esc(r.bankTransfer.accountNumber)}</dd></div><div><dt>예금주</dt><dd>${esc(r.bankTransfer.accountHolder)}</dd></div><div><dt>최종 입금액 (부가세 포함)</dt><dd><strong>${r.totalAmount.toLocaleString('ko-KR')}₩</strong></dd></div><div><dt>주문 번호</dt><dd>${esc(r.orderId)}</dd></div></dl><p>이미 입금하셨다면 재입금하지 마세요. 확인이 지연되면 주문 번호와 함께 문의해주세요.</p></div><div class="order-record-actions"><button type="button" class="order-button" data-bank-refresh="${esc(r.draftId)}">입금 확인 상태 조회</button></div></section>`;
}
