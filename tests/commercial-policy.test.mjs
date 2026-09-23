import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderApplication} from '../src/application.js';
import {renderFooter, renderPolicy} from '../src/policies.js';
import {
  POLICY_DOCUMENTS,
  POLICY_METADATA,
  canonicalizePolicyDocument,
  createPolicyConsentEvidence
} from '../src/policy-documents.js';
import {
  PRICING,
  calculateFirstMonthPrice,
  calculateRefund
} from '../src/commercial.js';

test('confirmed setup and monthly supply amounts produce exact VAT-inclusive first-month totals', () => {
  assert.equal(PRICING.setupSupplyWon, 100_000);
  const expected = {
    Standard: { monthlySupplyWon: 149_000, vatWon: 24_900, totalWon: 273_900 },
    Deluxe: { monthlySupplyWon: 599_000, vatWon: 69_900, totalWon: 768_900 },
    Premium: { monthlySupplyWon: 999_000, vatWon: 109_900, totalWon: 1_208_900 }
  };

  for (const [plan, values] of Object.entries(expected)) {
    assert.equal(PRICING.plans[plan], values.monthlySupplyWon);
    assert.deepEqual(calculateFirstMonthPrice(plan), {
      setupSupplyWon: 100_000,
      monthlySupplyWon: values.monthlySupplyWon,
      supplyTotalWon: 100_000 + values.monthlySupplyWon,
      vatWon: values.vatWon,
      totalWon: values.totalWon
    });
  }
});

test('refund stages use the confirmed formula and round the final result half-up to whole won', () => {
  const standard = calculateFirstMonthPrice('Standard');
  const common = {
    vatInclusiveTotalWon: standard.totalWon,
    vatInclusiveMonthlyWon: 163_900,
    promisedItemCount: 30
  };

  assert.equal(calculateRefund({...common, stage: 'before-installation', deliveredItemCount: 0}), 273_900);
  assert.equal(calculateRefund({...common, stage: 'consultation', deliveredItemCount: 0}), 136_950);
  assert.equal(calculateRefund({...common, stage: 'service-active', deliveredItemCount: 10}), 82_317);
  assert.equal(calculateRefund({...common, stage: 'service-active', deliveredItemCount: 30}), 0);
});

test('refund calculation rejects invalid counts instead of silently changing the promised item count', () => {
  const input = {
    stage: 'service-active',
    vatInclusiveTotalWon: 273_900,
    vatInclusiveMonthlyWon: 163_900,
    promisedItemCount: 30,
    deliveredItemCount: 31
  };
  assert.throws(() => calculateRefund(input), /deliveredItemCount/);
  assert.throws(() => calculateRefund({...input, deliveredItemCount: 0, promisedItemCount: 0}), /promisedItemCount/);
});

test('policy metadata is deterministic, hash-verified, and effective with payment disabled', () => {
  assert.equal(POLICY_METADATA.versionDate, '2026-09-22');
  assert.equal(POLICY_METADATA.effectiveState, 'effective-current-service-payment-disabled');
  assert.equal(POLICY_METADATA.paymentLive, false);
  assert.deepEqual(Object.keys(POLICY_METADATA.documents).sort(), ['privacy', 'refund', 'terms']);

  for (const [kind, document] of Object.entries(POLICY_DOCUMENTS)) {
    const digest = createHash('sha256').update(canonicalizePolicyDocument(document)).digest('hex');
    assert.equal(POLICY_METADATA.documents[kind].canonicalSha256, digest);
    assert.equal(POLICY_METADATA.documents[kind].versionDate, POLICY_METADATA.versionDate);
  }
});

test('application consent evidence is an exact bounded snapshot of the policy registry', () => {
  assert.deepEqual(createPolicyConsentEvidence(), {
    schemaVersion: 1,
    effectiveState: 'effective-current-service-payment-disabled',
    documents: [
      {kind:'terms', versionDate:'2026-09-22', canonicalSha256:'62b6587c8267a0cc108ae58754c1406ee600f8e5a736527fbda313a825c169af'},
      {kind:'privacy', versionDate:'2026-09-22', canonicalSha256:'21bef12f8afb99e0837f41f9ced44b35d3d8e2853a82379bdea61a7b3055bc45'},
      {kind:'refund', versionDate:'2026-09-22', canonicalSha256:'337bca0be7f4246fee9e0062a1723cf1df83dc41dd5cc69b9bc2fea6923da49e'}
    ]
  });
  assert.equal('collectedAt' in createPolicyConsentEvidence(), false);
});

