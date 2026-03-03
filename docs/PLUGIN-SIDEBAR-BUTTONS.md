# Plugin Sidebar Buttons

This document describes the **plugin-owned button area** in the left sidebar and the helper APIs to use it.

## Goal

Allow plugins to add UI controls in a consistent place (left sidebar), without hardcoding plugin UI into the core app.

- Plugins can add buttons such as “Sync Player 1”, “Toggle Overlay”, “Hide Sources”, etc.
- Buttons call plugin-defined functions.

## Where buttons render

The sidebar contains a container element:

- `#pluginButtons`

This is the only place plugins should target for sidebar controls.

**Where:** `index.html`

## API: `PluginUtils` sidebar helpers

All sidebar button helpers live in:

- `renderer/logic/handlers/PluginUtils.js`

### `PluginUtils.addControlButton(id, label, onClick, className)`

Creates (or reuses) a button under `#pluginButtons`.

- **`id`** must be unique in the DOM.
- If a button with the same `id` already exists, it will be reused.
- `onClick` can be async.

Example:

```js
window.PluginUtils.addControlButton(
  'myplugin_toggleOverlay',
  'Toggle Overlay',
  async () => {
    await window.obsAPI.scenes.change('Overlay Scene');
  },
  'btn-accent'
);
```

### `PluginUtils.removeControlButton(id)`

Removes a previously created sidebar button by its `id`.

Example:

```js
window.PluginUtils.removeControlButton('myplugin_toggleOverlay');
```

### `PluginUtils.registerSidebarButton(pluginName, id, label, onClick, className)`

Registers a sidebar button and associates it with a plugin name.

This is preferred over `addControlButton` for external plugins because it makes cleanup easy.

Example:

```js
window.PluginUtils.registerSidebarButton(
  'MyPlugin',
  'myplugin_doThing',
  'Do Thing',
  async () => {
    // ...
  }
);
```

### `PluginUtils.unregisterSidebarButtons(pluginName)`

Removes all sidebar buttons registered by a plugin.

Use this from plugin `cleanup()` to avoid leaving stale buttons if the plugin is unloaded/reloaded.

Example:

```js
cleanup() {
  window.PluginUtils.unregisterSidebarButtons('MyPlugin');
}
```

## Styling notes

- You can pass `className` to match existing button styles (e.g. `btn-accent`).
- Prefer consistent labels and short verbs.
- Avoid inline styles unless absolutely necessary.

## Error handling best practices

Button handlers should always protect the UI from failures:

```js
window.PluginUtils.registerSidebarButton(
  'MyPlugin',
  'myplugin_refresh',
  'Refresh',
  async () => {
    try {
      await window.obsAPI.browser.refreshNoCache('MySource');
      window.uiHelpers?.log('✅ Refreshed');
    } catch (e) {
      console.error(e);
      window.uiHelpers?.log(`❌ Refresh failed: ${e?.message || e}`);
    }
  }
);
```

## Lifecycle expectations

- Sidebar buttons are **global UI**, not source-specific.
- Plugins can register them on plugin load (startup), and should unregister them on `cleanup()`.
- App hot reload will reload the renderer; plugins should be written to tolerate re-registration.
