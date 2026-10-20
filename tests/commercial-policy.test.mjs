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
  HISTORICAL_PG_POLICY_DOCUMENTS,
  POLICY_METADATA,
  canonicalizePolicyDocument,
  createPolicyConsentEvidence
} from '../src/policy-documents.js';
import {
  PRICING,
  calculateFirstMonthPrice,
  calculateRefund
} from '../src/commercial.js';

test('per-item supply amounts produce exact VAT-inclusive totals', () => {
  assert.equal(PRICING.setupSupplyWon, 0);
  const expected = {
    Standard: { monthlySupplyWon: 4_900, vatWon: 490, totalWon: 5_390 },
    Deluxe: { monthlySupplyWon: 9_900, vatWon: 990, totalWon: 10_890 },
    Premium: { monthlySupplyWon: 34_900, vatWon: 3_490, totalWon: 38_390 }
  };

  for (const [plan, values] of Object.entries(expected)) {
    assert.equal(PRICING.plans[plan], values.monthlySupplyWon);
    assert.deepEqual(calculateFirstMonthPrice(plan), {
      setupSupplyWon: 0,
      monthlySupplyWon: values.monthlySupplyWon,
      supplyTotalWon: values.monthlySupplyWon,
      vatWon: values.vatWon,
      totalWon: values.totalWon
    });
  }
});

