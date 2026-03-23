# Plugin API Reference

Everything a plugin can call. All functions accessed through `window.PluginUtils` unless noted otherwise.

---

## PluginUtils

### `applyRowBackground`

Sets a custom background color on the source's dashboard row. Retries if the DOM isn't ready yet.

| | |
|---|---|
| **Parameters** | `optionsEl` (HTMLElement) — the options container passed to `execute()`<br>`color` (string) — any CSS color value |
| **Returns** | `boolean` — whether the background was applied |
| **Description** | Finds the parent `.dash-row` element and sets its background. Has built-in retry logic (requestAnimationFrame + setTimeout) for cases where the DOM hasn't rendered yet. |

```javascript
window.PluginUtils.applyRowBackground(options, '#b39544');
```

---

### `applySourceIcon`

Replaces the default source icon in the dashboard row.

| | |
|---|---|
| **Parameters** | `optionsEl` (HTMLElement) — the options container<br>`icon` (string) — emoji or text character |
| **Returns** | `boolean` — whether the icon was applied |
| **Description** | Finds the `.source-icon` element inside the row and sets its text content. Retries with a timeout if the element isn't available yet. |

```javascript
window.PluginUtils.applySourceIcon(options, '📺');
```

---

### `setTextSource`

Sets the text content of a GDI/Freetype text source in OBS.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name, e.g. `'_Score'`<br>`text` (string) — the text to set |
| **Returns** | `Promise<void>` |
| **Description** | Calls `obsAPI.sources.setSettings` with `{ text }`. Triggers a dashboard refresh after. Throws if the source name is empty or the API isn't available. |

```javascript
await window.PluginUtils.setTextSource('_Score', '3 - 1');
```

---

### `getSourceText`

Reads the current text from a text source.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name |
| **Returns** | `Promise<string>` — the current text value (empty string if not set) |
| **Description** | Calls `obsAPI.sources.getSettings` and reads `inputSettings.text`. |

```javascript
const score = await window.PluginUtils.getSourceText('_Score');
```

---

### `setSourceURL`

Sets the URL on a browser source.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name<br>`url` (string) — the URL to set |
| **Returns** | `Promise<void>` |
| **Description** | Calls `obsAPI.browser.setUrl`. Triggers a dashboard refresh after. |

```javascript
await window.PluginUtils.setSourceURL('_Overlay', 'https://example.com/overlay');
```

---

### `getSourceURL`

Gets the current URL of a browser source.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name |
| **Returns** | `Promise<string>` — the current URL |
| **Description** | Calls `obsAPI.browser.getUrl`. |

```javascript
const url = await window.PluginUtils.getSourceURL('_Overlay');
```

---

### `setSourceVolume`

Sets the volume on an audio source.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name<br>`volume` (number) — 0-100 as percent, or 0.0-1.0 as multiplier (auto-detected) |
| **Returns** | `Promise<void>` |
| **Description** | Values greater than 1 are treated as percentages and divided by 100. The result is clamped to 0-1 before being sent to OBS. Triggers a dashboard refresh. |

```javascript
await window.PluginUtils.setSourceVolume('_Mic', 75);    // 75%
await window.PluginUtils.setSourceVolume('_Mic', 0.75);  // same thing
```

---

### `getSourceVolume`

Gets the current volume of a source as a multiplier.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name |
| **Returns** | `Promise<number>` — volume multiplier from 0.0 to 1.0 |
| **Description** | Reads `inputVolumeMul` from the OBS response. Defaults to 1.0 if not present. |

```javascript
const vol = await window.PluginUtils.getSourceVolume('_Mic'); // 0.75
```

---

### `getSourceVolumePercent`

Gets the current volume as a rounded percentage.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name |
| **Returns** | `Promise<number>` — volume from 0 to 100 |
| **Description** | Wraps `getSourceVolume`, multiplies by 100, rounds, and clamps. |

```javascript
const pct = await window.PluginUtils.getSourceVolumePercent('_Mic'); // 75
```

