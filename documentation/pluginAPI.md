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
    - [LoadExternalPlugins](#loadexternalplugins)
- [OBS API](#OBS-API)
    - [SetSettings](#setsettings)
    - [RefreshBrowserNoCache](#refresh)
    - [ChangeScene](#changescene)

# Dashboard

Functions to change the appearance and functionality of a source in the Dashboard.

## applyRowBackground

Applies a background color to the row of a source in the Dashboard.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `optionsEl`      | The options element for the source.              |
| `rowBg`          | The color to apply as the background (e.g., `#b39544`). |

#### Example
```javascript
window.PluginUtils.applyRowBackground(options, '#b39544');
```

## applySourceIcon
Changes the icon of a source in the Dashboard.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `optionsEl`      | The options element for the source.              |
| `icon`           | The icon to apply (e.g., `📺`).                  |

#### Example
```javascript
window.PluginUtils.applySourceIcon(options, '📺');
```

## log

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `message`        | The message to log in the app console.           |

#### Example
```javascript
window.uiHelpers?.log('🔌 Plugin attempting registration...');
```

# Plugin-Management
Used to manage everything related to plugins, registering, removing etc.

## register
Necessary step to make a plugin. you can add this at the end of your plugin file.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `plugin`         | The plugin to register.                          |

#### Example
```javascript
window.CustomHandlerPlugins.register(plugin);
```

## unregister
Removes a plugin from the registry.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `plugin`         | The plugin to unregister.                        |

#### Example
```javascript
window.CustomHandlerPlugins.unregister(plugin);
```

## getRegisteredPlugins
Returns an array of all registered plugins.

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all registered plugins.                |

#### Example
```javascript
window.CustomHandlerPlugins.getRegisteredPlugins();
```

# Debug

## GetBuiltInPlugins
Returns an array of all built-in plugins.

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all built-in plugins.                  |

#### Example
```javascript
window.CustomHandlerPlugins.GetBuiltInPlugins();
```

## GetExternalPlugins
Returns an array of all external plugins.

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all external plugins.                  |

#### Example
```javascript
window.CustomHandlerPlugins.GetExternalPlugins();
```

## GetAllPlugins
Returns an array of all plugins (both built-in and external).

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `Array`        | An array of all plugins.                         |

#### Example
```javascript
window.CustomHandlerPlugins.GetAllPlugins();
```

## GetPluginDirectory
Returns the directory where plugins are stored.

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `String`       | The directory where plugins are stored.            |

#### Example
```javascript
window.CustomHandlerPlugins.GetPluginDirectory();
```

## LoadExternalPlugins
Reloads all external plugins.

**returns**
| Type           | Description                                      |
|----------------|--------------------------------------------------|
| `void`         | Nothing.                                         |

#### Example
```javascript
window.CustomHandlerPlugins.LoadExternalPlugins();
```

# OBS-API

## SetSettings
Sets the settings for a source.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sourceName`     | The name of the source.                          |
| `settings`       | The settings to apply.                           |

#### Example
```javascript
window.obsAPI.SetSettings('my-source', { key: 'value' });
```

## RefreshBrowserNoCache
Refreshes a browser source without cache.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sourceName`     | The name of the source.                          |

#### Example
```javascript
window.obsAPI.RefreshBrowserNoCache('my-browser-source');
```

## ChangeScene
Changes the current scene.

| Parameter        | Description                                      |
|------------------|--------------------------------------------------|
| `sceneName`      | The name of the scene to change to.              |

#### Example
```javascript
window.obsAPI.ChangeScene('my-scene');
```
