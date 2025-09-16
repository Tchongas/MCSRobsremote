# Plugin API

# Table of contents

- [Dashboard](#dashboard)
  - [applyRowBackground](#applyrowbackground)
  - [applySourceIcon](#applysourceicon)
  - [log](#log)
- [Plugin Management](#plugin-management)
  - [register](#register)
  - [unregister](#unregister)
  - [getRegisteredPlugins](#getregisteredplugins)
- [Debug](#debug)
  - [GetBuiltInPlugins](#getbuiltinplugins)
  - [GetExternalPlugins](#getexternalplugins)
  - [GetAllPlugins](#getallplugins)
  - [GetPluginDirectory](#getplugindirectory)
- [OBS API](#obs-api)
  - [SetSettings](#setsettings)
  - [🔄 RefreshBrowserNoCache(sourceName)](#refreshbrowsernocache)
  - [🎬 ChangeScene(sceneName)](#changescene)

## Dashboard

Functions to change the appearance and functionality of a source in the Dashboard.

## 🎨 applyRowBackground(optionsEl, rowBg)

Applies a background color to the row of a source in the Dashboard.

### Signature

`applyRowBackground(optionsEl, rowBg)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `optionsEl`      | The options element for the source.              |
| `rowBg`          | The color to apply as the background (e.g., `#b39544`). |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.PluginUtils.applyRowBackground(options, '#b39544');
```

---

## 🖼️ applySourceIcon(optionsEl, icon)

Changes the icon of a source in the Dashboard.

### Signature

`applySourceIcon(optionsEl, icon)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `optionsEl`      | The options element for the source.              |
| `icon`           | The icon to apply (e.g., `📺`).                  |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.PluginUtils.applySourceIcon(options, '📺');
```

---

## 📝 log(message)

Logs a message to the app console via UI helpers.

### Signature

`log(message)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `message`        | The message to log in the app console.           |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.uiHelpers?.log('🔌 Plugin attempting registration...');
```

---

## Plugin Management

Used to manage everything related to plugins, registering, removing etc.

## 🔌 register(plugin)

Necessary step to make a plugin. You can add this at the end of your plugin file.

### Signature

`register(plugin)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `plugin`         | The plugin to register.                          |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.CustomHandlerPlugins.register(plugin);
```

---

## 🧹 unregister(plugin)

Removes a plugin from the registry.

### Signature

`unregister(plugin)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `plugin`         | The plugin to unregister.                        |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.CustomHandlerPlugins.unregister(plugin);
```

---

## 📋 getRegisteredPlugins()

Returns an array of all registered plugins.

### Signature

`getRegisteredPlugins()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all registered plugins.                |

#### Example

```javascript
window.CustomHandlerPlugins.getRegisteredPlugins();
```

---

## Debug

## GetBuiltInPlugins

Returns an array of all built-in plugins.

### Signature

`GetBuiltInPlugins()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all built-in plugins.                  |

#### Example

```javascript
window.CustomHandlerPlugins.GetBuiltInPlugins();
```

---

## 📦 GetExternalPlugins()

Returns an array of all external plugins.

### Signature

`GetExternalPlugins()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all external plugins.                  |

#### Example

```javascript
window.CustomHandlerPlugins.GetExternalPlugins();
```

---

## 🧰 GetAllPlugins()

Returns an array of all plugins (both built-in and external).

### Signature

`GetAllPlugins()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all plugins.                         |

#### Example

```javascript
window.CustomHandlerPlugins.GetAllPlugins();
```

---

## 📁 GetPluginDirectory()

Returns the directory where plugins are stored.

### Signature

`GetPluginDirectory()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `String`       | The directory where plugins are stored.            |

#### Example

```javascript
window.CustomHandlerPlugins.GetPluginDirectory();
```

---

## ♻️ LoadExternalPlugins()

Reloads all external plugins.

### Signature

`LoadExternalPlugins()`

### Returns

| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `void`         | Nothing.                                         |

#### Example

```javascript
window.CustomHandlerPlugins.LoadExternalPlugins();
```

---

## OBS API

## SetSettings

Sets the settings for a source.

### Signature

`SetSettings(sourceName, settings)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sourceName`     | The name of the source.                          |
| `settings`       | The settings to apply.                           |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.obsAPI.SetSettings('my-source', { key: 'value' });
```

---

## 🔄 RefreshBrowserNoCache(sourceName)

Refreshes a browser source without cache.

### Signature

`RefreshBrowserNoCache(sourceName)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sourceName`     | The name of the source.                          |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.obsAPI.RefreshBrowserNoCache('my-browser-source');
```

---

## 🎬 ChangeScene(sceneName)

Changes the current scene.

### Signature

`ChangeScene(sceneName)`

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sceneName`      | The name of the scene to change to.              |

### Returns

| Type   | Description |
|--------|-------------|
| `void` | Nothing.    |

#### Example

```javascript
window.obsAPI.ChangeScene('my-scene');
```
