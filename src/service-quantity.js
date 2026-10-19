import {MAX_ORDER_QUANTITY} from './commercial.js';
// Stable plan/service IDs stay API-compatible; special packages remain unavailable.
export function renderServiceQuantity() {
 return `<input type="hidden" name="service" value="reels" />
<div class="service-quantity-row">
<label class="form-field">서비스 종류<select name="plan"><option value="Standard">텍스트형</option><option value="Deluxe">이미지형</option><option value="Premium">영상형</option><option value="ai-influencer" disabled>AI Influencer Start-pack (준비중)</option><option value="ai-cinema" disabled>AI Cinema Start-pack (준비중)</option></select></label>
<label class="form-field">수량<select name="quantity">${Array.from({length:MAX_ORDER_QUANTITY},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label>
</div><p class="customer-note quantity-note" data-quantity-note>*선택한 수량의 콘텐츠를 협의된 일정에 제작·전달합니다.</p>`;
}
