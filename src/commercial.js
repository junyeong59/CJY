export const PRICING = Object.freeze({
  setupSupplyWon: 100_000,
  vatRatePercent: 10,
  plans: Object.freeze({
    Standard: 149_000,
    Deluxe: 599_000,
    Premium: 999_000
  })
});

export function calculateFirstMonthPrice(plan) {
  const monthlySupplyWon = PRICING.plans[plan];
  if (!Number.isInteger(monthlySupplyWon)) throw new RangeError(`Unknown plan: ${plan}`);
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
