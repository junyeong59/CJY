import test from 'node:test';import assert from 'node:assert/strict';import * as order from '../src/order.js';
test('monthly recovery and counts renderer are retired from order UI',()=>{
 const html=order.renderOrderLookup();assert.doesNotMatch(html,/data-monthly-recover|읽기 전용 코드|type="password"|제공 완료|월간 서비스/);
 assert.equal(order.monthlyReadOnlyOrders,undefined);
 assert.equal(order.monthlyProgress,undefined);
});