test('refund stages use the confirmed formula and round the final result half-up to whole won', () => {
  // Historical order snapshot: refunds must not be repriced from today's catalog.
  const standard = {totalWon: 273_900};
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

test('bank policy metadata binds current consent evidence and permits bank orders only', () => {
  assert.equal(POLICY_METADATA.versionDate, '2026-10-21');
  assert.equal(POLICY_METADATA.effectiveState, 'effective-bank-transfer-service');
  assert.equal(POLICY_METADATA.checkoutEligible, true);
  assert.equal(POLICY_METADATA.paymentLive, true);
  assert.deepEqual(Object.keys(POLICY_METADATA.documents).sort(), ['privacy', 'refund', 'terms']);

  for (const [kind, document] of Object.entries(POLICY_DOCUMENTS)) {
    const digest = createHash('sha256').update(canonicalizePolicyDocument(document)).digest('hex');
    assert.equal(POLICY_METADATA.documents[kind].canonicalSha256, digest);
    assert.equal(POLICY_METADATA.documents[kind].versionDate, POLICY_METADATA.versionDate);
  }
});

test('current privacy describes bank transfer and Supabase processing and persisted anonymous identity without expanding authority', () => {
  const section = title => POLICY_DOCUMENTS.privacy.sections.find(([heading]) => heading === title).slice(1).join(' ');
  assert.match(section('개인정보 처리방침'), /주문.*입금 확인/);
  assert.doesNotMatch(canonicalizePolicyDocument(POLICY_DOCUMENTS.privacy), /Railway/);
  assert.match(section('신청 처리 목적과 항목'), /익명 사용자 식별자/);
  const flow = section('현재 처리 흐름과 외부 서비스');
  assert.match(flow, /Supabase.*익명 인증.*데이터베이스.*API/);
  assert.match(flow, /데이터베이스.*서울/);
  assert.match(flow, /API.*국외 서버/);
  assert.match(flow, /운영자가 직접 검토/);
  assert.doesNotMatch(JSON.stringify(POLICY_DOCUMENTS), /PortOne|PG|Telegram|ElevenLabs|Hermes/);
  assert.match(section('위탁·제3자 제공 및 국외 처리'), /수령 법인.*처리 국가.*보유 기간.*이용 전에 별도로 안내/);
  const storage = section('안전성 및 브라우저 저장');
  assert.match(storage, /성함.*전화번호.*요청 내용.*localStorage.*URL.*저장하지/);
  assert.match(storage, /익명 인증 세션.*localStorage.*저장/);
  assert.match(storage, /브라우저.*삭제.*접근하지 못/);
  assert.doesNotMatch(storage, /식별자만 sessionStorage/);
  assert.equal(POLICY_METADATA.checkoutEligible, true);
  assert.equal(POLICY_METADATA.paymentLive, true);
});

test('application consent evidence is an exact bounded snapshot of the current policy registry', () => {
  assert.deepEqual(createPolicyConsentEvidence(), {
    schemaVersion: 1,
    effectiveState: 'effective-bank-transfer-service',
    documents: ['terms','privacy','refund'].map(kind => ({kind, ...POLICY_METADATA.documents[kind]}))
  });
  assert.equal('collectedAt' in createPolicyConsentEvidence(), false);
});

test('the 2026-09-22 payment-disabled policy remains byte-identical and separately evidenced', () => {
  const hashes={terms:'62b6587c8267a0cc108ae58754c1406ee600f8e5a736527fbda313a825c169af',privacy:'21bef12f8afb99e0837f41f9ced44b35d3d8e2853a82379bdea61a7b3055bc45',refund:'337bca0be7f4246fee9e0062a1723cf1df83dc41dd5cc69b9bc2fea6923da49e'};
  for(const [kind,document] of Object.entries(HISTORICAL_PAYMENT_DISABLED_POLICY_DOCUMENTS)) assert.equal(createHash('sha256').update(canonicalizePolicyDocument(document)).digest('hex'),hashes[kind]);
  assert.deepEqual(HISTORICAL_PAYMENT_DISABLED_POLICY_EVIDENCE,{schemaVersion:1,effectiveState:'effective-current-service-payment-disabled',documents:['terms','privacy','refund'].map(kind=>({kind,versionDate:'2026-09-22',canonicalSha256:hashes[kind]}))});
});

test('historical PG terms retain their original provider, authority and refund facts', () => {
  const terms = canonicalizePolicyDocument(HISTORICAL_PG_POLICY_DOCUMENTS.terms);
  const privacy = canonicalizePolicyDocument(HISTORICAL_PG_POLICY_DOCUMENTS.privacy);
  const refund = canonicalizePolicyDocument(HISTORICAL_PG_POLICY_DOCUMENTS.refund);

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

  for (const text of ['Supabase','PortOne V2','KG이니시스','NHN KCP','OpenAI/Codex', 'Hermes', 'ElevenLabs', 'Telegram', '고객 전용 비공개 저장소']) assert.match(privacy, new RegExp(text));
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
  assert.doesNotMatch(application, /파이프라인 설치 비용|100,000₩/);
  assert.match(application, /파이프라인 가이드라인.*최대 2회/);
  assert.match(application, /개별 콘텐츠.*수정.*아닙니다/);
  for (const [href, label] of [['/terms', '이용약관'], ['/privacy', '개인정보처리방침'], ['/refund', '환불 정책']]) {
    assert.match(application, new RegExp(`href="${href}"[^>]*>${label}`));
    assert.match(renderFooter(), new RegExp(`href="${href}"`));
  }
  assert.doesNotMatch(application, /200,000₩/);
});

test('rendered policies identify bank effective date and exact document hashes', () => {
  for (const kind of ['terms', 'privacy', 'refund']) {
    const html = renderPolicy(kind);
    assert.ok(html.includes(`시행일 ${'2026.10.21'} · 버전 ${'2026.10.21'} · 계좌이체 · 운영자 입금 확인`));
    assert.match(html, /신규 계좌이체 주문.*기존 주문.*당시 동의한 정책/);
    assert.doesNotMatch(html, /확정된 것으로 안내하지 않습니다/);
    assert.match(html, /data-effective-state="effective-bank-transfer-service"/);
    assert.match(html, /data-checkout-eligible="true"/);
    assert.match(html, /data-payment-live="true"/);
    assert.match(html, new RegExp(`data-policy-hash="${POLICY_METADATA.documents[kind].canonicalSha256}"`));
  }
});

test('tracked display sources contain no stale setup fee or old totals and landing pricing omits setup charge', async () => {
  const files = ['../src/app.js', '../src/application.js', '../src/order.js', '../src/policy-documents.js', '../README.md'];
  const sources = await Promise.all(files.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  const combined = sources.join('\n');
  assert.doesNotMatch(combined, /200,000|383,900|878,900|1,318,900|349,000/);
  assert.doesNotMatch(sources[0], /초기 설치비 100,000원|설치 비용 미포함/);
});

test('bank policy does not claim automatic authority or unconditional provider deletion', () => {
  const source=[renderApplication(),...['terms','privacy','refund'].map(renderPolicy)].join('\n');
  for(const forbidden of [/결제에 사용할 수 있도록 확정·시행/,/결제만으로[^.]*고객 구속력 있는 계약 확정[^.]*생기지/,/콘텐츠 아티팩트는 계약 종료일부터 7일 이내 삭제합니다/]) assert.doesNotMatch(source,forbidden);
  assert.match(source,/checkout-eligible="true"/);
  assert.match(source,/신규 계좌이체 주문/);
});
