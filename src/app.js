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
    render: (locale) => renderLegalPage(getLegalPages(locale).privacy, locale)
  },
  "/musicnow/terms": {
    title: "Terms | Music Now",
    description: "Music Now terms of service.",
    render: (locale) => renderLegalPage(getLegalPages(locale).terms, locale)
  },
  "/musicnow/support": {
    title: "Support | Music Now",
    description: "Music Now support.",
    render: (locale) => renderSupportPage(locale)
  }
};

const legalPagesKo = {
  privacy: {
    title: "Privacy",
    sections: [
      {
        heading: "개인정보처리방침",
        body: [
          `${SITE_CONFIG.developerName}(이하 “운영자”)는 ${SITE_CONFIG.musicNowName}(이하 “서비스”) 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 이 방침은 서비스가 어떤 정보를 어떤 목적으로 처리하는지 설명합니다.`,
          `시행일: ${SITE_CONFIG.lastUpdated}`
        ]
      },
      {
        heading: "처리하는 정보와 수집 방법",
        body: [
          "서비스 이용 과정에서 그룹 코드 및 초대 링크 정보가 사용될 수 있습니다. 앱 안정성 확인을 위해 기기 모델, 운영체제 및 앱 버전, 오류 발생 시각과 오류 로그 등 진단 정보가 생성될 수 있습니다.",
          `이메일 문의 시 이용자가 직접 제공한 이메일 주소, 문의 내용 및 첨부자료를 처리합니다. 문의에 불필요한 개인정보나 민감정보는 보내지 마세요.`,
          "운영자는 이용자가 직접 입력하거나 앱 기능을 사용하는 과정, 또는 고객지원 이메일을 보내는 과정에서 위 정보를 수집합니다."
        ]
      },
      {
        heading: "처리 목적",
        body: [
          "정보는 그룹 초대 및 참여 기능 제공, 서비스 오류 확인과 품질 개선, 보안 및 부정 이용 방지, 문의 처리와 이용자 보호를 위해 사용합니다. 운영자는 이 방침에 기재한 목적과 양립할 수 없는 용도로 정보를 이용하지 않습니다."
        ]
      },
      {
        heading: "보유 및 파기",
        body: [
          "서비스 기능 제공을 위해 처리하는 정보는 해당 기능 제공에 필요한 기간 동안만 보유합니다. 고객지원 문의와 답변 기록은 문의 종료 후 3년까지 보관할 수 있으며, 법령에 별도 보존 의무가 있으면 그 기간을 따릅니다.",
          "보유 목적이 달성되거나 이용자의 적법한 삭제 요청이 확인되면 복구하기 어려운 방법으로 지체 없이 삭제합니다. 전자 파일은 안전하게 삭제하고, 출력물이 있는 경우 파쇄합니다."
        ]
      },
      {
        heading: "제3자 제공 및 처리위탁",
        body: [
          "운영자는 이용자의 개인정보를 판매하지 않습니다. 이용자의 동의가 있거나 법령에 근거가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.",
          "서비스 운영에 호스팅, 이메일, 오류 분석 등 외부 인프라가 필요한 경우 해당 제공업체가 업무 수행에 필요한 범위에서 정보를 처리할 수 있습니다. 운영자는 제공업체가 적절한 보호조치를 갖추도록 관리하며, 처리업체 또는 처리 방식에 중요한 변경이 생기면 이 방침을 업데이트합니다."
        ]
      },
      {
        heading: "이용자의 권리",
        body: [
          `이용자는 자신의 개인정보에 대한 열람, 정정, 삭제, 처리정지 또는 동의 철회를 요청할 수 있습니다. ${SITE_CONFIG.supportEmail}로 요청 내용과 본인 확인에 필요한 최소한의 정보를 보내 주세요.`,
          "운영자는 법령이 정한 범위에서 요청을 지체 없이 처리하고 결과를 안내합니다. 다른 사람의 권리 보호나 법적 의무 이행을 위해 요청의 전부 또는 일부가 제한될 수 있으며, 이 경우 그 사유를 안내합니다."
        ]
      },
      {
        heading: "안전성 확보조치",
        body: [
          "운영자는 개인정보 접근 권한을 필요한 범위로 제한하고, 전송 및 보관 과정에서 합리적인 기술적·관리적 보호조치를 적용합니다. 다만 어떠한 전송 또는 저장 방식도 절대적인 보안을 보장할 수는 없습니다."
        ]
      },
      {
        heading: "아동의 개인정보",
        body: [
          "서비스는 만 14세 미만 아동을 대상으로 하지 않으며, 운영자는 만 14세 미만 아동의 개인정보를 고의로 수집하지 않습니다. 관련 사실을 알게 된 경우 확인 후 지체 없이 삭제합니다."
        ]
      },
      {
        heading: "방침의 변경",
        body: [
          "법령, 서비스 또는 개인정보 처리 방식이 변경되면 이 방침을 수정할 수 있습니다. 중요한 변경은 시행 전에 서비스 또는 이 페이지를 통해 알리며, 페이지 상단의 최종 업데이트 날짜를 함께 변경합니다."
        ]
      },
      {
        heading: "개인정보 보호 문의",
        body: [
          `개인정보 관련 문의와 권리 행사는 ${SITE_CONFIG.developerName} 개인정보 담당자(${SITE_CONFIG.supportEmail})에게 연락해 주세요.`
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
          `본 약관은 ${SITE_CONFIG.developerName}(이하 “운영자”)가 제공하는 ${SITE_CONFIG.musicNowName}(이하 “서비스”)의 이용 조건을 정합니다. 서비스를 설치하거나 이용하면 본 약관과 개인정보처리방침에 동의한 것으로 봅니다.`,
          `시행일: ${SITE_CONFIG.lastUpdated}`
        ]
      },
      {
        heading: "서비스 내용",
        body: [
          "서비스는 음악 취향 공유, 초대 링크와 그룹 코드를 통한 그룹 참여 등 관련 기능을 제공합니다. 일부 기능은 인터넷 연결, 호환되는 기기 또는 외부 플랫폼이 필요할 수 있습니다."
        ]
      },
      {
        heading: "이용자의 책임과 금지행위",
        body: [
          "이용자는 자신의 기기와 초대 코드가 무단 사용되지 않도록 관리해야 하며, 초대 코드는 참여를 허용한 사람에게만 공유해야 합니다.",
          "다른 사람의 권리 또는 개인정보를 침해하는 행위, 불법·사기·괴롭힘 목적의 이용, 서비스 또는 보안 기능의 방해·우회, 악성 코드 전송, 무단 복제·변형·역설계, 자동화된 방식의 과도한 접근은 금지됩니다."
        ]
      },
      {
        heading: "이용 제한 및 종료",
        body: [
          "이용자가 본 약관 또는 관련 법령을 위반하거나 서비스와 다른 이용자에게 위험을 초래하는 경우, 운영자는 필요한 범위에서 이용을 제한하거나 중단할 수 있습니다. 긴급한 경우를 제외하고 가능한 범위에서 사유와 이의 제기 방법을 안내합니다.",
          `이용자는 언제든지 앱을 삭제하여 이용을 중단할 수 있습니다. 개인정보 삭제 등 추가 조치가 필요하면 ${SITE_CONFIG.supportEmail}로 요청할 수 있습니다.`
        ]
      },
      {
        heading: "서비스 변경",
        body: [
          "운영자는 서비스 개선, 보안, 법령 또는 외부 플랫폼 정책 변경을 위해 기능이나 제공 범위를 변경할 수 있습니다. 이용자에게 중대한 영향을 주는 변경이나 서비스 종료는 합리적인 기간 전에 서비스 또는 이 페이지를 통해 알립니다."
        ]
      },
      {
        heading: "지식재산권",
        body: [
          "서비스의 소프트웨어, 디자인, 상표와 운영자가 제공하는 콘텐츠에 관한 권리는 운영자 또는 정당한 권리자에게 있습니다. 본 약관은 개인적이고 비상업적인 서비스 이용에 필요한 제한적 권리만을 이용자에게 부여합니다.",
          "이용자가 서비스에 제공한 콘텐츠의 권리는 이용자에게 유지됩니다. 이용자는 서비스 제공에 필요한 범위에서 해당 콘텐츠를 처리할 권한이 자신에게 있음을 보장합니다."
        ]
      },
      {
        heading: "외부 서비스",
        body: [
          "서비스가 제3자의 음악, 링크 또는 플랫폼과 연동되는 경우 해당 서비스에는 제3자의 약관과 개인정보처리방침이 적용될 수 있습니다. 운영자는 제3자 서비스의 운영이나 콘텐츠를 통제하지 않습니다."
        ]
      },
      {
        heading: "보증 및 책임의 제한",
        body: [
          "운영자는 서비스의 안정성과 보안을 위해 합리적으로 노력합니다. 다만 법령이 허용하는 범위에서 서비스가 항상 중단이나 오류 없이 제공되거나 모든 기기 및 외부 서비스와 호환된다고 보장하지 않습니다.",
          "운영자의 고의 또는 중대한 과실로 인한 경우 등 관련 법령상 제한할 수 없는 책임은 제한되지 않습니다. 이용자의 귀책사유, 기기·통신망 또는 운영자가 통제하기 어려운 제3자 서비스로 발생한 손해에 대해서는 법령이 허용하는 범위에서 책임이 제한됩니다."
        ]
      },
      {
        heading: "준거법 및 분쟁",
        body: [
          "본 약관은 대한민국 법령을 따릅니다. 분쟁이 발생하면 당사자는 우선 상호 협의를 통해 해결하도록 노력하며, 해결되지 않는 경우 관련 법령이 정한 관할 법원에서 처리합니다."
        ]
      },
      {
        heading: "약관 변경",
        body: [
          "운영자는 법령 또는 서비스 변경을 반영하기 위해 약관을 수정할 수 있습니다. 이용자에게 불리한 중요한 변경은 시행 전에 서비스 또는 이 페이지를 통해 알립니다. 변경 후 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 봅니다."
        ]
      },
      {
        heading: "문의",
        body: [
          `서비스 및 약관 관련 문의는 ${SITE_CONFIG.supportEmail}로 연락해 주세요.`
        ]
      }
    ]
  }
};

