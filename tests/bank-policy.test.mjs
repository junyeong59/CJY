import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import * as p from '../src/policy-documents.js';
test('bank policy binds exact new documents while preserving October PG evidence',()=>{
 assert.equal(p.POLICY_VERSION_DATE,'2026-10-15');
 assert.equal(p.POLICY_EFFECTIVE_STATE,'effective-bank-transfer-service');
 assert.equal(p.HISTORICAL_PG_POLICY_METADATA.versionDate,'2026-10-09');
 for(const [kind,document] of Object.entries(p.POLICY_DOCUMENTS))assert.equal(p.POLICY_METADATA.documents[kind].canonicalSha256,createHash('sha256').update(p.canonicalizePolicyDocument(document)).digest('hex'));
 for(const [kind,document] of Object.entries(p.HISTORICAL_PG_POLICY_DOCUMENTS))assert.equal(p.HISTORICAL_PG_POLICY_METADATA.documents[kind].canonicalSha256,createHash('sha256').update(p.canonicalizePolicyDocument(document)).digest('hex'));
 const text=JSON.stringify(p.POLICY_DOCUMENTS);assert.match(text,/계좌이체/);assert.match(text,/운영자.*입금/);assert.match(text,/환불 계좌/);assert.match(text,/Supabase/);assert.doesNotMatch(text,/PG 결제창에서 처리|PG에 취소를 요청/);
});
