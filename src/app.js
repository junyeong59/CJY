import { SITE_CONFIG } from "./config.js";

const app = document.querySelector("#app");

const pages = {
  "/": {
    title: "CJY",
    description: "CJY developer website.",
    render: renderHome
  },
  "/portfolio": {
    title: "Portfolio | CJY",
    description: "CJY portfolio.",
    render: renderPortfolio
  },
  "/contact": {
    title: "Contact | CJY",
    description: "Contact CJY.",
    render: renderContact
  },
  "/musicnow": {
    title: "Music Now | CJY",
    description: "Music Now privacy, terms, and support.",
    render: renderMusicNow
  },
  "/musicnow/privacy": {
    title: "Privacy | Music Now",
    description: "Music Now privacy policy.",
    render: () => renderLegalPage(legalPages.privacy)
  },
  "/musicnow/terms": {
    title: "Terms | Music Now",
    description: "Music Now terms of service.",
    render: () => renderLegalPage(legalPages.terms)
  },
  "/musicnow/support": {
    title: "Support | Music Now",
    description: "Music Now support.",
    render: () => renderSupportPage()
  }
};

const legalPages = {
  privacy: {
    title: "Privacy",
    sections: [
      {
        heading: "개인정보처리방침",
        body: [
          `${SITE_CONFIG.musicNowName}는 사용자가 초대 링크를 열고 그룹에 참여할 수 있도록 필요한 범위의 정보만 처리합니다.`,
          "수집 항목은 앱 사용 방식에 따라 그룹 코드, 초대 링크 정보, 기기 및 앱 버전, 오류 로그, 사용자가 지원 요청 시 제공하는 이메일 주소와 문의 내용이 포함될 수 있습니다."
        ]
      },
      {
        heading: "이용 목적",
        body: [
          "초대 링크 연결, 그룹 참여 흐름 제공, 앱 안정성 개선, 부정 사용 방지, 고객 지원 응답을 위해 정보를 사용합니다."
        ]
      },
      {
        heading: "보관 및 삭제",
        body: [
          "지원 요청 정보는 문의 처리와 분쟁 대응에 필요한 기간 동안 보관한 뒤 삭제합니다. 사용자는 언제든지 지원 이메일로 개인정보 열람, 정정, 삭제를 요청할 수 있습니다."
        ]
      },
      {
        heading: "제3자 제공",
        body: [
          "법령상 요구되거나 서비스 운영에 필요한 인프라 제공업체를 이용하는 경우를 제외하고 개인정보를 판매하거나 임의로 공유하지 않습니다."
        ]
      },
      {
        heading: "문의",
        body: [
          `개인정보 관련 문의는 ${SITE_CONFIG.supportEmail} 로 연락해 주세요.`
        ]
      }
    ]
  },
  terms: {
    title: "Terms",
    sections: [
      {
        heading: "이용약관",
        body: [
          `${SITE_CONFIG.musicNowName}를 사용하면 본 약관에 동의한 것으로 봅니다. 서비스는 음악 취향 공유와 그룹 참여를 돕기 위해 제공됩니다.`
        ]
      },
      {
        heading: "사용자 책임",
        body: [
          "사용자는 타인의 권리를 침해하거나 서비스 운영을 방해하는 방식으로 앱을 사용할 수 없습니다. 초대 코드는 허가받은 사람에게만 공유해야 합니다."
        ]
      },
      {
        heading: "서비스 변경",
        body: [
          "기능, 운영 방식, 제공 범위는 개선을 위해 변경될 수 있습니다. 중요한 변경 사항은 가능한 방식으로 안내합니다."
        ]
      },
      {
        heading: "면책",
        body: [
          "서비스는 안정적인 제공을 위해 노력하지만, 네트워크 상태나 외부 플랫폼 정책 변경 등으로 일부 기능이 제한될 수 있습니다."
        ]
      },
      {
        heading: "문의",
        body: [
          `약관 관련 문의는 ${SITE_CONFIG.supportEmail} 로 연락해 주세요.`
        ]
      }
    ]
  }
};

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

function getCurrentRoute() {
  const pathname = normalizePath(window.location.pathname);
  const inviteMatch = pathname.match(/^\/musicnow\/join\/([^/]+)$/);

  if (inviteMatch) {
    const code = safeDecode(inviteMatch[1]).trim() || "MN-ABC123";
    return {
      title: `Music Now Invite | ${code}`,
      description: `Music Now 그룹 코드 ${code}`,
      render: () => renderInvitePage(code)
    };
  }

  return pages[pathname] ?? {
    title: "Not Found | CJY",
    description: "The requested page could not be found.",
    render: renderNotFound
  };
}