const legalPagesEn = {
  privacy: {
    title: "Privacy",
    sections: [
      {
        heading: "Privacy Policy",
        body: [
          `${SITE_CONFIG.developerName} (“we,” “us,” or the “Operator”) respects the privacy of users of ${SITE_CONFIG.musicNowName} (the “Service”) and complies with applicable privacy laws. This policy explains what information we process and why.`,
          `Effective date: ${SITE_CONFIG.lastUpdated}`
        ]
      },
      {
        heading: "Information We Process and How We Collect It",
        body: [
          "When you use the Service, group codes and invitation-link information may be processed. Diagnostic information, such as your device model, operating system and app version, error timestamps, and crash logs, may also be generated to help maintain app stability.",
          "If you contact us by email, we process the email address, message, and attachments you choose to provide. Please do not include personal or sensitive information that is not necessary for your request.",
          "We collect this information when you provide it directly, use app features, or send an email to customer support."
        ]
      },
      {
        heading: "Purposes of Processing",
        body: [
          "We use information to provide group invitations and participation features, diagnose errors and improve quality, protect the Service from abuse and security threats, respond to support requests, and protect users. We do not use information for purposes incompatible with those described in this policy."
        ]
      },
      {
        heading: "Retention and Deletion",
        body: [
          "Information used to provide Service features is retained only for as long as necessary to provide those features. Customer support inquiries and responses may be retained for up to three years after the inquiry is closed, unless a different retention period is required by law.",
          "When the purpose of processing has been fulfilled or a valid deletion request is confirmed, we delete the information without undue delay using methods designed to prevent recovery. Electronic files are securely deleted, and paper records, if any, are shredded."
        ]
      },
      {
        heading: "Third-Party Disclosure and Service Providers",
        body: [
          "We do not sell personal information. We do not disclose personal information to third parties unless you consent or disclosure is permitted or required by law.",
          "Service providers supporting hosting, email, error analysis, or similar infrastructure may process information only as necessary to perform their services. We take reasonable steps to require appropriate safeguards and will update this policy if there is a material change to our providers or processing practices."
        ]
      },
      {
        heading: "Your Rights",
        body: [
          `You may request access to, correction or deletion of, or restriction of processing of your personal information, or withdraw consent where applicable. Email ${SITE_CONFIG.supportEmail} with your request and the minimum information necessary to verify your identity.`,
          "We will respond without undue delay as required by applicable law. A request may be limited where necessary to protect another person's rights or comply with a legal obligation, in which case we will explain the reason."
        ]
      },
      {
        heading: "Security",
        body: [
          "We limit access to personal information and apply reasonable technical and organizational safeguards during transmission and storage. However, no method of transmission or storage can guarantee absolute security."
        ]
      },
      {
        heading: "Children's Privacy",
        body: [
          "The Service is not directed to children under 14, and we do not knowingly collect personal information from children under 14. If we learn that such information has been collected, we will verify the circumstances and delete it without undue delay."
        ]
      },
      {
        heading: "Changes to This Policy",
        body: [
          "We may update this policy to reflect changes in law, the Service, or our processing practices. We will provide notice of material changes through the Service or this page before they take effect and will update the date shown above."
        ]
      },
      {
        heading: "Privacy Contact",
        body: [
          `For privacy questions or to exercise your rights, contact the ${SITE_CONFIG.developerName} privacy representative at ${SITE_CONFIG.supportEmail}.`
        ]
      }
    ]
  },
  terms: {
    title: "Terms",
    sections: [
      {
        heading: "Terms of Service",
        body: [
          `These Terms govern your use of ${SITE_CONFIG.musicNowName} (the “Service”), provided by ${SITE_CONFIG.developerName} (the “Operator”). By installing or using the Service, you agree to these Terms and the Privacy Policy.`,
          `Effective date: ${SITE_CONFIG.lastUpdated}`
        ]
      },
      {
        heading: "The Service",
        body: [
          "The Service provides features for sharing music preferences and joining groups through invitation links and group codes. Some features may require an internet connection, a compatible device, or access to a third-party platform."
        ]
      },
      {
        heading: "User Responsibilities and Prohibited Conduct",
        body: [
          "You are responsible for preventing unauthorized use of your device and invitation codes. Share invitation codes only with people you intend to allow into a group.",
          "You must not infringe another person's rights or privacy; use the Service for unlawful, fraudulent, or harassing purposes; interfere with or bypass Service or security features; transmit malicious code; copy, modify, or reverse engineer the Service without authorization; or access the Service through automated means in a manner that creates an excessive burden."
        ]
      },
      {
        heading: "Suspension and Termination",
        body: [
          "We may restrict or suspend access where a user violates these Terms or applicable law, or creates a risk to the Service or other users. Except in urgent cases, we will provide the reason and a way to raise an objection where reasonably possible.",
          `You may stop using the Service at any time by deleting the app. For additional action, including a personal information deletion request, contact ${SITE_CONFIG.supportEmail}.`
        ]
      },
      {
        heading: "Changes to the Service",
        body: [
          "We may change features or availability to improve the Service, maintain security, or respond to changes in law or third-party platform policies. We will give reasonable advance notice through the Service or this page of changes or discontinuation that materially affect users."
        ]
      },
      {
        heading: "Intellectual Property",
        body: [
          "The Service software, design, trademarks, and content supplied by the Operator are owned by the Operator or their respective rights holders. These Terms grant you only a limited right to use the Service for personal, non-commercial purposes.",
          "You retain ownership of content you provide to the Service. You represent that you have the rights necessary to allow us to process that content to provide the Service."
        ]
      },
      {
        heading: "Third-Party Services",
        body: [
          "If the Service connects to third-party music, links, or platforms, those services may be governed by their own terms and privacy policies. We do not control the operation or content of third-party services."
        ]
      },
      {
        heading: "Disclaimers and Limitation of Liability",
        body: [
          "We take reasonable steps to keep the Service stable and secure. To the extent permitted by law, however, we do not guarantee uninterrupted or error-free operation or compatibility with every device or third-party service.",
          "Nothing in these Terms limits liability that cannot lawfully be limited, including liability arising from our intentional misconduct or gross negligence. To the extent permitted by law, our liability is limited for loss caused by a user's actions, a device or network, or a third-party service outside our reasonable control."
        ]
      },
      {
        heading: "Governing Law and Disputes",
        body: [
          "These Terms are governed by the laws of the Republic of Korea. The parties will first attempt to resolve disputes through good-faith discussion. Unresolved disputes will be submitted to a court with jurisdiction under applicable law."
        ]
      },
      {
        heading: "Changes to These Terms",
        body: [
          "We may update these Terms to reflect changes in law or the Service. We will notify users through the Service or this page before a material change that adversely affects users takes effect. Continued use after an update constitutes acceptance of the revised Terms."
        ]
      },
      {
        heading: "Contact",
        body: [
          `For questions about the Service or these Terms, contact ${SITE_CONFIG.supportEmail}.`
        ]
      }
    ]
  }
};

