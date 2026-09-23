import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {renderApplication} from '../src/application.js';
import {renderFooter, renderPolicy} from '../src/policies.js';
import {
  HISTORICAL_PAYMENT_DISABLED_POLICY_DOCUMENTS,
  HISTORICAL_PAYMENT_DISABLED_POLICY_EVIDENCE,
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

test('policy metadata preserves current consent evidence but blocks checkout and payment activation', () => {
  assert.equal(POLICY_METADATA.versionDate, '2026-09-23');
  assert.equal(POLICY_METADATA.effectiveState, 'effective-current-service-payment-activation-blocked');
  assert.equal(POLICY_METADATA.checkoutEligible, false);
  assert.equal(POLICY_METADATA.paymentLive, false);
  assert.deepEqual(Object.keys(POLICY_METADATA.documents).sort(), ['privacy', 'refund', 'terms']);

  for (const [kind, document] of Object.entries(POLICY_DOCUMENTS)) {
    const digest = createHash('sha256').update(canonicalizePolicyDocument(document)).digest('hex');
    assert.equal(POLICY_METADATA.documents[kind].canonicalSha256, digest);
    assert.equal(POLICY_METADATA.documents[kind].versionDate, POLICY_METADATA.versionDate);
  }
});

test('application consent evidence is an exact bounded snapshot of the current policy registry', () => {
  assert.deepEqual(createPolicyConsentEvidence(), {
    schemaVersion: 1,
    effectiveState: 'effective-current-service-payment-activation-blocked',
    documents: ['terms','privacy','refund'].map(kind => ({kind, ...POLICY_METADATA.documents[kind]}))
  });
  assert.equal('collectedAt' in createPolicyConsentEvidence(), false);
});

test('the 2026-09-22 payment-disabled policy remains byte-identical and separately evidenced', () => {
  const hashes={terms:'62b6587c8267a0cc108ae58754c1406ee600f8e5a736527fbda313a825c169af',privacy:'21bef12f8afb99e0837f41f9ced44b35d3d8e2853a82379bdea61a7b3055bc45',refund:'337bca0be7f4246fee9e0062a1723cf1df83dc41dd5cc69b9bc2fea6923da49e'};
  for(const [kind,document] of Object.entries(HISTORICAL_PAYMENT_DISABLED_POLICY_DOCUMENTS)) assert.equal(createHash('sha256').update(canonicalizePolicyDocument(document)).digest('hex'),hashes[kind]);
  assert.deepEqual(HISTORICAL_PAYMENT_DISABLED_POLICY_EVIDENCE,{schemaVersion:1,effectiveState:'effective-current-service-payment-disabled',documents:['terms','privacy','refund'].map(kind=>({kind,versionDate:'2026-09-22',canonicalSha256:hashes[kind]}))});
});

test('final commercial terms state the bounded PortOne/PG, authority, refund, processor, and legal-right facts', () => {
  const terms = canonicalizePolicyDocument(POLICY_DOCUMENTS.terms);
  const privacy = canonicalizePolicyDocument(POLICY_DOCUMENTS.privacy);
  const refund = canonicalizePolicyDocument(POLICY_DOCUMENTS.refund);

  for (const text of ['PortOne V2','KG이니시스','NHN KCP','100,000원', 'Standard 149,000원', 'Deluxe 599,000원', 'Premium 999,000원', '273,900원', '768,900원', '1,208,900원', '자동 정기결제']) assert.match(terms, new RegExp(text));
  assert.match(terms, /카드.*PG 결제창.*간편결제/);
  assert.match(terms, /카드번호.*CVC.*수집.*저장하지/);
  assert.match(terms, /(결제 확인 후.*설치|설치.*결제 확인 후)/);
  assert.match(terms, /파이프라인 가이드라인.*2회/);
  assert.match(terms, /개별 콘텐츠마다.*수정/);
  assert.match(terms, /고객이 선택한 시작일.*한 달/);
  assert.match(terms, /약정 콘텐츠 수.*변경하지/);
  assert.match(terms, /결제 확인.*한 달 구매.*주문.*환불 권리.*확정/);
  assert.match(terms, /결제만으로.*내부 고객 등록.*바인딩.*초대.*제작.*전달.*게시.*권한/);
  assert.doesNotMatch(terms, /결제만으로[^.]*고객 구속력 있는 계약 확정[^.]*생기지/);

  for (const text of ['Railway','PortOne V2','KG이니시스','NHN KCP','OpenAI/Codex', 'Hermes', 'ElevenLabs', 'Telegram', '고객 전용 비공개 저장소']) assert.match(privacy, new RegExp(text));
  for (const text of ['주문 식별자','결제 식별자','거래 식별자','취소 식별자','상태','시각','최소화한 해시']) assert.match(privacy,new RegExp(text));
  assert.match(privacy,/카드번호.*CVC.*계좌.*간편결제 인증정보.*처리하지/);
  assert.match(privacy, /로컬.*콘텐츠 아티팩트.*7일 이내.*예정.*삭제/);
  assert.match(privacy, /provider_deletion_pending.*held_unknown/);
  assert.match(privacy, /삭제를 요청.*대조.*삭제되었다고 주장하지/);
  assert.match(privacy, /5년.*3년.*6개월/);
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
  assert.match(refund, /원 결제수단/);
  assert.match(refund, /처리 상태가 불명확|unknown/);
  assert.match(refund, /수동 보류|manual hold/);
  assert.match(refund, /취소 식별자.*상태.*시각/);
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

test('rendered policies identify final commercial terms while checkout and payment stay blocked', () => {
  for (const kind of ['terms', 'privacy', 'refund']) {
    const html = renderPolicy(kind);
    assert.match(html, /시행일 2026\.09\.23 · 버전 2026\.09\.23 · 상업·결제·환불 조건 확정 · 결제 활성화 차단/);
    assert.match(html, /수령 법인.*처리 국가.*보유 기간.*확인·공개/);
    assert.match(html, /개인정보 처리방침.*완결.*아닙니다/);
    assert.match(html, /data-effective-state="effective-current-service-payment-activation-blocked"/);
    assert.match(html, /data-checkout-eligible="false"/);
    assert.match(html, /data-payment-live="false"/);
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

test('release-blocker phrases cannot regress into checkout-ready, no-contract, or unconditional deletion claims', () => {
  const source=[renderApplication(),...['terms','privacy','refund'].map(renderPolicy)].join('\n');
  for(const forbidden of [/checkout-eligible="true"/,/결제에 사용할 수 있도록 확정·시행/,/결제만으로[^.]*고객 구속력 있는 계약 확정[^.]*생기지/,/콘텐츠 아티팩트는 계약 종료일부터 7일 이내 삭제합니다/]) assert.doesNotMatch(source,forbidden);
  assert.match(source,/checkout-eligible="false"/);
  assert.match(source,/결제 활성화.*차단/);
});
