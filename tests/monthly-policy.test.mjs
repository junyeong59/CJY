import test from 'node:test';
import assert from 'node:assert/strict';
import {renderDirectApplication} from '../src/direct-application.js';

test('customer copy makes Pilot operator-only and all product plans daily for one calendar month', () => {
  const html = renderDirectApplication();
  assert.match(html, /첫 Pilot은 운영자 최준영에게만 전달하며 고객에게 자동 전달하지 않습니다/);
  assert.match(html, /Standard·Deluxe·Premium 모든 상품은[^<]*한 달간[^<]*매일 영상 1개/);
  assert.match(html, /약정 수량은 시작일·종료일에 따라 계약 시 확정/);
  assert.doesNotMatch(html, /한 달[^<]*30개|상품별[^<]*주 [1-7]회/);
});