---

### `getSourceEnabled`

Checks if a source is enabled (visible) in a scene.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name<br>`sceneName` (string, optional) — defaults to the current scene |
| **Returns** | `Promise<boolean>` |
| **Description** | Looks up the scene item by source name and returns its `sceneItemEnabled` state. Throws if the source isn't found in the scene. |

```javascript
const visible = await window.PluginUtils.getSourceEnabled('_Overlay');
```

---

### `setSourceEnabled`

Enables or disables a source in a scene.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name<br>`enabled` (boolean) — true to show, false to hide<br>`sceneName` (string, optional) — defaults to the current scene |
| **Returns** | `Promise<void>` |
| **Description** | Finds the scene item ID, then calls `obsAPI.sceneItems.setEnabled`. Triggers a dashboard refresh. |

```javascript
await window.PluginUtils.setSourceEnabled('_Overlay', false);
```

---

### `toggleSourceEnabled`

Toggles a source's visibility and returns the new state.

| | |
|---|---|
| **Parameters** | `sourceName` (string) — OBS source name<br>`sceneName` (string, optional) — defaults to the current scene |
| **Returns** | `Promise<boolean>` — the new enabled state |
| **Description** | Reads the current state with `getSourceEnabled`, flips it, and calls `setSourceEnabled`. |

```javascript
const newState = await window.PluginUtils.toggleSourceEnabled('_Overlay');
```

---

### `setSourceVisibility`

Alias for `setSourceEnabled`. Same parameters, same behavior.

| | |
|---|---|
| **Parameters** | `sourceName` (string)<br>`state` (boolean)<br>`sceneName` (string, optional) |
| **Returns** | `Promise<void>` |

---

### `listSceneItems`

Lists scene items for a scene (or current selected scene).

| | |
|---|---|
| **Parameters** | `sceneName` (string, optional) |
| **Returns** | `Promise<Array<object>>` |

---

### `getSourceSceneItem`

Gets a scene item descriptor by source name.

| | |
|---|---|
| **Parameters** | `sourceName` (string)<br>`sceneName` (string, optional) |
| **Returns** | `Promise<object>` — includes `sceneItemId` |

---

### `getSourceTransform`

Reads transform information (position/scale/rotation/etc.) for a source in a scene.

| | |
|---|---|
| **Parameters** | `sourceName` (string)<br>`sceneName` (string, optional) |
| **Returns** | `Promise<object>` — OBS scene item transform object |

```javascript
const tf = await window.PluginUtils.getSourceTransform('_*Stream1');
console.log(tf.positionX, tf.positionY);
```

---

### `setSourceTransform`

Writes transform data for a source scene item.

| | |
|---|---|
| **Parameters** | `sourceName` (string)<br>`transform` (object)<br>`sceneName` (string, optional)<br>`options` (object, optional) — `{ refreshDashboard?: boolean }` |
| **Returns** | `Promise<void>` |
| **Description** | Use this for layout moves/swaps where URL/content should not refresh. |

---

### `setSourcePosition`

Convenience method to update `positionX` / `positionY` only.

| | |
|---|---|
| **Parameters** | `sourceName` (string)<br>`x` (number)<br>`y` (number)<br>`sceneName` (string, optional) |
| **Returns** | `Promise<void>` |

---

### `swapSourcePositions`

Swaps the position coordinates of two sources.

| | |
|---|---|
| **Parameters** | `sourceA` (string)<br>`sourceB` (string)<br>`sceneName` (string, optional) |
| **Returns** | `Promise<void>` |

```javascript
await window.PluginUtils.swapSourcePositions('_*Stream1', '_*Stream2');
```

---

### `addControlButton`

Adds a button to the plugin sidebar. USE `registerSidebarButton` INSTEAD

