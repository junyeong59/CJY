export function renderSiteHeader({ active = '' } = {}) {
  return `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴">
    <a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/component/CJY.svg" alt="CJY" width="73" height="31" /></a>
    <a href="/#product" data-link>Product</a>
    <a href="/#pricing" data-link>Pricing</a>
    <a href="/order" data-link${active === 'order' ? ' aria-current="page"' : ''}>Order</a>
  </nav></header>`;
}
