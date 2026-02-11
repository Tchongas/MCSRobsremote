# Plugin System

Plugins are `.js` files that add custom controls and behavior to sources in the dashboard. You write a small object with a few methods, register it, and the app takes care of the rest.

## Quick start

1. Create a `.js` file in the `plugins` folder
2. Write your plugin object with `canHandle`, `execute`, and `priority`
3. Register it with `window.CustomHandlerPlugins.register(yourPlugin)`
4. Save the file — the app hot-reloads automatically

## Where plugins go

- **Your plugins** — `plugins` folder, accessible from the app

## Plugin structure

Every plugin is a self-contained IIFE that creates an object and registers it. Here's the skeleton:

```javascript
(function() {
  const MyPlugin = {
    name: 'MyPlugin',
    version: '1.0.0',

    // Return true if this plugin should run for this source
    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'browser_source';
    },

    // Build your UI controls here
    async execute(options, sourceName, displayName, context) {
      // options    — the DOM container to append your controls to
      // sourceName — the raw OBS source name (e.g. "_Scoreboard")
      // displayName — cleaned name shown in the dashboard (e.g. "Scoreboard")
      // context    — { inputKindMap: Map<name, kind>, ... }
    },

    // Higher number = runs first. Default is fine for most plugins.
    priority() {
      return 10;
    },

    // Called when a source is removed from the dashboard (optional)
    cleanup(sourceName) {
      // remove any persistent UI you created outside the options panel
    },

    // Called when OBS sends a remote update for this source (optional)
    onRemoteUpdate(sourceName, eventType, data) {
      // eventType: 'input-mute-changed', 'input-volume-changed', etc.
    }
  };

  // Register — handles the case where the plugin system isn't ready yet
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(MyPlugin);
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(MyPlugin);
    });
  }
})();
```

## How it works

1. On startup, the app scans the `plugins/` folder for `.js` files
2. Each file is loaded into a sandboxed environment
3. When a dashboard source renders, the app calls `canHandle()` on every registered plugin
4. Plugins that return `true` are sorted by `priority()` (highest first) and `execute()` is called on each
5. This only happens for sources whose names start with `_`

## Hot reload

The `plugins/` folder is watched. When you save a `.js` or `.json` file, the app reloads automatically. Delete a file and the plugin is unregistered. No restart needed.

## What you have access to

Inside your plugin code, you can use:

- **`window.PluginUtils`** — helper functions for OBS control, UI, and source management. See the [API Reference](pluginAPI.md) for the full list.
- **`window.obsAPI`** — direct OBS WebSocket calls (scenes, sources, browser, media, etc.)
- **`window.uiHelpers`** — logging to the app console (`logInfo`, `logError`, `logSuccess`, `logWarn`)
- **`window.pluginAPI.readFile(filename)`** — read a config file from the `plugins/` folder
- **`window.CustomHandlerPlugins`** — plugin registration and management

## Sidebar buttons

Plugins can also add buttons to the right sidebar (not tied to any specific source). Use `PluginUtils.registerSidebarButton()` for this. The button persists until the plugin unregisters it.

## Config files

You can ship a `.json` file alongside your plugin. Read it with:

```javascript
const raw = await window.pluginAPI.readFile('MyPlugin.json');
const config = JSON.parse(raw);
```

The path is restricted to the `plugins/` folder — you can't read files outside of it.

## Troubleshooting

- **Plugin not running?** — Does the source name start with `_`? Does `canHandle()` return `true` for that source kind? Check the console for errors.
- **Hot reload not working?** — Save the file again. The watcher should pick it up. Check the console for reload messages.
- **Plugin errors?** — Wrap your `execute()` in try/catch. Errors are isolated and won't crash the app, but they will stop your plugin from rendering.