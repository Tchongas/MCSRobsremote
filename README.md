<div align="center">

# ROBS — Remote OBS

OBS Tool, made for automation via JS plugins, Remote control via websocket and more
Made for more professional use cases, but not that profesional that you use the actual tools

[Download](#download) · [Setup](#quick-setup) · [Features](#features) · [Plugins](#plugins)

</div>

---

## What is ROBS?

ROBS is a desktop remote control for OBS Studio.

- Run on a **different computer** from your streaming PC
- Let **multiple operators** control the same OBS simultaneously
- Add **custom buttons and controls** via plugins
- Keep everything **in sync** across all connected controllers

---

## Download

| Platform | Download |
|----------|----------|
| Windows | Grab the latest portable `.exe` from [Releases](../../releases) |

---

## Quick Setup

### 1. Enable OBS WebSocket

In OBS Studio:
- Go to **Tools → WebSocket Server Settings**
- Enable the server
- Note the URL (usually `ws://localhost:4455`)
- Set a password if you want one

### 2. Connect ROBS

- Open ROBS and click the **gear icon** (or press `F1`)
- Enter your OBS WebSocket URL and password
- Click **Connect to OBS**
- Your scenes appear automatically

> **Remote setup?** If OBS is on another machine, use the machine's IP (e.g., `ws://192.168.1.50:4455`). Consider [Tailscale](https://tailscale.com) or [Radmin VPN](https://www.radmin-vpn.com) for secure remote access.

---

## Features

| Feature | Description |
|---------|-------------|
| **🎬 Scene Control** | Preview/program workflow with studio mode. Click to preview, double-click or `Ctrl+Enter` to go live. |
| **🌐 Edit Sources** | Edit Text, URL and etc on the fly and force refresh without opening OBS. |
| **👁️ Source Visibility** | Toggle overlays, cameras, and graphics with one click. |
| **⚡ Real-time Sync** | Multiple operators can connect to the same OBS. Changes appear instantly on everyone's screen. |
| **🔌 Plugin System** | Add custom buttons and automation with JavaScript plugins. Hot-reload on save. |
| **⌨️ Keyboard Shortcuts** | Full keyboard control. Press `F1` for the shortcut list. |

---

## Important Conventions

### Source Naming

**Only sources starting with `_` appear in the dashboard.**

| In OBS | In ROBS Dashboard |
|--------|-------------------|
| `_Scoreboard` | ✅ Visible with controls |
| `_Webcam` | ✅ Visible with controls |
| `Game Capture` | ❌ Hidden (no underscore) |
| `Desktop Audio` | ❌ Hidden (no underscore) |

This lets you control which sources need manual controls vs. which are managed automatically.

### Config Scene

**The scene named `CONFIG` is used to store configuration data for plugins.**
- This scene is hidden from the scene list.
- The sources in this scene appear on the config menu on the right panel
- Allows for easy editing, used mainly for plugins

---

## Plugins

Extend ROBS with custom JavaScript plugins that add buttons, automation, and integrations.

Plugins live in the `plugins/` folder — one folder per plugin with a `plugin.js` file inside:

```
plugins/
  MyPlugin/
    plugin.js
    config.yaml      (optional)
    README.md        (optional)
```

Drop your plugin folder in, and ROBS loads it automatically. Edit and save — changes apply instantly without restart.

### Example: Adding Sidebar Buttons

```javascript
// plugins/Streamlink/plugin.js
window.PluginUtils.registerSidebarButton(
  'Streamlink',
  'start_all',
  'Start Streams',
  () => window.PluginUtils.triggerHotkeyByName('streamlink.start_all'),
  { icon: '▶', tint: 'green' }
);
```

See [`docs/PLUGIN-UTILS-REFERENCE.md`](docs/PLUGIN-UTILS-REFERENCE.md) for the full plugin API.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Can't connect to OBS" | Check that OBS is running, WebSocket is enabled, and the URL/password match. Verify firewall rules for remote connections. |
| Sources not showing | Make sure source names in OBS start with `_`. Only `_SourceName` appears in the dashboard. |
| Plugin buttons not appearing | Check the bottom console for errors. Make sure your plugin's `canHandle` returns `true` or you're using `registerSidebarButton`. |
| Laggy connection | For remote setups, use a VPN like Tailscale instead of port forwarding over the internet. |

---

## Security Notes

- **WebSocket password = full control.** Anyone with your password can control OBS from any app. Don't share it publicly.
- **Plugins run code.** Only install plugins from sources you trust. The plugins folder runs JavaScript with full app access.

---

## Contact

- **Discord:** @limifaooooo

---