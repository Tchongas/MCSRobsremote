# Docs Components

Custom HTML tags used on the ROBS documentation site.

## Components

### `<site-header>`
Renders the fixed topbar with logo, search, and theme toggle.

### `<site-nav>`
Renders the grouped sidebar with subpages. Active link is set from `document.body.dataset.page`.

### `<hero-section>`
Big landing banner. Attributes:
- `title`
- `subtitle`
- `primary-text` / `primary-href`
- `secondary-text` / `secondary-href`

### `<feature-card>`
Styled card. Use inside `<div class="cards">`. Attributes:
- `title`

### `<demo-frame>`
Placeholder box for screenshots. Attributes:
- `caption`

### `<page-footer>`
Footer with copyright and auto-generated "Next" link. Reads `document.body.dataset.page` to find the next page in the flattened order.

## Page Structure

Pages are grouped into **User Guide** and **Developer Guide**. A parent page can have child pages shown indented in the sidebar.

```
User Guide
├── Introduction              (index.html)
├── Getting Started           (docs/getting-started.html)
│   ├── Connection            (docs/getting-started/connection.html)
│   ├── Dashboard             (docs/getting-started/dashboard.html)
│   ├── Appearance            (docs/getting-started/appearance.html)
│   └── Plugins               (docs/getting-started/plugins.html)
└── Examples                  (docs/demo.html)

Developer Guide
├── Plugins                   (docs/plugins.html)
│   ├── Documentation         (docs/plugins/documentation.html)
│   ├── Example: Dashboard    (docs/plugins/example-dashboard.html)
│   ├── Example: Create       (docs/plugins/example-create.html)
│   ├── Example: Automation   (docs/plugins/example-automation.html)
│   └── Example: Workspace    (docs/plugins/example-workspace.html)
```

## Adding a Page

1. Create a new `.html` file in `docs/` or a subfolder.
2. Copy the boilerplate from an existing page.
3. Set `data-page` on `<body>` to a unique ID.
4. Add `<h2 id="section-name">` for each section you want searchable.
5. Register the page in two places:
   - `docs/components.js` — add to `pageGroups` under the right group. Use `children` for subpages.
   - `docs/scripts.js` — add to `pageGroups` under the right group for search. Include `sections` with `title` and `anchor`.

## Quick Page Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title - ROBS</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body data-page="page-id">
  <site-header></site-header>
  <div class="layout">
    <site-nav></site-nav>
    <main class="content">
      <h1>Page Title</h1>
      <p>Content here.</p>
      <h2 id="section-one">Section One</h2>
      <p>More content.</p>
      <page-footer></page-footer>
    </main>
  </div>
  <script src="components.js"></script>
  <script src="scripts.js"></script>
</body>
</html>
```

For subpages in a folder like `docs/getting-started/`, use `../styles.css`, `../components.js`, and `../scripts.js`.
