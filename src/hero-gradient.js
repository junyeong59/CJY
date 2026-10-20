import { HERO_GRADIENT_COLORS as colors } from './hero-gradient-colors.js';

export function bindHeroGradient(root) {
  const card = root.querySelector('.hero-examples');
  if (!card) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-gradient';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = 120;
  canvas.height = 230;
  const context = canvas.getContext('2d', {alpha:false});
  if (!context) return;
  card.querySelector('img')?.replaceWith(canvas);
  const frame = context.createImageData(canvas.width, canvas.height);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true, raf, last = 0, elapsed = 0;
  const pointer = { x: .5, y: .5, strength: 0, targetX: .5, targetY: .5, targetStrength: 0 };
  const move = event => {
    if (event.pointerType === 'touch') return;
    const rect = card.getBoundingClientRect();
    pointer.targetX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    pointer.targetY = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    pointer.targetStrength = 1;
  };
  const leave = () => { pointer.targetStrength = 0; };
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerleave', leave);
  card.addEventListener('pointercancel', leave);
  const clamp = value => Math.max(0, Math.min(1, value));
  function draw(time) {
    pointer.x += (pointer.targetX - pointer.x) * .18;
    pointer.y += (pointer.targetY - pointer.y) * .18;
    pointer.strength += (pointer.targetStrength - pointer.strength) * .14;
    const influence = reduced.matches ? 0 : pointer.strength;
    for (let y = 0; y < canvas.height; y++) {
      const v = y / (canvas.height - 1);
      for (let x = 0; x < canvas.width; x++) {
        const u = x / (canvas.width - 1);
        // Local color regions drift independently; the card and canvas stay fixed.
        // At time zero, reproduce the sampled Figma colors and its cover crop.
        const dx = .085 * Math.sin(time * .22 + v * 6) * Math.sin(time * .13);
        const dy = .075 * Math.sin(time * .19 + u * 5) * Math.sin(time * .11);
        const px = u - pointer.x, py = v - pointer.y;
        const falloff = Math.exp(-(px * px + py * py) / .14) * influence;
        // A local swirl and directional pull follow the pointer with easing.
        const pullX = (pointer.x - .5) * .26 - py * .3;
        const pullY = (pointer.y - .5) * .24 + px * .3;
        const sx = clamp(.5 + (u - .5) * .9266 + dx + pullX * falloff) * 16;
        const sy = clamp(v + dy + pullY * falloff) * 16;
        const x0 = Math.min(15, Math.floor(sx)), y0 = Math.min(15, Math.floor(sy));
        const tx = sx - x0, ty = sy - y0;
        const offset = (y * canvas.width + x) * 4;
        for (let c = 0; c < 3; c++) {
          const top = colors[y0][x0][c] * (1-tx) + colors[y0][x0+1][c] * tx;
          const bottom = colors[y0+1][x0][c] * (1-tx) + colors[y0+1][x0+1][c] * tx;
          frame.data[offset+c] = top * (1-ty) + bottom * ty;
        }
        frame.data[offset+3] = 255;
      }
    }
    context.putImageData(frame, 0, 0);
  }
  function animate(now) {
    if (now - last >= 50) {
      if (last) elapsed += Math.min(now-last, 100) / 1000;
      last = now;
      draw(elapsed);
    }
    raf = requestAnimationFrame(animate);
  }
  function sync() {
    cancelAnimationFrame(raf);
    last = 0;
    if (reduced.matches) draw(0);
    else if (visible && !document.hidden) raf = requestAnimationFrame(animate);
  }
  const observer = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; sync();});
  observer.observe(card);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  draw(0);
  sync();
  return () => {card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave); card.removeEventListener('pointercancel', leave); cancelAnimationFrame(raf); observer.disconnect(); document.removeEventListener('visibilitychange',sync); reduced.removeEventListener('change',sync);};
}
