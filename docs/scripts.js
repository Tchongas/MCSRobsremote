(function () {
  const STORAGE_KEY = 'robs-docs-theme';

  // The script is always inside docs/, so derive absolute URLs from its location.
  // This keeps search results valid whether the user is on the root landing page or inside docs/.
  const scriptUrl = new URL(document.currentScript.src);
  const docsDir = scriptUrl.href.replace(/scripts\.js$/, '');
  const rootDir = docsDir.replace(/docs\/$/, '');

  const pageGroups = [
    {
      group: 'User Guide',
      items: [
        {
          id: 'index',
          title: 'Introduction',
          path: rootDir + 'index.html',
          keywords: 'robs obs remote controller introduction overview',
          sections: [
            { title: 'What is ROBS?', anchor: 'what-is-robs' },
            { title: 'Quick Start', anchor: 'quick-start' },
          ],
        },
        {
          id: 'getting-started',
          title: 'Getting Started',
          path: docsDir + 'getting-started.html',
          keywords: 'install setup connection configure obs websocket',
          sections: [
            { title: 'The Basics', anchor: 'the-basics' },
            { title: 'Subtopics', anchor: 'subtopics' },
            { title: 'Quick Start', anchor: 'quick-start' },
            { title: 'Troubleshooting', anchor: 'troubleshooting' },
          ],
        },
        {
          id: 'getting-started-connection',
          title: 'Connection',
          path: docsDir + 'getting-started/connection.html',
          keywords: 'obs websocket host port password connect',
          sections: [],
        },
        {
          id: 'getting-started-dashboard',
          title: 'Dashboard',
          path: docsDir + 'getting-started/dashboard.html',
          keywords: 'dashboard sources scenes toggle visibility',
          sections: [],
        },
        {
          id: 'getting-started-appearance',
          title: 'Appearance',
          path: docsDir + 'getting-started/appearance.html',
          keywords: 'scaling high contrast reduced motion hide dashboard plugin only mode',
          sections: [
            { title: 'Scaling', anchor: 'scaling' },
            { title: 'Visibility', anchor: 'visibility' },
            { title: 'High Contrast', anchor: 'high-contrast' },
            { title: 'Reduced Motion', anchor: 'reduced-motion' },
            { title: 'Dashboard Emojis', anchor: 'dashboard-emojis' },
          ],
        },
        {
          id: 'getting-started-plugins',
          title: 'Plugins',
          path: docsDir + 'getting-started/plugins.html',
          keywords: 'install plugins robs plugins folder runner sync',
          sections: [],
        },
        {
          id: 'examples',
          title: 'Examples',
          path: docsDir + 'demo.html',
          keywords: 'examples use cases workflows production',
          sections: [
            { title: 'Dashboard & Scene Control', anchor: 'dashboard-scene-control' },
            { title: 'Plugin Workflow', anchor: 'plugin-workflow' },
            { title: 'Video Demo', anchor: 'video-demo' },
          ],
        },
      ],
    },
    {
      group: 'Developer Guide',
      items: [
        {
          id: 'plugins',
          title: 'Plugins',
          path: docsDir + 'plugins.html',
          keywords: 'plugins automation javascript api pluginutils sidebar',
          sections: [
            { title: 'Plugin Structure', anchor: 'plugin-structure' },
            { title: 'Package Plugins', anchor: 'package-plugins' },
            { title: 'Example: RunnerSyncPlugin', anchor: 'example-runnersyncplugin' },
            { title: 'Best Practices', anchor: 'best-practices' },
            { title: 'Plugin API', anchor: 'plugin-api' },
          ],
        },
        {
          id: 'plugins-documentation',
          title: 'Documentation',
          path: docsDir + 'plugins/documentation.html',
          keywords: 'plugin api reference pluginutils functions',
          sections: [],
        },
        {
          id: 'plugins-example-dashboard',
          title: 'Example: Dashboard',
          path: docsDir + 'plugins/example-dashboard.html',
          keywords: 'plugin example dashboard sources obs',
          sections: [],
        },
        {
          id: 'plugins-example-create',
          title: 'Example: Create',
          path: docsDir + 'plugins/example-create.html',
          keywords: 'plugin example create source scene',
          sections: [],
        },
        {
          id: 'plugins-example-automation',
          title: 'Example: Automation',
          path: docsDir + 'plugins/example-automation.html',
          keywords: 'plugin example automation timer schedule',
          sections: [],
        },
        {
          id: 'plugins-example-workspace',
          title: 'Example: Workspace',
          path: docsDir + 'plugins/example-workspace.html',
          keywords: 'plugin example workspace layout configuration',
          sections: [],
        },
      ],
    },
  ];

  function flattenPages() {
    const flat = [];
    pageGroups.forEach(g => g.items.forEach(item => flat.push(item)));
    return flat;
  }

  const pages = flattenPages();

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  }

  function initMenu() {
    const toggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (window.innerWidth > 768) return;
      if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  function initSearch() {
    const input = document.getElementById('search-input');
    const results = document.getElementById('search-results');
    if (!input || !results) return;

    function buildIndex() {
      const index = [];
      pages.forEach(p => {
        index.push({ type: 'page', title: p.title, path: p.path, keywords: p.keywords });
        (p.sections || []).forEach(s => {
          index.push({ type: 'section', title: s.title, path: `${p.path}#${s.anchor}`, keywords: p.keywords });
        });
      });
      return index;
    }

    const index = buildIndex();

    function render(query) {
      const q = query.trim().toLowerCase();
      results.innerHTML = '';
      if (!q) {
        results.classList.remove('active');
        return;
      }

      const matches = index.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );

      if (matches.length === 0) {
        results.innerHTML = '<a href="#">No results found</a>';
      } else {
        matches.forEach(item => {
          const a = document.createElement('a');
          a.href = item.path;
          const page = pages.find(p => p.path === item.path.split('#')[0]);
          const meta = page ? page.title : '';
          a.innerHTML = item.type === 'section'
            ? `${item.title}<small>${meta}</small>`
            : `${item.title}<small>${item.keywords}</small>`;
          results.appendChild(a);
        });
      }
      results.classList.add('active');
    }

    input.addEventListener('input', (e) => render(e.target.value));
    input.addEventListener('focus', (e) => render(e.target.value));

    document.addEventListener('click', (e) => {
      if (!input.contains(e.target) && !results.contains(e.target)) {
        results.classList.remove('active');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMenu();
    initSearch();

    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  });
})();