function renderApp() {
  const route = getCurrentRoute();
  document.title = route.title;
  updateMeta("description", route.description);
  updateMeta("og:title", route.title, "property");
  updateMeta("og:description", route.description, "property");
  updateMeta("og:url", `${SITE_CONFIG.siteUrl}${normalizePath(window.location.pathname)}`, "property");
  app.innerHTML = route.render();
  document.body.dataset.route = normalizePath(window.location.pathname).startsWith("/musicnow/join/")
    ? "invite"
    : normalizePath(window.location.pathname);
  window.scrollTo({ top: 0, behavior: "auto" });
}

function updateMeta(name, content, attr = "name") {
  const tag = document.querySelector(`meta[${attr}="${name}"]`);
  if (tag) tag.setAttribute("content", content);
}

function renderHome() {
  return `
    <main class="site-shell site-shell--black">
      <section class="screen home-screen" aria-labelledby="home-title">
        <h1 id="home-title" class="cjy-mark cjy-mark--home" aria-label="CJY">
          <img class="cjy-mark__image" src="/component/CJY.svg" alt="" />
        </h1>
        <nav class="home-menu" aria-label="Primary">
          ${renderNavLink("/portfolio", "Portfolio", "light")}
          ${renderNavLink("/contact", "Contact", "light")}
        </nav>
      </section>
    </main>
  `;
}

function renderPortfolio() {
  return `
    <main class="site-shell">
      <section class="screen list-screen" aria-labelledby="portfolio-title">
        ${renderHeader("Portfolio", "portfolio-title")}
        <div class="list-menu" role="list">
          ${renderNavLink("/musicnow", renderMusicNowWordmark(), "dark", true)}
        </div>
      </section>
    </main>
  `;
}

function renderContact() {
  return `
    <main class="site-shell">
      <section class="screen list-screen" aria-labelledby="contact-title">
        ${renderHeader("Contact", "contact-title")}
        <div class="list-menu contact-menu" role="list">
          <a class="row-link contact-link" href="${SITE_CONFIG.instagramUrl}" rel="noreferrer" target="_blank" role="listitem">
            <span>Instagram</span>
          </a>
          <button class="row-link contact-link contact-copy" type="button" data-copy="${SITE_CONFIG.contactEmail}" data-copy-label="Copy email ${SITE_CONFIG.contactEmail}" data-copied-label="Copied email" aria-label="Copy email ${SITE_CONFIG.contactEmail}" role="listitem">
            <span>Email</span>
          </button>
        </div>
      </section>
    </main>
  `;
}

function renderMusicNow() {
  return `
    <main class="site-shell">
      <section class="screen list-screen musicnow-screen" aria-labelledby="musicnow-title">
        <header class="page-header">
          ${renderMusicNowLogo("musicnow-title", "musicnow-logo--large")}
        </header>
        <div class="list-menu" role="list">
          ${renderNavLink("/musicnow/privacy", "Privacy")}
          ${renderNavLink("/musicnow/terms", "Terms")}
          ${renderNavLink("/musicnow/support", "Support")}
        </div>
      </section>
    </main>
  `;
}

function renderListPage({ title, links }) {
  return `
    <main class="site-shell">
      <section class="screen list-screen" aria-labelledby="${slugify(title)}-title">
        ${renderHeader(title, `${slugify(title)}-title`)}
        <div class="list-menu" role="list">
          ${links.map((item) => renderNavLink(item.href, item.label)).join("")}
        </div>
      </section>
    </main>
  `;
}

function renderHeader(title, id) {
  return `
    <header class="page-header">
      <h1 id="${id}" class="page-title">${escapeHtml(title)}</h1>
    </header>
  `;
}

function renderLegalPage(page) {
  return `
    <main class="site-shell">
      <article class="screen legal-screen" aria-labelledby="${slugify(page.title)}-title">
        ${renderHeader(page.title, `${slugify(page.title)}-title`)}
        <div class="legal-content">
          <p class="updated">Last updated ${SITE_CONFIG.lastUpdated}</p>
          ${page.sections.map(renderLegalSection).join("")}
        </div>
      </article>
    </main>
  `;
}

function renderLegalSection(section) {
  return `
    <section class="policy-section">
      <h2>${escapeHtml(section.heading)}</h2>
      ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
    </section>
  `;
}

