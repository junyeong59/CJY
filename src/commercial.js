export const PRICING = Object.freeze({
  setupSupplyWon: 0,
  vatRatePercent: 10,
  plans: Object.freeze({
    Standard: 4_900,
    Deluxe: 9_900,
    Premium: 34_900
  })
});

export const MAX_ORDER_QUANTITY = 30;
export function validateQuantity(quantity = 1) {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) throw new RangeError('Quantity must be an integer from 1 to 30');
  return quantity;
}

// Legacy function/field names retained for caller compatibility; quantity is item count.
export function calculateFirstMonthPrice(plan, quantity = 1) {
  validateQuantity(quantity);
  const unitSupplyWon = PRICING.plans[plan];
  if (!Number.isInteger(unitSupplyWon)) throw new RangeError(`Unknown plan: ${plan}`);
  const monthlySupplyWon = unitSupplyWon * quantity;
  const supplyTotalWon = PRICING.setupSupplyWon + monthlySupplyWon;
  const vatWon = Math.round(supplyTotalWon * PRICING.vatRatePercent / 100);
  return {
    setupSupplyWon: PRICING.setupSupplyWon,
    monthlySupplyWon,
    supplyTotalWon,
    vatWon,
    totalWon: supplyTotalWon + vatWon
  };
}

const roundRatioHalfUp = (numerator, denominator) =>
  Math.floor((numerator + Math.floor(denominator / 2)) / denominator);

export function calculateRefund({
  stage,
  vatInclusiveTotalWon,
  vatInclusiveMonthlyWon,
  promisedItemCount,
  deliveredItemCount
}) {
  for (const [name, value] of Object.entries({vatInclusiveTotalWon, vatInclusiveMonthlyWon, promisedItemCount, deliveredItemCount})) {
    if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  if (promisedItemCount < 1) throw new RangeError('promisedItemCount must be at least 1');
  if (deliveredItemCount > promisedItemCount) throw new RangeError('deliveredItemCount cannot exceed promisedItemCount');

  if (stage === 'before-installation') return vatInclusiveTotalWon;
  if (stage === 'consultation') return roundRatioHalfUp(vatInclusiveTotalWon, 2);
  if (stage !== 'service-active') throw new RangeError(`Unknown refund stage: ${stage}`);

  const numerator = vatInclusiveTotalWon * promisedItemCount
    - 2 * vatInclusiveMonthlyWon * deliveredItemCount;
  return numerator <= 0 ? 0 : roundRatioHalfUp(numerator, 2 * promisedItemCount);
}