const supportCopies = {
  ko: {
    updated: "최종 업데이트",
    heading: "Music Now 지원",
    intro: "앱 사용 중 문제가 있거나 초대 링크, 그룹 코드, 개인정보 및 이용약관 관련 도움이 필요하면 아래 이메일로 문의해 주세요.",
    detailsHeading: "문의 시 포함하면 좋은 내용",
    details: "사용 중인 기기, iOS 버전, 앱 버전, 발생한 화면, 가능하다면 그룹 코드를 함께 알려주시면 더 빠르게 확인할 수 있습니다."
  },
  en: {
    updated: "Last updated",
    heading: "Music Now Support",
    intro: "If you need help with the app, invitation links, group codes, privacy, or the Terms of Service, contact us at the email address below.",
    detailsHeading: "Helpful details to include",
    details: "Please include your device model, iOS version, app version, the screen where the issue occurred, and, if possible, the group code so we can investigate more quickly."
  }
};

const inviteCopies = {
  ko: {
    htmlLang: "ko",
    title: "그룹 초대가 도착했어요",
    description: "Music Now에서 함께 들을 친구들을 만나보세요.",
    metaDescription: "Music Now 그룹 코드",
    eyebrow: "Group Invite",
    codeLabel: "그룹 코드",
    copyIdle: "탭해서 복사",
    copyDone: "복사 완료",
    copyLabel: "그룹 코드 복사",
    copiedLabel: "그룹 코드 복사 완료"
  },
  en: {
    htmlLang: "en",
    title: "You're invited to a group",
    description: "Join your friends on Music Now.",
    metaDescription: "Music Now group code",
    eyebrow: "Group Invite",
    codeLabel: "Group code",
    copyIdle: "Tap to copy",
    copyDone: "Copied",
    copyLabel: "Copy group code",
    copiedLabel: "Copied group code"
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
    const locale = getPreferredLocale();
    const copy = inviteCopies[locale];
    return {
      title: `Music Now Invite | ${code}`,
      description: `${copy.metaDescription} ${code}`,
      lang: copy.htmlLang,
      render: () => renderInvitePage(code, locale)
    };
  }

  const page = pages[pathname];
  if (page && ["/musicnow/privacy", "/musicnow/terms", "/musicnow/support"].includes(pathname)) {
    const locale = getPreferredLocale();
    return {
      ...page,
      lang: locale,
      render: () => page.render(locale)
    };
  }

  return page ?? {
    title: "Not Found | CJY",
    description: "The requested page could not be found.",
    render: renderNotFound
  };
}

