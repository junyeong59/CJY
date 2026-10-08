import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDirectApplication} from '../src/direct-application.js';

test('manual customer review preserves every plan daily for one calendar month', () => {
  const html = renderDirectApplication();
  assert.match(html, /접수·결제 확인 후 운영자 최준영이 직접 검토/);
  assert.match(html, /결제만으로 고객 연결·제작·전달·게시를 시작하지 않습니다/);
  assert.doesNotMatch(html, /첫 Pilot[^<]*제작|첫 Pilot[^<]*전달/);
  assert.match(html, /Standard·Deluxe·Premium 모든 상품은[^<]*한 달간[^<]*매일 영상 1개/);
  assert.match(html, /약정 수량은 시작일·종료일에 따라 계약 시 확정/);
  assert.doesNotMatch(html, /한 달[^<]*30개|상품별[^<]*주 [1-7]회/);
});
