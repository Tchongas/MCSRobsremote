# Plugin Utils Reference

---

## Table of Contents

- [OBS Events](#obs-events)
  - [InputVolumeChanged](#inputvolumechanged)
  - [InputAudioBalanceChanged](#inputaudiobalancechanged)
- [PluginUtils](#pluginutils)
  - [Volume Controls](#volume-controls)
  - [Hotkeys](#hotkeys)
  - [Source Management](#source-management)
  - [Scene Items](#scene-items)
  - [Text Sources](#text-sources)
  - [Browser Sources](#browser-sources)
  - [Sidebar Buttons](#sidebar-buttons)
  - [Configuration](#configuration)
  - [Utility Functions](#utility-functions)
- [PluginCreateUtils](#plugincreateutils)
- [PluginWorkspaceUtils](#pluginworkspaceutils)

---

## OBS Events

Events that can be subscribed to via `window.obsAPI.onEvent()` or the vendor event system.

### InputVolumeChanged

An input's volume level has changed.

**Data Fields:**

| Name | Type | Description |
|------|------|-------------|
| inputName | String | Name of the input |
| inputUuid | String | UUID of the input |
| inputVolumeMul | Number | New volume level multiplier (0.0 - 1.0) |
| inputVolumeDb | Number | New volume level in dB |

```javascript
// Listen for volume changes
window.obsAPI.onEvent((evt) => {
  if (evt.type === 'input-volume-changed') {
    console.log(`${evt.data.inputName} volume: ${evt.data.inputVolumeMul}`);
  }
});
```

### InputAudioBalanceChanged

The audio balance value of an input has changed.

**Data Fields:**

| Name | Type | Description |
|------|------|-------------|
| inputName | String | Name of the input |
| inputUuid | String | UUID of the input |
| inputAudioBalance | Number | New audio balance value of the input (-1.0 to 1.0) |

```javascript
// Listen for balance changes
window.obsAPI.onEvent((evt) => {
  if (evt.type === 'input-mute-changed') {
    console.log(`${evt.data.inputName} muted: ${evt.data.inputMuted}`);
  }
});
```

---

## PluginUtils

Core utilities for plugin development. Available via `window.PluginUtils`.

---

### Volume Controls

#### `setSourceVolume(sourceName, volume)`

Set the volume of an audio source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the audio source |
| volume | Number | Volume level (0-100 or 0.0-1.0) |

```javascript
// Set volume to 75%
await window.PluginUtils.setSourceVolume('Microphone', 75);
```

#### `getSourceVolume(sourceName)`

Get the current volume multiplier of a source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the audio source |

**Returns:** `Number` - Volume multiplier (0.0 - 1.0)

```javascript
const volume = await window.PluginUtils.getSourceVolume('Microphone');
console.log(`Volume: ${volume * 100}%`);
```

#### `getSourceVolumePercent(sourceName)`

Get the current volume as a percentage.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the audio source |

**Returns:** `Number` - Volume percentage (0-100)

```javascript
const percent = await window.PluginUtils.getSourceVolumePercent('Microphone');
```

#### `createVolumeControl(opts)`

Create a volume control UI component with slider, mute button, and numeric input.

| Parameter | Type | Description |
|-----------|------|-------------|
| opts.sourceName | String | Source name to control |
| opts.displayName | String | Display name for labels |
| opts.logTag | String | Optional log tag (default: 'audio') |

**Returns:** `{ container, slider, numInput, muteBtn, applyMuteVisual, setVolume }`

```javascript
const control = window.PluginUtils.createVolumeControl({
  sourceName: 'Desktop Audio',
  displayName: 'Desktop',
  logTag: 'desktop'
});
document.body.appendChild(control.container);
```

---

### Hotkeys

#### `listHotkeys()`

Get an array of all hotkey names registered in OBS.

**Returns:** `Array<String>` - Array of hotkey names

```javascript
const hotkeys = await window.PluginUtils.listHotkeys();
console.log('Available hotkeys:', hotkeys);
```

#### `triggerHotkeyByName(hotkeyName, contextName?)`

Trigger a hotkey by its registered name.

| Parameter | Type | Description |
|-----------|------|-------------|
| hotkeyName | String | Name of the hotkey to trigger |
| contextName | String | Optional context name |

```javascript
// Trigger a streamlink hotkey
await window.PluginUtils.triggerHotkeyByName('streamlink.start_all');
```

#### `triggerHotkeyBySequence(keyId, keyModifiers?)`

Trigger a hotkey using a key sequence.

| Parameter | Type | Description |
|-----------|------|-------------|
| keyId | String | OBS key ID (e.g., 'OBS_KEY_F1') |
| keyModifiers | Object | Optional modifiers: `{ shift, control, alt, command }` |

```javascript
// Trigger Ctrl+Shift+S
await window.PluginUtils.triggerHotkeyBySequence('OBS_KEY_S', {
  control: true,
  shift: true
});
```

---

### Source Management

#### `setSourceEnabled(sourceName, enabled, sceneName?)`

Enable or disable (show/hide) a source in a scene.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| enabled | Boolean | Whether the source should be visible |
| sceneName | String | Optional scene name (uses current if omitted) |

```javascript
// Hide a source
await window.PluginUtils.setSourceEnabled('Overlay', false, 'Gameplay');
```

#### `getSourceEnabled(sourceName, sceneName?)`

Check if a source is currently enabled (visible).

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| sceneName | String | Optional scene name |

**Returns:** `Boolean`

```javascript
const isVisible = await window.PluginUtils.getSourceEnabled('Overlay');
```

#### `toggleSourceEnabled(sourceName, sceneName?)`

Toggle the visibility of a source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| sceneName | String | Optional scene name |

**Returns:** `Boolean` - New enabled state

```javascript
const newState = await window.PluginUtils.toggleSourceEnabled('Overlay');
```

---

### Scene Items

#### `listSceneItems(sceneName?)`

List all items in a scene.

| Parameter | Type | Description |
|-----------|------|-------------|
| sceneName | String | Optional scene name (uses current if omitted) |

**Returns:** `Array<SceneItem>`

```javascript
const items = await window.PluginUtils.listSceneItems('Gameplay');
items.forEach(item => {
  console.log(`${item.sourceName}: ${item.sceneItemEnabled ? 'visible' : 'hidden'}`);
});
```

#### `getSourceSceneItem(sourceName, sceneName?)`

Get scene item info for a specific source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| sceneName | String | Optional scene name |

**Returns:** `SceneItem`

```javascript
const item = await window.PluginUtils.getSourceSceneItem('Webcam', 'Gameplay');
console.log('Scene Item ID:', item.sceneItemId);
```

#### `getSourceTransform(sourceName, sceneName?)`

Get the transform (position, scale, rotation) of a source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| sceneName | String | Optional scene name |

**Returns:** `Object` - Transform properties

```javascript
const transform = await window.PluginUtils.getSourceTransform('Webcam');
console.log(`Position: ${transform.positionX}, ${transform.positionY}`);
```

#### `setSourceTransform(sourceName, transform, sceneName?, options?)`

Set the transform of a source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the source |
| transform | Object | Transform properties |
| sceneName | String | Optional scene name |
| options.refreshDashboard | Boolean | Refresh dashboard after setting |

```javascript
await window.PluginUtils.setSourceTransform('Webcam', {
  positionX: 100,
  positionY: 200,
  scaleX: 1.5,
  scaleY: 1.5
}, 'Gameplay', { refreshDashboard: true });
```

#### `setSourcePosition(sourceName, x, y, sceneName?, options?)`

Convenience method to set only the position.

```javascript
await window.PluginUtils.setSourcePosition('Webcam', 1920, 1080);
```

---

### Text Sources

#### `setTextSource(sourceName, text)`

Set the text content of a text source (GDI+ or FreeType).

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the text source |
| text | String | Text content to set |

```javascript
await window.PluginUtils.setTextSource('Timer', '00:15:32');
```

#### `getSourceText(sourceName)`

Get the current text content of a text source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the text source |

**Returns:** `String`

```javascript
const currentText = await window.PluginUtils.getSourceText('Timer');
```

---

### Browser Sources

#### `setSourceURL(sourceName, url)`

Set the URL of a browser source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the browser source |
| url | String | URL to load |

```javascript
await window.PluginUtils.setSourceURL('Overlay', 'https://example.com/overlay.html');
```

#### `getSourceURL(sourceName)`

Get the current URL of a browser source.

| Parameter | Type | Description |
|-----------|------|-------------|
| sourceName | String | Name of the browser source |

**Returns:** `String`

```javascript
const url = await window.PluginUtils.getSourceURL('Overlay');
```

#### `swapSourceURLs(sourceA, sourceB)`

Swap the URLs between two browser sources.

```javascript
await window.PluginUtils.swapSourceURLs('Overlay1', 'Overlay2');
```

#### `buildUrlWithParams(baseUrl, params)`

Build a URL with query parameters.

| Parameter | Type | Description |
|-----------|------|-------------|
| baseUrl | String | Base URL |
| params | Object | Key-value pairs for query string |

**Returns:** `String`

```javascript
const url = window.PluginUtils.buildUrlWithParams(
  'https://example.com/overlay',
  { user: 'john', theme: 'dark' }
);
// Result: https://example.com/overlay?user=john&theme=dark
```

#### `setBrowserSourceUrlWithParams(sourceName, baseUrl, params)`

Set a browser source URL with query parameters.

```javascript
await window.PluginUtils.setBrowserSourceUrlWithParams(
  'Overlay',
  'https://example.com/overlay',
  { user: 'john', refresh: Date.now() }
);
```

---

### Sidebar Buttons

#### `registerSidebarButton(pluginName, id, label, onClick, classNameOrOptions)`

Register a button in the sidebar for your plugin.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin's name |
| id | String | Unique button ID |
| label | String | Button label text |
| onClick | Function | Click handler |
| classNameOrOptions | String/Object | CSS class or options object |

**Options object:**

| Property | Type | Description |
|----------|------|-------------|
| icon | String | Emoji or icon character |
| tint | String | Color tint: 'green', 'blue', 'yellow', 'red', etc. |

```javascript
window.PluginUtils.registerSidebarButton(
  'MyPlugin',
  'myplugin_action',
  'Run Action',
  async () => {
    await doSomething();
  },
  { icon: '▶', tint: 'green' }
);
```

#### `unregisterSidebarButtons(pluginName)`

Remove all sidebar buttons for a plugin.

```javascript
window.PluginUtils.unregisterSidebarButtons('MyPlugin');
```

---

### Configuration

#### `readJsonConfig(nameOrFile, defaults?, options?)`

Read and parse a JSON configuration file from the plugin folder.

| Parameter | Type | Description |
|-----------|------|-------------|
| nameOrFile | String | Filename (with or without .json extension) |
| defaults | Object | Default values if file doesn't exist |
| options | Object | Options including `pluginAPI` |

**Returns:** `Object`

```javascript
const config = await window.PluginUtils.readJsonConfig('settings', {
  apiUrl: 'https://default.com',
  timeout: 5000
});
```

#### `parseSimpleYaml(yamlText)`

Parse simple YAML configuration text.

| Parameter | Type | Description |
|-----------|------|-------------|
| yamlText | String | YAML content to parse |

**Returns:** `Object`

```javascript
const config = window.PluginUtils.parseSimpleYaml(`
players:
  - name: Player1
    seed: 12345
  - name: Player2
    seed: 67890
`);
```

#### `readYamlConfig(defaults?, options?)`

Read YAML configuration from the plugin's config.yaml file.

```javascript
const config = await window.PluginUtils.readYamlConfig({
  defaultTheme: 'dark'
});
```

---

### Utility Functions

#### `fetchJson(url, opts?)`

Fetch JSON data from a URL.

```javascript
const data = await window.PluginUtils.fetchJson('https://api.example.com/data');
```

#### `requestDashboardRefresh(reason?)`

Request a dashboard refresh (debounced, 200ms).

```javascript
window.PluginUtils.requestDashboardRefresh('sourceUpdated');
```

---

### Vendor Requests

#### `callVendorRequest(vendorName, requestType, requestData?)`

Call a vendor-specific OBS request.

| Parameter | Type | Description |
|-----------|------|-------------|
| vendorName | String | Vendor name (e.g., 'obs-browser') |
| requestType | String | Request type identifier |
| requestData | Object | Optional request payload |

```javascript
await window.PluginUtils.callVendorRequest('streamlink-source', 'start_all');
```

#### `onVendorEvent(filter?, callback)`

Subscribe to vendor events from OBS.

| Parameter | Type | Description |
|-----------|------|-------------|
| filter | Object | Optional filter: `{ vendorName, eventType }` |
| callback | Function | Event handler |

**Returns:** `Function` - Unsubscribe function

```javascript
const unsubscribe = window.PluginUtils.onVendorEvent(
  { vendorName: 'my-plugin' },
  (data) => {
    console.log('Vendor event:', data.eventType, data.eventData);
  }
);

// Later: unsubscribe()
```

#### `offVendorEvent(callback)`

Remove a specific vendor event callback.

```javascript
window.PluginUtils.offVendorEvent(myCallback);
```

---

## PluginCreateUtils

Utilities for creating scenes and sources programmatically. Available via `window.PluginCreateUtils`.

### Scene Creation Handlers

#### `registerSceneCreateHandler(pluginName, handlerId, options)`

Register a handler that creates scenes with pre-configured sources.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| handlerId | String | Unique handler ID |
| options.label | String | Display label for the button |
| options.description | String | Tooltip description |
| options.sceneName | String | Suggested scene name |
| options.onCreate | Function | Async function that creates the scene |

```javascript
window.PluginCreateUtils.registerSceneCreateHandler(
  'MyPlugin',
  'create_race_scene',
  {
    label: 'Create Race Scene',
    description: 'Creates a scene with timer and splits',
    sceneName: 'Race Scene',
    onCreate: async () => {
      return await window.PluginCreateUtils.createSceneWithSources(
        'Race Scene',
        [
          { name: 'Timer', kind: 'text_gdiplus_v3', settings: { text: '00:00:00' } },
          { name: 'Splits', kind: 'browser_source', settings: { url: 'http://localhost:3000/splits' } }
        ]
      );
    }
  }
);
```

#### `unregisterSceneCreateHandler(pluginName, handlerId)`

Remove a specific scene creation handler.

```javascript
window.PluginCreateUtils.unregisterSceneCreateHandler('MyPlugin', 'create_race_scene');
```

#### `unregisterAllPluginHandlers(pluginName)`

Remove all handlers for a plugin.

```javascript
window.PluginCreateUtils.unregisterAllPluginHandlers('MyPlugin');
```

### Scene Helpers

#### `createSceneWithSources(sceneName, sources)`

Create a new scene with multiple sources.

| Parameter | Type | Description |
|-----------|------|-------------|
| sceneName | String | Name for the new scene |
| sources | Array | Array of source definitions |

**Source definition:**

| Property | Type | Description |
|----------|------|-------------|
| name | String | Source name (required) |
| kind | String | Source kind, e.g., 'text_gdiplus_v3', 'browser_source' |
| settings | Object | Source-specific settings |
| enabled | Boolean | Whether source is visible (default: true) |

**Returns:** `{ sceneName, created: Array<String>, failed: Array<String> }`

```javascript
const result = await window.PluginCreateUtils.createSceneWithSources(
  'Speedrun Scene',
  [
    { name: 'Timer', kind: 'text_gdiplus_v3', settings: { text: '0:00:00' } },
    { name: 'Game', kind: 'game_capture', settings: { capture_mode: 'any_fullscreen' } },
    { name: 'Splits', kind: 'browser_source', settings: { url: 'http://localhost:16899' } }
  ]
);
console.log(`Created ${result.created.length} sources`);
```

#### `generateUniqueSceneName(baseName, maxAttempts?)`

Generate a unique scene name by appending a number if needed.

| Parameter | Type | Description |
|-----------|------|-------------|
| baseName | String | Desired base name |
| maxAttempts | Number | Max number to try (default: 100) |

**Returns:** `String` - Unique scene name

```javascript
const name = await window.PluginCreateUtils.generateUniqueSceneName('Race Scene');
// Returns 'Race Scene', 'Race Scene 2', 'Race Scene 3', etc.
```

#### `getAllHandlers()` / `getPluginHandlers(pluginName)`

Get registered handlers.

```javascript
const allHandlers = window.PluginCreateUtils.getAllHandlers();
const myHandlers = window.PluginCreateUtils.getPluginHandlers('MyPlugin');
```

---

## PluginWorkspaceUtils

Modal and popup utilities for creating plugin UI workspaces. Available via `window.PluginWorkspaceUtils` (also merged into `window.PluginUtils`).

### Modal Management

#### `openPluginModal(pluginName, options)`

Open a modal dialog for your plugin.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| options.title | String | Modal title |
| options.className | String | CSS class for the mount element |
| options.onClose | Function | Callback when modal closes |
| options.disablePopout | Boolean | Disable popout button |
| options.popupWidth | Number | Width for popout window |
| options.popupHeight | Number | Height for popout window |
| options.popupHtml | String | HTML content for popout |

**Returns:** `{ mount, close, pluginName }`

```javascript
const modal = window.PluginWorkspaceUtils.openPluginModal('MyPlugin', {
  title: 'Plugin Settings',
  className: 'my-plugin-modal',
  onClose: () => console.log('Modal closed')
});

// Add content to modal
modal.mount.innerHTML = '<div>Settings here</div>';

// Close programmatically
modal.close();
```

#### `closePluginModal()`

Close the active plugin modal.

```javascript
window.PluginWorkspaceUtils.closePluginModal();
```

#### `registerModalSidebarButton(pluginName, id, label, onRender, options)`

Register a sidebar button that opens a modal when clicked.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| id | String | Button ID |
| label | String | Button label |
| onRender | Function | Called with `{ mount, close, pluginName }` when modal opens |
| options | Object | Same as `openPluginModal` options plus `buttonClassName` |

```javascript
window.PluginWorkspaceUtils.registerModalSidebarButton(
  'MyPlugin',
  'myplugin_settings',
  'Settings',
  ({ mount, close }) => {
    mount.innerHTML = `
      <div class="settings">
        <label>API Key: <input type="text" id="apiKey"></label>
        <button id="save">Save</button>
      </div>
    `;
    mount.querySelector('#save').addEventListener('click', () => {
      saveSettings();
      close();
    });
  },
  {
    title: 'MyPlugin Settings',
    buttonClassName: { icon: '⚙', tint: 'blue' }
  }
);
```

### Popup Windows

#### `openPluginPopup(pluginName, options)`

Open a separate popup window for your plugin.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| options.title | String | Window title |
| options.width | Number | Window width (default: 920) |
| options.height | Number | Window height (default: 640) |
| options.html | String | HTML content for the popup |

```javascript
await window.PluginWorkspaceUtils.openPluginPopup('MyPlugin', {
  title: 'Advanced Controls',
  width: 800,
  height: 600,
  html: '<div>Your UI here</div>'
});
```

#### `openWorkspacePopup(pluginName, options)`

Open a popup with built-in RPC support.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| options.title | String | Window title |
| options.width | Number | Window width |
| options.height | Number | Window height |
| options.bodyHtml | String | Body HTML content |
| options.script | String | JavaScript to run in popup |
| options.rpcHandlers | Object | RPC method handlers |

```javascript
await window.PluginWorkspaceUtils.openWorkspacePopup('MyPlugin', {
  title: 'Data Editor',
  width: 600,
  height: 400,
  bodyHtml: '<div id="root"></div>',
  script: `
    document.getElementById('root').textContent = 'Hello from popup!';
  `,
  rpcHandlers: {
    getData: () => ({ items: [1, 2, 3] }),
    saveData: (data) => console.log('Saving:', data)
  }
});
```

### RPC (Remote Procedure Call)

#### `registerPopupRpcHandlers(pluginName, handlers)`

Register RPC handlers for popup communication.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| handlers | Object | Method name -> function mapping |

```javascript
window.PluginWorkspaceUtils.registerPopupRpcHandlers('MyPlugin', {
  async fetchUser(id) {
    return await fetch(`/api/users/${id}`).then(r => r.json());
  },
  async saveSettings(settings) {
    localStorage.setItem('settings', JSON.stringify(settings));
    return { ok: true };
  }
});
```

#### `unregisterPopupRpcHandlers(pluginName)`

Remove RPC handlers for a plugin.

```javascript
window.PluginWorkspaceUtils.unregisterPopupRpcHandlers('MyPlugin');
```

### HTML Generation

#### `createPopupHtml(pluginName, options)`

Generate HTML template for popups with built-in plugin host bridge.

| Parameter | Type | Description |
|-----------|------|-------------|
| pluginName | String | Your plugin name |
| options.bodyHtml | String | Body HTML content |
| options.script | String | JavaScript to execute |

**Returns:** `String` - Complete HTML document

```javascript
const html = window.PluginWorkspaceUtils.createPopupHtml('MyPlugin', {
  bodyHtml: '<div id="app"></div>',
  script: `
    const host = window.pluginPopupHost;
    console.log('Context:', host.context);
    host.call('fetchUser', 123).then(data => {
      document.getElementById('app').textContent = data.name;
    });
  `
});
```

---

## Quick Reference

### Common Patterns

```javascript
// Sidebar button with hotkey trigger
window.PluginUtils.registerSidebarButton(
  'StreamlinkPlugin',
  'streamlink_start',
  'Start Stream',
  () => window.PluginUtils.triggerHotkeyByName('streamlink.start_all'),
  { icon: '▶', tint: 'green' }
);

// Text source updates
await window.PluginUtils.setTextSource('Player1Name', 'JohnDoe');

// Browser source with query params
await window.PluginUtils.setBrowserSourceUrlWithParams(
  'Overlay',
  'https://tracker.com/overlay',
  { player: 'john', runId: 12345 }
);

// Volume control
const vol = window.PluginUtils.createVolumeControl({
  sourceName: 'Desktop Audio',
  displayName: 'Desktop'
});
optionsEl.appendChild(vol.container);

// Scene creation template
window.PluginCreateUtils.registerSceneCreateHandler(
  'MyPlugin', 'speedrun_setup',
  {
    label: 'Speedrun Layout',
    onCreate: () => window.PluginCreateUtils.createSceneWithSources(
      'Speedrun',
      [
        { name: 'Timer', kind: 'text_gdiplus_v3' },
        { name: 'Game', kind: 'game_capture' }
      ]
    )
  }
);
```

---

*Generated for OBS Remote Controller v1.6.0*
