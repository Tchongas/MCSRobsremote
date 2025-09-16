# Plugin API Reference

[![OBS Remote](https://img.shields.io/badge/OBS-Remote-blue.svg)](https://github.com/Tchongas/MCSRobsremote)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Plugin System](https://img.shields.io/badge/Plugin-System-green.svg)](#plugin-management)

> **The Plugin Api for rOBSon.**

## Table of Contents

- [🎨 Dashboard API](#dashboard-api)
  - [`applyRowBackground()`](#applyrowbackground)
  - [`applySourceIcon()`](#applysourceicon)
  - [`log()`](#log)
- [🔌 Plugin Management](#plugin-management)
  - [`register()`](#register)
  - [`unregister()`](#unregister)
  - [`getRegisteredPlugins()`](#getregisteredplugins)
- [🐛 Debug API](#debug-api)
  - [`GetBuiltInPlugins()`](#getbuiltinplugins)
  - [`GetExternalPlugins()`](#getexternalplugins)
  - [`GetAllPlugins()`](#getallplugins)
  - [`GetPluginDirectory()`](#getplugindirectory)
  - [`LoadExternalPlugins()`](#loadexternalplugins)
- [📺 OBS API](#obs-api)
  - [`SetSettings()`](#setsettings)
  - [`RefreshBrowserNoCache()`](#refreshbrowsernocache)
  - [`ChangeScene()`](#changescene)

# 🎨 Dashboard API

The Dashboard API provides functions to customize the appearance and functionality of sources in the OBS Remote dashboard interface.

### `applyRowBackground()`

Applies a custom background color to a source row in the dashboard.

#### Syntax

```javascript
window.PluginUtils.applyRowBackground(optionsEl, rowBg)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `optionsEl` | `HTMLElement` | The options element for the source |
| `rowBg` | `string` | The color to apply as background (e.g., `#b39544`) |

#### Returns

`void`

#### Example

```javascript
// Apply a golden background to a source row
window.PluginUtils.applyRowBackground(options, '#b39544');
```

---

### `applySourceIcon()`

Changes the icon displayed for a source in the dashboard.

#### Syntax

```javascript
window.PluginUtils.applySourceIcon(optionsEl, icon)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `optionsEl` | `HTMLElement` | The options element for the source |
| `icon` | `string` | The icon to apply (emoji or text) |

#### Returns

`void`

#### Example

```javascript
// Set a TV emoji as the source icon
window.PluginUtils.applySourceIcon(options, '📺');
```

---

### `log()`

Logs a message to the application console with plugin context.

#### Syntax

```javascript
window.uiHelpers?.log(message)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `message` | `string` | The message to log to the console |

#### Returns

`void`

#### Example

```javascript
// Log a plugin registration message
window.uiHelpers?.log('🔌 Plugin attempting registration...');
```

# 🔌 Plugin Management

The Plugin Management API handles plugin lifecycle operations including registration, removal, and discovery.

### `register()`

Registers a plugin with the system. This is a required step for plugin activation and should be called at the end of your plugin file.

#### Syntax

```javascript
window.CustomHandlerPlugins.register(plugin)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `plugin` | `Object` | The plugin object to register |

#### Returns

`void`

#### Example

```javascript
// Register your plugin
const myPlugin = {
  name: 'MyAwesomePlugin',
  version: '1.0.0',
  // ... plugin implementation
};

window.CustomHandlerPlugins.register(myPlugin);
```

---

### `unregister()`

Removes a plugin from the active registry.

#### Syntax

```javascript
window.CustomHandlerPlugins.unregister(plugin)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `plugin` | `Object` | The plugin object to unregister |

#### Returns

`void`

#### Example

```javascript
// Unregister a plugin
window.CustomHandlerPlugins.unregister(myPlugin);
```

---

### `getRegisteredPlugins()`

Retrieves an array of all currently registered plugins.

#### Syntax

```javascript
window.CustomHandlerPlugins.getRegisteredPlugins()
```

#### Parameters

None

#### Returns

| Type | Description |
|------|--------------|
| `Array<Object>` | Array of all registered plugin objects |

#### Example

```javascript
// Get all registered plugins
const plugins = window.CustomHandlerPlugins.getRegisteredPlugins();
console.log(`Found ${plugins.length} registered plugins`);
```

# 🐛 Debug API

The Debug API provides utilities for plugin development, testing, and system introspection.

### `GetBuiltInPlugins()`

Retrieves all built-in plugins that come with the application.

#### Syntax

```javascript
window.CustomHandlerPlugins.GetBuiltInPlugins()
```

#### Parameters

None

#### Returns

| Type | Description |
|------|--------------|
| `Array<Object>` | Array of built-in plugin objects |

#### Example

```javascript
// Get all built-in plugins
const builtInPlugins = window.CustomHandlerPlugins.GetBuiltInPlugins();
console.log('Built-in plugins:', builtInPlugins);
```

---

### `GetExternalPlugins()`

Retrieves all external plugins loaded from the plugins directory.

#### Syntax

```javascript
window.CustomHandlerPlugins.GetExternalPlugins()
```

#### Parameters

None

#### Returns

| Type | Description |
|------|--------------|
| `Array<Object>` | Array of external plugin objects |

#### Example

```javascript
// Get all external plugins
const externalPlugins = window.CustomHandlerPlugins.GetExternalPlugins();
console.log('External plugins:', externalPlugins);
```

---

### `GetAllPlugins()`

Retrieves all plugins (both built-in and external) available in the system.

#### Syntax

```javascript
window.CustomHandlerPlugins.GetAllPlugins()
```

#### Parameters

None

#### Returns

| Type | Description |
|------|--------------|
| `Array<Object>` | Array of all plugin objects |

#### Example

```javascript
// Get all plugins
const allPlugins = window.CustomHandlerPlugins.GetAllPlugins();
console.log(`Total plugins: ${allPlugins.length}`);
```

---

### `GetPluginDirectory()`

Retrieves the file system path where external plugins are stored.

#### Syntax

```javascript
window.CustomHandlerPlugins.GetPluginDirectory()
```

#### Parameters

None

#### Returns

| Type | Description |
|------|--------------|
| `string` | Absolute path to the plugins directory |

#### Example

```javascript
// Get plugin directory path
const pluginDir = window.CustomHandlerPlugins.GetPluginDirectory();
console.log('Plugins are stored in:', pluginDir);
```

---

### `LoadExternalPlugins()`

Reloads all external plugins from the plugins directory. Useful for development and hot-reloading.

#### Syntax

```javascript
window.CustomHandlerPlugins.LoadExternalPlugins()
```

#### Parameters

None

#### Returns

`void`

#### Example

```javascript
// Reload all external plugins
window.CustomHandlerPlugins.LoadExternalPlugins();
console.log('External plugins reloaded');
```

# 📺 OBS API

The OBS API provides direct integration with OBS Studio functionality, allowing plugins to control scenes, sources, and settings.

### `SetSettings()`

Updates the settings for a specific OBS source.

#### Syntax

```javascript
window.obsAPI.SetSettings(sourceName, settings)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `sourceName` | `string` | The name of the OBS source |
| `settings` | `Object` | Settings object to apply to the source |

#### Returns

`void`

#### Example

```javascript
// Update browser source settings
window.obsAPI.SetSettings('my-browser-source', {
  url: 'https://example.com',
  width: 1920,
  height: 1080
});

// Update text source settings
window.obsAPI.SetSettings('my-text-source', {
  text: 'Hello World!',
  color: 0xFFFFFF
});
```

---

### `RefreshBrowserNoCache()`

Refreshes a browser source, bypassing the cache to ensure fresh content.

#### Syntax

```javascript
window.obsAPI.RefreshBrowserNoCache(sourceName)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `sourceName` | `string` | The name of the browser source to refresh |

#### Returns

`void`

#### Example

```javascript
// Refresh a browser source without cache
window.obsAPI.RefreshBrowserNoCache('my-browser-source');
```

---

### `ChangeScene()`

Switches the current active scene in OBS Studio.

#### Syntax

```javascript
window.obsAPI.ChangeScene(sceneName)
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|--------------|
| `sceneName` | `string` | The name of the scene to switch to |

#### Returns

`void`

#### Example

```javascript
// Switch to a specific scene
window.obsAPI.ChangeScene('Gaming Scene');

// Switch to break scene
window.obsAPI.ChangeScene('BRB Screen');
```

---

## 📚 Additional Resources

- [Plugin Development Guide](./pluginoverview.md)
- [Example Plugin](../plugins/ExamplePlugin.js)
- [OBS WebSocket Documentation](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)

## 🤝 Contributing

Found an issue with this documentation? Please [open an issue](https://github.com/Tchongas/MCSRobsremote/issues) or submit a pull request.

---
