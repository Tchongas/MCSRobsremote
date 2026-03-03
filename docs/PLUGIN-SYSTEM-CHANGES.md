# Plugin System Changes (Sidebar Buttons + QoL)

This document describes the **recent changes** made to the plugin system (not plugin-specific docs).

## What changed (high level)

- **External plugins load on app startup** (not only when a Dashboard source is expanded).
- The sidebar now has a **dedicated plugin button area** (`#pluginButtons`).
- Plugins get a small set of **safe helpers** (`PluginUtils`) to add/remove sidebar buttons and perform common tasks.
- Hot reload now watches **both `*.js` and `*.json`** in `plugins/`.
- Hot reload was hardened to avoid **startup reload loops** and **reload storms**.

## External plugin loading: when + how

### Before

External plugins were guaranteed to load only when `CustomHandler.createControls(...)` ran.

That meant plugins that only add **global UI** (like sidebar buttons) could fail to appear until you expanded a dashboard item.

### Now

- External plugins are preloaded as soon as `CustomHandler` initializes.
- Dashboard still triggers plugin execution for source-specific controls, but plugins can also register UI immediately.

**Where:** `renderer/logic/handlers/CustomHandler.js`

- `loadExternalPlugins()` is called during initialization (async startup preload).

### Practical impact

- Plugins that register sidebar buttons can do so immediately.
- No dependency on “open a source options panel first”.

## Sidebar plugin buttons area

### HTML

The sidebar now contains:

- `div#pluginButtons`

Plugins should add buttons to this area via `PluginUtils` (not by directly editing the HTML).

**Where:** `index.html`

## Plugin configuration files (`*.json`) via `pluginAPI.readFile`

External plugins can ship config next to their `.js` file.

- Files live in `plugins/`
- Plugins read config with:

```js
const raw = await window.pluginAPI.readFile('MyPlugin.json');
const cfg = JSON.parse(raw);
```

### Security constraints

`readFile` is restricted:

- **Only inside** the `plugins/` directory
- Paths containing `..` are rejected

This allows config reading without exposing general filesystem access.

**Where:**

- IPC handler: `main/main.js` (`plugins-read-file`)
- Preload exposure: `main/preload.js` (`window.pluginAPI.readFile`)

## Hot reload: behavior and QoL hardening

### Watched files

The plugins directory watcher now watches:

- `plugins/*.js`
- `plugins/*.json`

So updating a plugin config file reloads the app and applies changes.

### QoL: prevent startup reload loops

**Problem:** chokidar will emit `add` events for existing files on startup unless configured.

If the renderer reloads on “added”, that can cause a reload loop.

**Fix:** main watcher is configured with:

- `ignoreInitial: true`

**Where:** `main/main.js` in `setupPluginWatcher()`

### QoL: debounce reloads + avoid duplicate watcher binding

**Problem:** saving multiple files quickly (or editors emitting multiple change events) can cause repeated reload calls.

**Fix:** renderer-side watcher now:

- Binds only once (`pluginWatcherBound`)
- Debounces reload (`reloadTimer`)

**Where:** `renderer/logic/handlers/CustomHandler.js`

## External plugin validation: reduced false negatives

The external plugin loader performs a lightweight validation to skip unrelated `.js` files.

**Change:** validation was loosened to avoid incorrectly rejecting valid plugins based on formatting.

**Where:** `main/main.js` `validateAndLoadPlugin(...)`

## Recommendations for plugin authors

- If you add sidebar buttons, always register them through `PluginUtils.registerSidebarButton(...)` so they can be cleaned up reliably.
- Always wrap network/OBS operations in `try/catch`.
- If you rely on a config file, handle parse errors and missing fields gracefully.

## Related docs

- `documentation/pluginoverview.md`
- `documentation/pluginAPI.md`
- `docs/PLUGIN-SYSTEM.md`
