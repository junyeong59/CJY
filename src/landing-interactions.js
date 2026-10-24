import { bindHeroGradient } from './hero-gradient.js';
const roles = [
  ['기획 전문가', '고객의 요구조건을 정확하게 이해하고', '그에 맞는 컨텐츠를 기획합니다'],
  ['카피라이터', '브랜드의 말투와 고객의 관심사를 담아', '끝까지 읽고 싶은 문장을 만듭니다'],
  ['디자인 전문가', '브랜드의 색상과 분위기를 일관되게 담아', '눈길을 끄는 이미지로 완성합니다'],
  ['영상 편집 전문가', '장면과 자막, 사운드의 흐름을 다듬어', '몰입감 있는 릴스를 제작합니다']
];

export function bindLandingInteractions(root) {
  const disposers = [];
  const disposeGradient = bindHeroGradient(root);
  if (disposeGradient) disposers.push(disposeGradient);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const team = root.querySelector('.team-scene');
  if (team) {
    team.removeAttribute('aria-hidden');
    team.closest('.feature-art').removeAttribute('aria-hidden');
    const title = team.querySelector('[data-node-id="215:929"]');
    const copy = team.querySelector('[data-node-id="215:933"]');
    const group = team.querySelector('.role-controls');
    const status = team.querySelector('[role="status"]');
    roles.forEach(([name, line1, line2], index) => {
      const button = group.children[index];
      button.setAttribute('aria-label', name);
      button.setAttribute('aria-pressed', String(index === 0));
      button.title = name;
      button.addEventListener('click', () => {
        group.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
        title.textContent = name;
        copy.replaceChildren(...[line1, line2].map(text => {
          const p = document.createElement('p');
          p.textContent = text;
          p.style.cssText = 'margin:0;line-height:4.444444cqw';
          return p;
        }));
        status.textContent = `${name}. ${line1} ${line2}`;
        if (!reduced.matches) [title, copy].forEach(el => el.animate([{opacity:0, transform:'translateY(4px)'}, {opacity:1, transform:'translateY(0)'}], {duration:220,easing:'ease-out'}));
      });
    });
  }

  const typing = root.querySelector('[data-node-id="215:941"]');
  if (typing) {
    const original = typing.textContent;
    const sentences = [original, 'AI 영상을 이용해서 병원 마케팅 영상을 만들어줘', '흥미로운 건축 이야기를 담은 바이럴 릴스 만들어줘'];
    let timer, visible = false, sentence = 0, length = original.length, deleting = true;
    const scene = typing.parentElement;
    const parent = scene.querySelector('[data-node-id="215:939"]');
    parent.classList.add('request-capsule');
    typing.style.cssText = 'margin:0;font-weight:600;line-height:1.2';
    parent.append(typing);
    const label = document.createElement('span');
    label.className = 'visually-hidden';
    label.textContent = sentences.join('. ');
    parent.after(label);
    typing.classList.add('typing-request');
    const tick = () => {
      if (!visible || document.hidden || reduced.matches) return;
      if (deleting) {
        length--;
        if (length <= 0) { sentence = (sentence + 1) % sentences.length; length = 0; deleting = false; }
      } else {
        length++;
        if (length >= sentences[sentence].length) deleting = true;
      }
      typing.textContent = sentences[sentence].slice(0, length) || '\u00a0';
      typing.classList.toggle('typing-request--entered', sentence !== 0);
      timer = setTimeout(tick, deleting && length === sentences[sentence].length ? 2600 : deleting ? 30 : 75);
    };
    const sync = () => {
      clearTimeout(timer);
      if (reduced.matches) { typing.textContent = original; typing.classList.remove('typing-request--entered'); return; }
      if (visible && !document.hidden) timer = setTimeout(tick, 1800);
    };
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
    observer.observe(parent);
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    disposers.push(() => { clearTimeout(timer); observer.disconnect(); document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); });
  }

  const carousel = root.querySelector('.consistency-scene');
  if (carousel) {
    carousel.removeAttribute('aria-hidden');
    carousel.closest('.feature-art').removeAttribute('aria-hidden');
    const cards = [...carousel.querySelectorAll('.content-carousel-card')];
    const names = ['브랜드 스토리', '제품 소개', '정보형 콘텐츠', '고객 후기', '캠페인 콘텐츠'];
    let active = 2, startX, suppressClick = false, moving = false, settleTimer;
    const rendered = cards.flatMap((card, index) => {
      const copies = [-1, 1].map(cycle => {
        const copy = document.createElement('div');
        copy.className = 'content-carousel-card';
        copy.setAttribute('aria-hidden', 'true');
        copy.style.pointerEvents = 'none';
        carousel.append(copy);
        return { element: copy, index, cycle };
      });
      return [{ element: card, index, cycle: 0 }, ...copies];
    });
    const offset = index => ((index - active + 7) % 5) - 2;
    function settle() {
      clearTimeout(settleTimer);
      rendered.forEach(({element, index, cycle}) => {
        element.style.transition = 'none';
        element.style.left = `${37.916667 + (offset(index) + cycle * 5) * 27.5}cqw`;
        element.style.background = index === active ? '#fff' : '#d0d0d0';
        element.style.opacity = index === active ? '1' : '.8';
      });
      void carousel.offsetWidth;
      rendered.forEach(({element}) => { element.style.transition = ''; });
      moving = false;
    }
    cards.forEach((card, index) => {
      const button = card;
      button.setAttribute('aria-label', `${names[index]} 카드 선택`);
      button.addEventListener('click', () => {
        if (suppressClick) { suppressClick = false; return; }
        select(index);
      });
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        select(event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (active + (event.key === 'ArrowRight' ? 1 : 4)) % 5);
        cards[active].focus();
      });
    });
    function select(index) {
      if (moving || index === active) return;
      const direction = offset(index);
      rendered.forEach(({element, index: cardIndex, cycle}) => {
        // Every copy travels the same distance. Wrapping happens outside the
        // clipped viewport only after the movement has finished.
        element.style.left = `${37.916667 + (offset(cardIndex) + cycle * 5 - direction) * 27.5}cqw`;
        element.style.background = cardIndex === index ? '#fff' : '#d0d0d0';
        element.style.opacity = cardIndex === index ? '1' : '.8';
      });
      active = index;
      cards.forEach((card, i) => card.setAttribute('aria-pressed', String(i === active)));
      moving = true;
      if (reduced.matches) settle();
      else settleTimer = setTimeout(settle, 470);
    }
    const down = event => { startX = event.clientX; };
    const up = event => {
      if (startX != null && Math.abs(event.clientX - startX) > 35) {
        suppressClick = true;
        select((active + (event.clientX < startX ? 1 : 4)) % 5);
      }
      startX = null;
    };
    carousel.addEventListener('pointerdown', down);
    carousel.addEventListener('pointerup', up);
    settle();
    disposers.push(() => { clearTimeout(settleTimer); carousel.removeEventListener('pointerdown', down); carousel.removeEventListener('pointerup', up); });
  }
  return () => disposers.forEach(dispose => dispose());
}
