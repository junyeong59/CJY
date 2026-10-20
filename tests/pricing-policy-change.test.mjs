import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {POLICY_DOCUMENTS,POLICY_METADATA,HISTORICAL_PG_POLICY_DOCUMENTS,HISTORICAL_PG_POLICY_METADATA,canonicalizePolicyDocument} from '../src/policy-documents.js';
test('current bank terms price new orders without changing historical PG policy or privacy',()=>{
 const terms=canonicalizePolicyDocument(POLICY_DOCUMENTS.terms);
 for(const text of ['텍스트형 4,900원','이미지형 9,900원','영상형 34,900원','5,390원','10,890원','38,390원','별도 설치비는 없습니다','부가세 10%'])assert.ok(terms.includes(text),text);
 assert.doesNotMatch(terms,/149,000|599,000|999,000|273,900|768,900|1,208,900/);
 for(const kind of ['terms','privacy','refund'])assert.equal(createHash('sha256').update(canonicalizePolicyDocument(HISTORICAL_PG_POLICY_DOCUMENTS[kind])).digest('hex'),HISTORICAL_PG_POLICY_METADATA.documents[kind].canonicalSha256);
 assert.equal(POLICY_METADATA.documents.privacy.canonicalSha256,createHash('sha256').update(canonicalizePolicyDocument(POLICY_DOCUMENTS.privacy)).digest('hex'));
});
test('current refund example uses current totals but the substantive refund stages and calculation are unchanged',()=>{
 const section=(doc,heading)=>doc.sections.find(s=>s[0]===heading);
 const stages=section(POLICY_DOCUMENTS.refund,'환불 단계').join(' ');
 assert.match(stages,/100%/);assert.match(stages,/50%/);assert.match(stages,/총 결제액 × 0.5/);assert.match(stages,/약정 콘텐츠 수 × 제공 완료 콘텐츠 수/);assert.match(stages,/음수이면.*0원/);
 const example=section(POLICY_DOCUMENTS.refund,'계산 예시').join(' ');
 assert.match(example,/5,390/);assert.match(example,/2,695원/);assert.doesNotMatch(example,/273,900|163,900|82,317/);
});
