import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {POLICY_DOCUMENTS,POLICY_METADATA,canonicalizePolicyDocument} from '../src/policy-documents.js';

test('new-order terms bind one item and separate VAT, never a monthly bundle',()=>{
 const terms=canonicalizePolicyDocument(POLICY_DOCUMENTS.terms);
 for(const text of ['텍스트형 4,900원','이미지형 9,900원','영상형 34,900원','5,390원','10,890원','38,390원','콘텐츠 1건','부가세 10%'])assert.ok(terms.includes(text),text);
 assert.doesNotMatch(terms,/한 달|한달|달력일마다|월 이용료/);
 const refund=canonicalizePolicyDocument(POLICY_DOCUMENTS.refund);
 assert.doesNotMatch(refund,/한 달|월 이용료|30개|첫 달/);
 assert.match(refund,/기존 주문.*당시/);
 for(const kind of ['terms','privacy','refund'])assert.equal(POLICY_METADATA.documents[kind].canonicalSha256,createHash('sha256').update(canonicalizePolicyDocument(POLICY_DOCUMENTS[kind])).digest('hex'));
});
