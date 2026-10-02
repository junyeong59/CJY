import test from 'node:test';import assert from 'node:assert/strict';import * as order from '../src/order.js';
test('monthly readonly recovery surface is retired; no password recovery input',()=>{
 const html=order.renderOrderLookup();assert.doesNotMatch(html,/data-monthly-recover|읽기 전용 코드|type="password"/);
 assert.equal(order.monthlyReadOnlyOrders,undefined);
});
test('monthly order status displays server counts only and escapes date text',()=>{
 assert.equal(typeof order.monthlyProgress,'function','monthly order renderer missing');
 assert.equal(order.monthlyProgress(null),'');
 const out=order.monthlyProgress({state:'confirmed',provided:1,promised:28,startDate:'2027-01-31',endDateExclusive:'2027-02-28',timezone:'Asia/Seoul'});
 assert.match(out,/1 \/ 28/);assert.match(out,/2027-02-28/);assert.match(out,/종료일 미포함/);
 assert.ok(!order.monthlyProgress({state:'confirmed',provided:0,promised:28,startDate:'<script>',endDateExclusive:'x'}).includes('<script>'));
});