test('policies state confirmed commercial, revision, retention, provider, and legal-right facts', () => {
  const terms = canonicalizePolicyDocument(POLICY_DOCUMENTS.terms);
  const privacy = canonicalizePolicyDocument(POLICY_DOCUMENTS.privacy);
  const refund = canonicalizePolicyDocument(POLICY_DOCUMENTS.refund);

  for (const text of ['100,000원', 'Standard 149,000원', 'Deluxe 599,000원', 'Premium 999,000원', '273,900원', '768,900원', '1,208,900원', '자동 정기결제는 하지 않습니다']) assert.match(terms, new RegExp(text));
  assert.match(terms, /결제일에 설치를 시작/);
  assert.match(terms, /파이프라인 가이드라인.*2회/);
  assert.match(terms, /개별 콘텐츠마다.*수정/);
  assert.match(terms, /고객이 선택한 시작일.*한 달/);
  assert.match(terms, /약정 콘텐츠 수.*변경하지/);

  for (const text of ['Railway', 'OpenAI/Codex', 'Hermes', 'ElevenLabs', 'Telegram', '고객 전용 비공개 저장소']) assert.match(privacy, new RegExp(text));
  assert.match(privacy, /계약 종료.*7일 이내/);
  assert.match(privacy, /거래·분쟁 기록.*감사 해시/);
  assert.match(privacy, /최준영/);
  assert.match(privacy, /cjy.support@gmail.com/);
  assert.match(privacy, /070-8121-2974/);
  assert.doesNotMatch(privacy, /이전 국가[^.]*미국/);

  assert.match(refund, /설치 시작 표시 전.*100%/);
  assert.match(refund, /서비스 활성화 전.*50%/);
  assert.match(refund, /max\(0, 부가세 포함 총 결제액 × 0.5 − \(부가세 포함 월 이용료 ÷ 약정 콘텐츠 수 × 제공 완료 콘텐츠 수\)\)/);
  assert.match(refund, /82,317원/);
  assert.match(refund, /최종 계산 결과.*1원 단위.*반올림/);
  assert.match(refund, /법령.*우선/);
});

test('application and footer expose all policies and distinguish guideline revisions from item revisions', () => {
  const application = renderApplication();
  assert.match(application, /100,000₩/);
  assert.match(application, /파이프라인 가이드라인.*최대 2회/);
  assert.match(application, /개별 콘텐츠.*수정.*아닙니다/);
  for (const [href, label] of [['/terms', '이용약관'], ['/privacy', '개인정보처리방침'], ['/refund', '환불 정책']]) {
    assert.match(application, new RegExp(`href="${href}"[^>]*>${label}`));
    assert.match(renderFooter(), new RegExp(`href="${href}"`));
  }
  assert.doesNotMatch(application, /200,000₩/);
});

test('rendered policies carry reusable version and hash metadata without claiming payment is live', () => {
  for (const kind of ['terms', 'privacy', 'refund']) {
    const html = renderPolicy(kind);
    assert.match(html, /시행일 2026\.09\.22 · 버전 2026\.09\.22 · 현재 결제 기능 미연동/);
    assert.doesNotMatch(html, /결제 도입 전 준비본|검토용|초안|시행일 미정/);
    assert.match(html, /data-effective-state="effective-current-service-payment-disabled"/);
    assert.match(html, new RegExp(`data-policy-hash="${POLICY_METADATA.documents[kind].canonicalSha256}"`));
  }
});

test('tracked display sources contain no stale setup fee or old totals and landing pricing names the setup amount', async () => {
  const files = ['../src/app.js', '../src/application.js', '../src/order.js', '../src/policy-documents.js', '../README.md'];
  const sources = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /200,000|383,900|878,900|1,318,900|349,000/);
  assert.match(sources[0], /초기 설치비 100,000원/);
});