| | |
|---|---|
| **Parameters** | `id` (string) — unique button ID<br>`label` (string) — button text<br>`onClick` (function) — click handler<br>`className` (string, optional) — CSS class, defaults to `'btn-plugin'` |
| **Returns** | `HTMLElement \| null` — the button element, or null if the sidebar host wasn't found |
| **Description** | Creates a `<button>` and appends it to `#pluginButtons`. Won't create duplicates — if a button with that ID already exists, it returns the existing one. |

```javascript
window.PluginUtils.addControlButton('resetBtn', 'Reset Score', async () => {
  await window.PluginUtils.setTextSource('_Score', '0 - 0');
});
```

---

### `registerPopupRpcHandlers`

Registers detached-popup callable handlers for a plugin.

| | |
|---|---|
| **Parameters** | `pluginName` (string)<br>`handlers` (object) — map of method name to async function |
| **Returns** | `void` |

```javascript
window.PluginUtils.registerPopupRpcHandlers('MyPlugin', {
  async getState(sceneName) {
    return await window.PluginUtils.listSceneItems(sceneName);
  },
  async swapPositions(a, b, sceneName) {
    await window.PluginUtils.swapSourcePositions(a, b, sceneName);
    return { ok: true };
  }
});
```

---

### `unregisterPopupRpcHandlers`

Removes popup RPC handlers registered for a plugin.

| | |
|---|---|
| **Parameters** | `pluginName` (string) |
| **Returns** | `void` |

---

### `createPopupHtml`

Builds popup HTML with a prewired bridge object (`window.pluginPopupHost.call(method, ...args)`) so plugin popouts can call host handlers.

| | |
|---|---|
| **Parameters** | `pluginName` (string)<br>`options` (object) — `{ bodyHtml, script }` |
| **Returns** | `string` |

```javascript
const popupHtml = window.PluginUtils.createPopupHtml('MyPlugin', {
  bodyHtml: '<div id="root"></div>',
  script: `
    const data = await window.pluginPopupHost.call('getState');
    document.getElementById('root').textContent = JSON.stringify(data, null, 2);
  `
});
```

---

### `removeControlButton`

Removes a sidebar button by ID. USE `unregisterSidebarButtons` INSTEAD

| | |
|---|---|
| **Parameters** | `id` (string) — the button ID |
| **Returns** | `boolean` — true if found and removed |

```javascript
window.PluginUtils.removeControlButton('resetBtn');
```

---

### `registerSidebarButton`

Adds a tracked sidebar button under a plugin name. Recommended over `addControlButton` for plugins.

| | |
|---|---|
| **Parameters** | `pluginName` (string) — your plugin's name (used for cleanup)<br>`id` (string) — unique button ID<br>`label` (string) — button text<br>`onClick` (function) — click handler<br>`className` (string, optional) — CSS class |
| **Returns** | `HTMLElement \| null` |
| **Description** | Same as `addControlButton`, but the click handler is wrapped to auto-refresh the dashboard after execution. The button is tracked so you can remove all of a plugin's buttons at once with `unregisterSidebarButtons`. |

```javascript
window.PluginUtils.registerSidebarButton('ScorePlugin', 'resetBtn', 'Reset', async () => {
  await window.PluginUtils.setTextSource('_Score', '0 - 0');
});
```

---

### `unregisterSidebarButtons`

Removes all sidebar buttons registered under a plugin name.

| | |
|---|---|
| **Parameters** | `pluginName` (string) |
| **Returns** | `number` — how many buttons were removed |

```javascript
window.PluginUtils.unregisterSidebarButtons('ScorePlugin'); // removes all buttons from that plugin
```

---

### `openPluginModal`

Opens the shared in-app plugin workspace modal and returns a mount node.

| | |
|---|---|
| **Parameters** | `pluginName` (string)<br>`options` (object, optional) — `{ title, className, onClose, popupWidth, popupHeight, popupHtml }` |
| **Returns** | `{ mount: HTMLElement, close: Function, pluginName: string }` |
| **Description** | Uses the app's modal shell so plugin UIs look consistent. Use `mount` to append your custom DOM. `close()` closes the modal. `popup*` options configure the optional popout window button. |

