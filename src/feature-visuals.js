// Interactive elements use the same proportional geometry as the Figma artwork.
// Each visible circle/card is itself a button; there are no transparent hit layers.
export const FEATURE_VISUALS = {
  team: `<div class="figma-scene team-scene" style="aspect-ratio:720/557">
    <div class="team-surface">
      <div class="role-controls" role="group" aria-label="에이전트 역할 선택">
        <button type="button" class="role-dot" style="--dot:#4A8EFB" aria-label="기획 전문가" aria-pressed="true"></button>
        <button type="button" class="role-dot" style="--dot:#FB4A4D" aria-label="카피라이터" aria-pressed="false"></button>
        <button type="button" class="role-dot" style="--dot:#61FB4A" aria-label="디자인 전문가" aria-pressed="false"></button>
        <button type="button" class="role-dot" style="--dot:#FB994A" aria-label="영상 편집 전문가" aria-pressed="false"></button>
      </div>
      <div class="team-description">
        <p data-node-id="215:929" class="team-role-title">기획 전문가</p>
        <div data-node-id="215:933" class="team-role-copy"><p>고객의 요구조건을 정확하게 이해하고</p><p>그에 맞는 컨텐츠를 기획합니다</p></div>
      </div>
    </div>
    <span class="visually-hidden" role="status"></span>
  </div>`,
  consistency: `<div class="figma-scene consistency-scene" style="aspect-ratio:720/557" role="group" aria-label="콘텐츠 카드 슬라이더">
    ${['브랜드 스토리', '제품 소개', '정보형 콘텐츠', '고객 후기', '캠페인 콘텐츠'].map((name, i) => `<button type="button" class="content-carousel-card" style="left:${-17.083333 + i * 27.5}cqw" aria-label="${name} 카드 선택" aria-pressed="${i === 2}"></button>`).join('')}
  </div>`
};
