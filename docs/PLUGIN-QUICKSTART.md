# Plugin Quick Start

## Installing a plugin

1. Go to `Settings → Plugins` and click **Open Plugins Folder**.
2. Drop your plugin folder inside it. The folder must contain `plugin.js`.
3. Restart the app.

## Folder structure

```
plugins/
  MyPlugin/
    plugin.js     ← required
    config.yaml   ← user-editable settings, opened via "Open Config" button
    README.md     ← opened via "Open README" button in the Plugins tab
    icon.png      ← shown in the Plugins tab
    data.csv      ← any extra files your plugin needs
```

The Plugins tab shows the plugin's name, version, description, files, load status, and **Open README** / **Open Config** buttons when those files are present.

---

## Writing a plugin

```javascript
(function() {
  const MyPlugin = {
    name: 'MyPlugin',
    version: '1.0.0',
    description: 'One line explaining what this plugin does.',

    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'browser_source';
    },

    async execute(options, sourceName, displayName, context) {
      const btn = document.createElement('button');
      btn.className = 'btn-plugin';
      btn.textContent = 'Refresh';
      btn.addEventListener('click', async () => {
        try {
          await window.obsAPI.browser.refreshNoCache(sourceName);
          window.uiHelpers?.logSuccess(`Refreshed ${displayName}`, 'my-plugin');
        } catch (err) {
          window.uiHelpers?.logError(err.message, 'my-plugin');
        }
      });
      options.appendChild(btn);
    },

    priority() { return 10; }
  };

  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(MyPlugin);
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(MyPlugin);
    });
  }
})();
```

### Metadata

`name`, `version`, and `description` are read directly from `plugin.js` — no external config file needed. The Plugins tab displays whatever you set there.

### Required methods

| Method | Notes |
|--------|-------|
| `canHandle(sourceKind, sourceName, context)` | Return `true` to claim a source. Keep it fast. |
| `execute(options, sourceName, displayName, context)` | Build your UI here. `options` is the container element. |
| `priority()` | Higher number runs before lower. Default range: 1–100. |

### Optional methods

| Method | Notes |
|--------|-------|
| `cleanup(sourceName)` | Clean up sidebar buttons, intervals, global listeners. The `options` panel is destroyed automatically. |
| `onRemoteUpdate(sourceName, eventType, data)` | React to real-time OBS events without a full refresh. |

---

## config.yaml — user-editable settings

Drop a `config.yaml` file in your plugin folder to give users a simple way to configure your plugin without touching the JS code. The **Open Config** button in the Plugins tab opens it with Notepad.

Example `config.yaml`:
```yaml
scene_names:
  lobby: "Lobby Scene"
  game: "Game Scene"

transition_delay_ms: 500
show_debug: false
```

Reading it from your plugin (returns raw YAML text — parse it yourself):
```javascript
async execute(options, sourceName, displayName, context) {
  const raw = await context.pluginAPI.readConfig();
  // parse manually or use a bundled lightweight YAML parser
  // e.g. split lines, pick key: value pairs
}
```

Or read any file by name:
```javascript
const raw = await context.pluginAPI.readFile('config.yaml');
```

The file is read live every time `readConfig()` is called, so changes in Notepad are picked up on the next action without restarting the app.

## Key APIs

```javascript
window.obsAPI                            // OBS control
window.PluginUtils                       // source helpers, sidebar buttons
window.uiHelpers.logSuccess/logError()   // app console output
context.pluginAPI.readFile('data.csv')   // read any file from your plugin folder
context.pluginAPI.readConfig()           // read config.yaml specifically
```

## Sidebar buttons

```javascript
window.PluginUtils.registerSidebarButton(
  'MyPlugin', 'my-btn-id', 'Button Label',
  async () => { /* click handler */ }
);

// cleanup
cleanup() {
  window.PluginUtils.unregisterSidebarButtons('MyPlugin');
}
```

---

## More

- `docs/PLUGIN-SYSTEM.md` — architecture overview
- `docs/PLUGIN-UTILS.md` — full PluginUtils reference
- `documentation/example-plugin.md` — kitchen-sink example with every feature