function renderApp() {
  const route = getCurrentRoute();
  document.title = route.title;
  document.documentElement.lang = route.lang || "ko";
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

function renderLegalPage(page, locale = "ko") {
  const updatedLabel = locale === "ko" ? "최종 업데이트" : "Last updated";
  return `
    <main class="site-shell">
      <article class="screen legal-screen" aria-labelledby="${slugify(page.title)}-title">
        ${renderHeader(page.title, `${slugify(page.title)}-title`)}
        <div class="legal-content">
          <p class="updated">${updatedLabel} ${SITE_CONFIG.lastUpdated}</p>
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

function renderSupportPage(locale = "ko") {
  const copy = supportCopies[locale] || supportCopies.en;
  return `
    <main class="site-shell">
      <article class="screen legal-screen support-screen" aria-labelledby="support-title">
        ${renderHeader("Support", "support-title")}
        <div class="legal-content">
          <p class="updated">${escapeHtml(copy.updated)} ${SITE_CONFIG.lastUpdated}</p>
          <section class="policy-section">
            <h2>${escapeHtml(copy.heading)}</h2>
            <p>${escapeHtml(copy.intro)}</p>
          </section>
          <a class="support-card" href="mailto:${SITE_CONFIG.supportEmail}">
            <span class="support-card__label">Email</span>
            <span class="support-card__value">${SITE_CONFIG.supportEmail}</span>
          </a>
          <section class="policy-section">
            <h2>${escapeHtml(copy.detailsHeading)}</h2>
            <p>${escapeHtml(copy.details)}</p>
          </section>
        </div>
      </article>
    </main>
  `;
}

function renderInvitePage(rawCode, locale = "ko") {
  const code = sanitizeInviteCode(rawCode);
  const copy = inviteCopies[locale] || inviteCopies.ko;

  return `
    <main class="site-shell">
      <section class="screen invite-screen" aria-labelledby="invite-title">
        ${renderMusicNowLogo("invite-logo", "musicnow-logo--invite")}
        <div class="invite-copy">
          <p class="invite-eyebrow">${escapeHtml(copy.eyebrow)}</p>
          <h1 id="invite-title" class="invite-title">${escapeHtml(copy.title)}</h1>
          <p class="invite-description">${escapeHtml(copy.description)}</p>
        </div>
        <button class="invite-code-card" type="button" data-copy="${escapeHtml(code)}" data-copy-label="${escapeHtml(copy.copyLabel)} ${escapeHtml(code)}" data-copied-label="${escapeHtml(copy.copiedLabel)}" aria-label="${escapeHtml(copy.copyLabel)} ${escapeHtml(code)}">
          <span class="invite-code-label">${escapeHtml(copy.codeLabel)}</span>
          <span class="invite-code-row">
            <span class="invite-code">${escapeHtml(code)}</span>
            <img class="copy-icon" src="/component/Copy.svg" alt="" aria-hidden="true" />
          </span>
          <span class="invite-copy-state" data-copied-text="${escapeHtml(copy.copyDone)}" aria-hidden="true">${escapeHtml(copy.copyIdle)}</span>
        </button>
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

function getPreferredLocale() {
  const params = new URLSearchParams(window.location.search);
  const queryLocale = normalizeInviteLocale(params.get("lang"));
  if (queryLocale) return queryLocale;

  const browserLocale = normalizeInviteLocale(navigator.language);
  return browserLocale || "en";
}

function getLegalPages(locale) {
  return locale === "ko" ? legalPagesKo : legalPagesEn;
}

function normalizeInviteLocale(value) {
  const locale = String(value || "").trim().toLowerCase();
  if (locale === "ko" || locale.startsWith("ko-")) return "ko";
  if (locale === "en" || locale.startsWith("en-")) return "en";
  return "";
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
