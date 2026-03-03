# Plugin Hot Reload + QoL Fixes

This document covers how plugin hot reload works and the concrete QoL fixes added to make it stable.

## What hot reload does

The app watches the external plugin directory:

- `plugins/*.js` (plugin code)
- `plugins/*.json` (plugin config)

When a file is changed/added/removed, the renderer reloads to pick up the new code/config.

## Main process watcher (authoritative file events)

**Where:** `main/main.js`

The main process uses chokidar to watch the plugin directory and forwards events to renderer windows via IPC (`plugins-directory-changed`).

### Watched patterns

- `path.join(pluginDir, '*.js')`
- `path.join(pluginDir, '*.json')`

### QoL fix: `ignoreInitial: true`

**Problem:** chokidar emits `add` for all existing files on startup.

If the renderer reloads on “added”, startup can become:

- watch starts
- emits add for every existing plugin
- renderer reloads
- watch starts again
- repeats

**Fix:** the watcher is configured with:

- `ignoreInitial: true`

So only real filesystem changes after startup trigger events.

### QoL fix: watcher error visibility

An `error` handler was added:

- `.on('error', ...)`

So if the watcher breaks (permissions/path issues), you’ll see it in logs.

## Renderer-side hot reload behavior

**Where:** `renderer/logic/handlers/CustomHandler.js`

The renderer subscribes to plugin change notifications through `window.pluginAPI.watchPluginDirectory(...)` and reloads the window.

### QoL fix: bind once

**Problem:** the subscription could be set up more than once (depending on code paths), causing multiple reload triggers per event.

**Fix:** `setupPluginWatcher()` now guards itself:

- `pluginWatcherBound`

### QoL fix: debounced reload

**Problem:** saving a file can generate multiple rapid events (common on Windows). Editing plugin `.json` + `.js` can also cause back-to-back events.

If the code calls `window.location.reload()` for each, you can get:

- multiple reloads
- unstable UX

**Fix:** debounce with a timer:

- clear previous timer
- schedule a single reload shortly after the last event

## External plugin validation (QoL)

**Where:** `main/main.js` `validateAndLoadPlugin(...)`

Validation is intentionally lightweight to avoid rejecting valid plugins due to formatting.

- Requires `canHandle`
- Requires `execute` (or `enhance` for older-style plugins)

The sandbox is still responsible for runtime safety; validation is just to avoid loading unrelated JS files.

## Notes / expectations

- Hot reload currently reloads the renderer window (simple + reliable).
- Plugins should be written to tolerate being loaded multiple times over a dev session.
- If your plugin creates persistent UI (sidebar buttons), always clean up in `cleanup()`.
