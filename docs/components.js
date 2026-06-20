(function () {
  // Compute root and docs paths from the component script's own URL.
  // The script lives in docs/, so we can build absolute links that work from both root and docs pages.
  const scriptUrl = new URL(document.currentScript.src);
  const docsDir = scriptUrl.href.replace(/components\.js$/, '');
  const rootDir = docsDir.replace(/docs\/$/, '');

  const pages = [
    { id: 'index', label: 'Introduction', href: rootDir + 'index.html' },
    { id: 'getting-started', label: 'Getting Started', href: docsDir + 'getting-started.html' },
    { id: 'plugins', label: 'Plugins', href: docsDir + 'plugins.html' },
    { id: 'demo', label: 'Demo', href: docsDir + 'demo.html' },
  ];

  function logoHref() {
    return rootDir + 'index.html';
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      this.innerHTML = `
        <header class="topbar">
          <div class="topbar-left">
            <button class="menu-toggle" id="menu-toggle" aria-label="Toggle menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <a href="${logoHref()}" class="logo">ROBS</a>
          </div>
          <div class="topbar-right">
            <div class="search-box">
              <span class="search-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input type="text" id="search-input" placeholder="Search docs..." aria-label="Search">
              <div class="search-results" id="search-results"></div>
            </div>
            <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme"></button>
          </div>
        </header>
      `;
    }
  }

  class SiteNav extends HTMLElement {
    connectedCallback() {
      const active = this.getAttribute('active') || document.body.dataset.page || 'index';
      const links = pages.map(p => {
        const isActive = p.id === active ? 'active' : '';
        return `<a href="${p.href}" class="sidebar-link ${isActive}" data-page="${p.id}">${p.label}</a>`;
      }).join('');

      this.innerHTML = `
        <nav class="sidebar" id="sidebar">
          <div class="sidebar-section">
            <div class="sidebar-title">Guide</div>
            ${links}
          </div>
          <div class="sidebar-section">
            <div class="sidebar-title">Links</div>
            <a href="https://github.com/Tchongas/MCSRobsremote" class="sidebar-link" target="_blank" rel="noopener">GitHub</a>
          </div>
        </nav>
      `;
    }
  }

  class HeroSection extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') || '';
      const subtitle = this.getAttribute('subtitle') || '';
      const primaryText = this.getAttribute('primary-text') || '';
      const primaryHref = this.getAttribute('primary-href') || '#';
      const secondaryText = this.getAttribute('secondary-text') || '';
      const secondaryHref = this.getAttribute('secondary-href') || '#';

      this.innerHTML = `
        <div class="hero">
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="hero-buttons">
            <a href="${primaryHref}" class="btn btn-primary">${primaryText}</a>
            <a href="${secondaryHref}" class="btn btn-secondary">${secondaryText}</a>
          </div>
        </div>
      `;
    }
  }

  class FeatureCard extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') || '';
      this.innerHTML = `
        <div class="card">
          <h3>${title}</h3>
          <p>${this.innerHTML}</p>
        </div>
      `;
    }
  }

  class DemoFrame extends HTMLElement {
    connectedCallback() {
      const caption = this.getAttribute('caption') || 'Screenshot placeholder';
      this.innerHTML = `<div class="demo-frame">${caption}</div>`;
    }
  }

  class PageFooter extends HTMLElement {
    connectedCallback() {
      const current = this.getAttribute('current-page') || document.body.dataset.page || 'index';
      const currentIndex = pages.findIndex(p => p.id === current);
      const nextPage = pages[currentIndex + 1];
      const nextLink = nextPage
        ? `<div class="footer-next"><a href="${nextPage.href}">Next: ${nextPage.label} &rarr;</a></div>`
        : '';

      this.innerHTML = `
        <div class="footer">
          ${nextLink}
          <p>&copy; ROBS Project. Built for livestream operators.</p>
        </div>
      `;
    }
  }

  customElements.define('site-header', SiteHeader);
  customElements.define('site-nav', SiteNav);
  customElements.define('hero-section', HeroSection);
  customElements.define('feature-card', FeatureCard);
  customElements.define('demo-frame', DemoFrame);
  customElements.define('page-footer', PageFooter);
})();
