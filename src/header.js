export function renderSiteHeader({ active = '' } = {}) {
  return `<header class="landing-header"><nav class="landing-nav" aria-label="메인 메뉴">
    <a class="landing-brand" href="/" data-link aria-label="CJY 메인"><img src="/assets/landing-figma/97a22fbb-2af1-4e20-91c8-5d377452b376.svg" alt="CJY" width="73" height="31" /></a>
    <button class="landing-product-trigger" type="button" aria-expanded="false" aria-controls="landing-product-panel">Product</button>
    <a href="/order" data-link${active === 'order' ? ' aria-current="page"' : ''}>Order</a>
  </nav><div class="landing-product-panel" id="landing-product-panel" inert><div class="landing-product-panel-inner">
    <div class="landing-product-panel-content">
      <p class="landing-product-label">제품 살펴보기</p>
      <ul class="landing-product-submenu" aria-label="Product 하위 메뉴">
        <li><a href="/" data-link>컨텐츠 제작 솔루션</a></li>
        <li><a href="/cinematic" data-link>시네마틱 광고</a></li>
      </ul>
    </div>
  </div></div></header><div class="landing-menu-backdrop" aria-hidden="true"></div>`;
}

export function bindSiteHeader(root) {
  const header = root.querySelector('.landing-header');
  const trigger = header?.querySelector('.landing-product-trigger');
  const panel = header?.querySelector('.landing-product-panel');
  if (!trigger || !panel) return () => {};
  const setOpen = (open) => {
    header.classList.toggle('is-product-open', open);
    trigger.setAttribute('aria-expanded', String(open));
    panel.inert = !open;
  };
  const toggle = () => setOpen(trigger.getAttribute('aria-expanded') !== 'true');
  const openOnHover = (event) => {
    if (event.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) setOpen(true);
  };
  const closeOnLeave = (event) => {
    if (event.pointerType === 'mouse' && !header.contains(document.activeElement)) setOpen(false);
  };
  const closeOutside = (event) => {
    if (!header.contains(event.target)) setOpen(false);
  };
  const closeEscape = (event) => {
    if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      trigger.focus();
    }
  };
  trigger.addEventListener('click', toggle);
  trigger.addEventListener('pointerenter', openOnHover);
  header.addEventListener('pointerleave', closeOnLeave);
  document.addEventListener('click', closeOutside);
  document.addEventListener('keydown', closeEscape);
  return () => {
    trigger.removeEventListener('click', toggle);
    trigger.removeEventListener('pointerenter', openOnHover);
    header.removeEventListener('pointerleave', closeOnLeave);
    document.removeEventListener('click', closeOutside);
    document.removeEventListener('keydown', closeEscape);
  };
}
