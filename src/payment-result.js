// A closed checkout window is not a payment refund. Unknown PG codes stay failures.
export function classifyPaymentResult(result={}) {
 const safe=value=>typeof value==='string'&&/^[A-Z0-9_:-]{1,64}$/.test(value)?value:null;
 return {phase:result?.code==='FAILURE_TYPE_STOPPED'?'cancelled':result?.code?'failed':'unverified',sdkCode:safe(result?.code),pgCode:safe(result?.pgCode)};
}