```javascript
const modal = window.PluginUtils.openPluginModal('MyPlugin', {
  title: 'My Plugin Workspace'
});
modal.mount.appendChild(document.createTextNode('Hello from plugin'));
```

---

### `closePluginModal`

Closes the active plugin workspace modal.

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `void` |

```javascript
window.PluginUtils.closePluginModal();
```

---

### `registerModalSidebarButton`

Registers a sidebar button that opens the plugin workspace modal and renders plugin UI.

| | |
|---|---|
| **Parameters** | `pluginName` (string)<br>`id` (string)<br>`label` (string)<br>`onRender` (async function receiving `{ mount, close, pluginName }`)<br>`options` (object, optional) — `{ title, className, onClose, popupWidth, popupHeight, popupHtml, disablePopout, buttonClassName }` |
| **Returns** | `HTMLElement \| null` |
| **Description** | Convenience helper for modal-based plugins. It also tracks the sidebar button under `pluginName` so cleanup with `unregisterSidebarButtons(pluginName)` keeps working. |

```javascript
window.PluginUtils.registerModalSidebarButton(
  'MyPlugin',
  'myPlugin_workspace',
  'Open Workspace',
  async ({ mount, close }) => {
    const shell = document.createElement('div');
    shell.className = 'plugin-shell';
    shell.innerHTML = '<h3>Workspace</h3><p>Build your plugin UI here.</p>';
    mount.appendChild(shell);
  },
  { title: 'My Plugin Workspace' }
);
```

---

### `openPluginPopup`

Opens a standalone plugin popup window.

| | |
|---|---|
| **Parameters** | `pluginName` (string)<br>`options` (object, optional) — `{ title, width, height, html }` |
| **Returns** | `Promise<{ ok: boolean, popupId: string, title: string, width: number, height: number }>` |
| **Description** | Creates a dedicated Electron `BrowserWindow` for plugin workspace content. Useful when operators want a detached control panel. |

```javascript
await window.PluginUtils.openPluginPopup('MyPlugin', {
  title: 'My Plugin Popout',
  width: 1000,
  height: 700,
  html: '<div class="plugin-window-shell"><h1>Popout UI</h1></div>'
});
```

---

### `fetchJson`

Fetches a URL and returns parsed JSON.

| | |
|---|---|
| **Parameters** | `url` (string) — the URL to fetch<br>`opts` (object, optional) — extra fetch options, merged with defaults |
| **Returns** | `Promise<any>` — parsed JSON response |
| **Description** | Sets `Accept: application/json` by default. Throws on non-2xx responses, including the status code and response body in the error message. |

```javascript
const data = await window.PluginUtils.fetchJson('https://api.example.com/stats');
```

---

### `requestDashboardRefresh`

Triggers a debounced dashboard refresh.

| | |
|---|---|
| **Parameters** | `reason` (string, optional) — logged if the refresh fails |
| **Returns** | `void` |
| **Description** | Waits 200ms (debounced) then reloads the dashboard for the current scene. Most setter functions already call this internally, so you only need it if you're doing something custom. |

```javascript
window.PluginUtils.requestDashboardRefresh('updated overlay config');
```

---

## Plugin Management

Accessed via `window.CustomHandlerPlugins`.

### `register`

| | |
|---|---|
| **Parameters** | `plugin` (object) — your plugin object |
| **Returns** | `void` |
| **Description** | Registers a plugin with the system. Call at the end of your plugin file. |

```javascript
window.CustomHandlerPlugins.register(MyPlugin);
```

---

### `unregister`

| | |
|---|---|
| **Parameters** | `plugin` (object) — the plugin to remove |
| **Returns** | `void` |

---

### `getRegisteredPlugins`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `Array<object>` — all registered plugins |

---

### `GetBuiltInPlugins`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `Array<object>` — built-in plugins only |

---

