import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {POLICY_DOCUMENTS,POLICY_METADATA,HISTORICAL_PG_POLICY_DOCUMENTS,HISTORICAL_PG_POLICY_METADATA,canonicalizePolicyDocument} from '../src/policy-documents.js';
test('current bank terms price new orders without changing historical PG policy or privacy',()=>{
 const terms=canonicalizePolicyDocument(POLICY_DOCUMENTS.terms);
 for(const text of ['Standard 99,000원','Deluxe 199,000원','Premium 499,000원','108,900원','218,900원','548,900원','별도 설치비는 없습니다','부가세 10%'])assert.ok(terms.includes(text),text);
 assert.doesNotMatch(terms,/149,000|599,000|999,000|273,900|768,900|1,208,900/);
 for(const kind of ['terms','privacy','refund'])assert.equal(createHash('sha256').update(canonicalizePolicyDocument(HISTORICAL_PG_POLICY_DOCUMENTS[kind])).digest('hex'),HISTORICAL_PG_POLICY_METADATA.documents[kind].canonicalSha256);
 assert.equal(POLICY_METADATA.documents.privacy.canonicalSha256,'0bfce66ef62e03780c84745d167b0fbf1959ca7f05361aa59283ee12236adc05');
});
test('current refund example uses current totals but the substantive refund rule is unchanged',()=>{
 const section=(doc,heading)=>doc.sections.find(s=>s[0]===heading);
 assert.deepEqual(section(POLICY_DOCUMENTS.refund,'환불 단계'),section(HISTORICAL_PG_POLICY_DOCUMENTS.refund,'환불 단계'));
 const example=section(POLICY_DOCUMENTS.refund,'계산 예시').join(' ');
 assert.match(example,/108,900/);assert.match(example,/18,150원/);assert.doesNotMatch(example,/273,900|163,900|82,317/);
});
