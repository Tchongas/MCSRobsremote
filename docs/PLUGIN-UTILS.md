# Plugin Utils (window.PluginUtils)

This document describes the helper functions available via `window.PluginUtils` for **handler plugins** (built-in and external).

## Where this lives

- Implementation: `renderer/logic/handlers/PluginUtils.js`
- Global object: `window.PluginUtils`

## Important concepts

### Source “enabled/visibility” == Scene Item Enabled

In this app, a source being “visible” in a scene is controlled by **scene item enabled state** (OBS request: `SetSceneItemEnabled`).

That means:

- `setSourceEnabled(...)` / `getSourceEnabled(...)` operate on the **current scene’s scene item** for `sourceName`.
- If the same `sourceName` exists in multiple scenes, you must specify which scene you mean.

If `sceneName` is omitted, the utils will attempt to use the scene currently selected in the UI (`#sceneSelect`).

## API Reference

### Layout / UI helpers

#### `applyRowBackground(optionsEl, rowBg)`

Applies a background color/style to the parent dashboard row that owns a given options element.

- **Parameters**
  - `optionsEl` *(HTMLElement)*: The options container element passed into a handler/plugin.
  - `rowBg` *(string)*: Any valid CSS background value.
- **Returns**
  - *(boolean)*: `true` if the row was found and updated.

#### `applySourceIcon(optionsEl, icon)`

Sets the “source icon” text (emoji/character) shown next to a dashboard item.

- **Parameters**
  - `optionsEl` *(HTMLElement)*: The options container element.
  - `icon` *(string)*: Icon text to display.
- **Returns**
  - *(boolean)*: `true` if the icon element was found and updated.

### Network helpers

#### `fetchJson(url, opts)`

Fetches JSON from a URL.

- **Parameters**
  - `url` *(string)*: The URL to request.
  - `opts` *(object?)*: Optional `fetch()` options.
- **Returns**
  - *(any)*: Parsed JSON.
- **Throws**
  - `Error("HTTP <status>")` if response is not OK.

### Text sources

#### `setTextSource(sourceName, text)`

Sets the `text` field on a text source’s input settings.

- **Parameters**
  - `sourceName` *(string)*: OBS input name.
  - `text` *(string | number | null)*: Will be converted to string.
- **Returns**
  - *(Promise<void>)*

#### `getSourceText(sourceName)`

Reads `inputSettings.text` from an input.

- **Parameters**
  - `sourceName` *(string)*
- **Returns**
  - *(Promise<string>)*: The current text value (empty string if missing).

### Browser sources (URL)

#### `setSourceURL(sourceName, url)`

Sets the URL for a browser source.

- **Parameters**
  - `sourceName` *(string)*
  - `url` *(string)*
- **Returns**
  - *(Promise<void>)*

#### `getSourceURL(sourceName)`

Gets the URL for a browser source.

- **Parameters**
  - `sourceName` *(string)*
- **Returns**
  - *(Promise<string|null>)*: URL string, or `null` if the backend determines it is not a browser source.

### Audio (volume)

#### `setSourceVolume(sourceName, volume)`

Sets volume for an input.

- If `volume` is `0..1`, it is treated as OBS multiplier.
- If `volume` is `> 1`, it is treated as `0..100` percent.

- **Parameters**
  - `sourceName` *(string)*
  - `volume` *(number)*: multiplier or percent.
- **Returns**
  - *(Promise<void>)*
- **Throws**
  - `Error('Invalid volume')` if not a finite number.

#### `getSourceVolume(sourceName)`

Gets the current volume multiplier.

- **Parameters**
  - `sourceName` *(string)*
- **Returns**
  - *(Promise<number>)*: `inputVolumeMul` (typically `0..1`).

#### `getSourceVolumePercent(sourceName)`

Convenience helper: returns current volume as a percent integer.

- **Parameters**
  - `sourceName` *(string)*
- **Returns**
  - *(Promise<number>)*: integer `0..100`.

### Scene item enabled (visibility)

#### `getSourceEnabled(sourceName, sceneName?)`

Checks whether the scene item for `sourceName` is enabled in a scene.

- **Parameters**
  - `sourceName` *(string)*
  - `sceneName` *(string?)*: If omitted, uses current `#sceneSelect` value.
- **Returns**
  - *(Promise<boolean>)*
- **Throws**
  - `Error('Missing scene name')` if no scene context can be determined.
  - `Error('Scene item not found: <name>')` if the source isn’t present in that scene.

#### `setSourceEnabled(sourceName, enabled, sceneName?)`

Enables/disables the scene item for `sourceName` in a scene.

- **Parameters**
  - `sourceName` *(string)*
  - `enabled` *(boolean)*
  - `sceneName` *(string?)*
- **Returns**
  - *(Promise<void>)*

#### `toggleSourceEnabled(sourceName, sceneName?)`

Toggles enabled state and returns the new value.

- **Parameters**
  - `sourceName` *(string)*
  - `sceneName` *(string?)*
- **Returns**
  - *(Promise<boolean>)*: New enabled state.

#### `setSourceVisibility(sourceName, state, sceneName?)`

Alias for `setSourceEnabled(...)` for backward compatibility.

- **Parameters**
  - `sourceName` *(string)*
  - `state` *(boolean)*
  - `sceneName` *(string?)*
- **Returns**
  - *(Promise<void>)*

### Sidebar buttons

These helpers manage buttons in the app sidebar area (`#pluginButtons`).

#### `addControlButton(id, label, onClick, className?)`

Adds a button if it doesn’t already exist.

- **Parameters**
  - `id` *(string)*: DOM id.
  - `label` *(string)*: Button text.
  - `onClick` *(function)*: Click handler.
  - `className` *(string?)*: Defaults to `btn-plugin`.
- **Returns**
  - *(HTMLElement|null)*: The button element, or `null` if host is missing.

#### `removeControlButton(id)`

Removes a button by id.

- **Parameters**
  - `id` *(string)*
- **Returns**
  - *(boolean)*

#### `registerSidebarButton(pluginName, id, label, onClick, className?)`

Same as `addControlButton`, but tracks ownership by `pluginName` so they can be removed in bulk.

- **Returns**
  - *(HTMLElement|null)*

#### `unregisterSidebarButtons(pluginName)`

Removes all sidebar buttons registered by a plugin.

- **Parameters**
  - `pluginName` *(string)*
- **Returns**
  - *(number)*: Count removed.

## Examples

### Toggle a source in the current scene

```js
await window.PluginUtils.toggleSourceEnabled('_MyOverlay');
```

### Force hide a source in a specific scene

```js
await window.PluginUtils.setSourceEnabled('_MyOverlay', false, 'Game');
```

### Update a text source

```js
await window.PluginUtils.setTextSource('_EloText', '1234');
```

### Change browser source URL

```js
await window.PluginUtils.setSourceURL('_BrowserOverlay', 'https://example.com');
```

### Set volume to 25%

```js
await window.PluginUtils.setSourceVolume('_Music', 25);
```