### `GetExternalPlugins`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `Array<object>` — user plugins only |

---

### `GetAllPlugins`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `Array<object>` — all plugins (built-in + external) |

---

### `GetPluginDirectory`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `string` — absolute path to the plugins folder |

---

### `LoadExternalPlugins`

| | |
|---|---|
| **Parameters** | none |
| **Returns** | `void` |
| **Description** | Force-reloads all external plugins from disk. |

---

## Plugin Files

Accessed via `window.pluginAPI`.

### `readFile`

| | |
|---|---|
| **Parameters** | `relativePath` (string) — file path relative to the `plugins` folder |
| **Returns** | `Promise<string>` — file contents as text |
| **Description** | Reads a file from the plugins directory. Paths containing `..` are rejected. |

```javascript
const raw = await window.pluginAPI.readFile('MyPlugin.json');
const config = JSON.parse(raw);
```

---

### `openPopup`

Low-level popup window API. Most plugins should prefer `PluginUtils.openPluginPopup`.

| | |
|---|---|
| **Parameters** | `payload` (object) — `{ pluginName, title, width, height, html }` |
| **Returns** | `Promise<{ ok: boolean, title: string, width: number, height: number }>` |

```javascript
await window.pluginAPI.openPopup({
  pluginName: 'MyPlugin',
  title: 'My Plugin Popout',
  width: 980,
  height: 700,
  html: '<div class="plugin-window-shell">Detached controls</div>'
});
```

---

## Logging

Accessed via `window.uiHelpers`. All take `(message, tag)` where tag is an optional category string.

### `logInfo`

| | |
|---|---|
| **Parameters** | `message` (string), `tag` (string, optional) |
| **Description** | Blue info message in the app console. |

### `logSuccess`

| | |
|---|---|
| **Parameters** | `message` (string), `tag` (string, optional) |
| **Description** | Green success message. |

### `logWarn`

| | |
|---|---|
| **Parameters** | `message` (string), `tag` (string, optional) |
| **Description** | Yellow warning message. |

### `logError`

| | |
|---|---|
| **Parameters** | `message` (string), `tag` (string, optional) |
| **Description** | Red error message. |

```javascript
window.uiHelpers.logInfo('Plugin loaded', 'myplugin');
window.uiHelpers.logError('Something broke: ' + err.message, 'myplugin');
```

---

## OBS API (Direct)

Lower-level OBS WebSocket calls via `window.obsAPI`. PluginUtils are for convenience.

| Function | Description |
|----------|-------------|
| `obsAPI.sources.setSettings(name, settings)` | Set arbitrary source settings |
| `obsAPI.sources.getSettings(name)` | Get source settings |
| `obsAPI.sources.setVolume(name, multiplier)` | Set volume (0.0 - 1.0) |
| `obsAPI.sources.getVolume(name)` | Get volume info |
| `obsAPI.sources.getMute(name)` | Get mute state |
| `obsAPI.sources.setMute(name, muted)` | Set mute state |
| `obsAPI.browser.setUrl(name, url)` | Set browser source URL |
| `obsAPI.browser.getUrl(name)` | Get browser source URL |
| `obsAPI.browser.refresh(name)` | Refresh browser source (no cache) |
| `obsAPI.scenes.get()` | Get scene list |
| `obsAPI.scenes.change(name)` | Switch to a scene |
| `obsAPI.media.toggle(name)` | Toggle media playback |
| `obsAPI.media.stop(name)` | Stop media playback |
| `obsAPI.media.restart(name)` | Restart media from beginning |
| `obsAPI.sceneItems.list(sceneName)` | List scene items |
| `obsAPI.sceneItems.setEnabled(scene, itemId, enabled)` | Enable/disable a scene item |

---

## Additional Resources

- [Plugin Overview](./pluginoverview.md) — how plugins work, lifecycle, structure
- [Example Plugin](./example-plugin.md) — full working plugin with comments
- [OBS WebSocket Protocol](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)