function renderSupportPage() {
  return `
    <main class="site-shell">
      <article class="screen legal-screen support-screen" aria-labelledby="support-title">
        ${renderHeader("Support", "support-title")}
        <div class="legal-content">
          <p class="updated">Last updated ${SITE_CONFIG.lastUpdated}</p>
          <section class="policy-section">
            <h2>Music Now 지원</h2>
            <p>앱 사용 중 문제가 있거나 초대 링크, 그룹 코드, 계정 관련 도움이 필요하면 아래 이메일로 문의해 주세요.</p>
          </section>
          <a class="support-card" href="mailto:${SITE_CONFIG.supportEmail}">
            <span class="support-card__label">Email</span>
            <span class="support-card__value">${SITE_CONFIG.supportEmail}</span>
          </a>
          <section class="policy-section">
            <h2>문의 시 포함하면 좋은 내용</h2>
            <p>사용 중인 기기, iOS 버전, 앱 버전, 발생한 화면, 가능하다면 그룹 코드를 함께 알려주시면 더 빠르게 확인할 수 있습니다.</p>
          </section>
        </div>
      </article>
    </main>
  `;
}

function renderInvitePage(rawCode) {
  const code = sanitizeInviteCode(rawCode);

  return `
    <main class="site-shell">
      <section class="screen invite-screen" aria-labelledby="invite-title">
        ${renderMusicNowLogo("invite-logo", "musicnow-logo--invite")}
        <h1 id="invite-title" class="invite-title">
          <span class="invite-title__text">친구가 당신을 초대했어요!</span>
          <span class="fireworks" aria-hidden="true">
            <span class="firework firework--one"></span>
            <span class="firework firework--two"></span>
            <span class="firework firework--three"></span>
          </span>
        </h1>
        <button class="invite-code-card" type="button" data-copy="${escapeHtml(code)}" data-copy-label="Copy group code ${escapeHtml(code)}" data-copied-label="Copied group code" aria-label="Copy group code ${escapeHtml(code)}">
          <span class="invite-code">${escapeHtml(code)}</span>
          <img class="copy-icon" src="/component/Copy.svg" alt="" aria-hidden="true" />
        </button>
        <p class="invite-instruction">
          <span class="tone-red">앱을 설치한 뒤</span>
          <span class="tone-yellow">그룹 코드를 입력해</span>
          <span class="tone-blue">참여하세요</span>
        </p>
        <a class="app-store-button" href="${SITE_CONFIG.appStoreUrl}" aria-label="Download Music Now on the App Store">
          <span>Download on the</span>
          <strong>App Store</strong>
        </a>
      </section>
    </main>
  `;
}

function renderNotFound() {
  return renderListPage({
    title: "404",
    links: [
      { href: "/", label: "Home" },
      { href: "/musicnow", label: "Music Now" }
    ]
  });
}

function renderNavLink(href, label, tone = "dark", allowHtml = false) {
  return `
    <a class="row-link row-link--${tone}" href="${href}" data-link role="listitem">
      <span>${allowHtml ? label : escapeHtml(label)}</span>
      <span class="chevron" aria-hidden="true"></span>
    </a>
  `;
}

function renderMusicNowLogo(id, className = "") {
  return `
    <h1 id="${id}" class="musicnow-logo ${className}" aria-label="Music Now">
      ${renderMusicNowWordmark()}
    </h1>
  `;
}

function renderMusicNowWordmark() {
  return `<span>Music </span><span class="tone-red">N</span><span class="tone-yellow">o</span><span class="tone-blue">w</span>`;
}

function navigateTo(pathname) {
  window.history.pushState({}, "", pathname);
  renderApp();
}

app.addEventListener("click", async (event) => {
  const link = event.target.closest("a[data-link]");
  if (link && link.origin === window.location.origin) {
    event.preventDefault();
    navigateTo(link.pathname);
    return;
  }

  const copyButton = event.target.closest("[data-copy]");
  if (copyButton) {
    const value = copyButton.dataset.copy;
    const defaultLabel = copyButton.dataset.copyLabel || `Copy ${value}`;
    const copiedLabel = copyButton.dataset.copiedLabel || `Copied ${value}`;
    await copyText(value);
    copyButton.classList.add("is-copied");
    copyButton.setAttribute("aria-label", copiedLabel);
    window.setTimeout(() => {
      copyButton.classList.remove("is-copied");
      copyButton.setAttribute("aria-label", defaultLabel);
    }, 1500);
  }
});

window.addEventListener("popstate", renderApp);
renderApp();

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back to the legacy copy path below.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function sanitizeInviteCode(value) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24) || "MN-ABC123";
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugify(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
