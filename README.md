# ROBS — Remote OBS Controller

A desktop app for controlling OBS Studio remotely. Built with Electron and the OBS WebSocket protocol.

We use this for professional livestream operations — connecting to OBS instances running on other machines, switching scenes, toggling sources, adjusting audio, all from one place. Multiple operators can connect to the same OBS at the same time and everything stays in sync.

## Important stuff

- **Only sources starting with `_` show up in the dashboard.** Name your sources like `_Scoreboard`, `_Camera`, `_Overlay` to control which ones appear. This is just for organization, not security.
- **Don't give your OBS WebSocket password to people you don't trust.** Anyone with the password can control your OBS from any app, not just this one.
- **Don't install plugins from unknown sources.** Plugins run code in the app.

## Features

- **Scene management** — preview/program workflow (studio mode). Click to preview, double-click or press the button to go live.
- **Source controls** — toggle visibility, adjust volume with proper sliders, mute/unmute, browser source URL editing and refresh.
- **Real-time sync** — multiple clients can connect to the same OBS. Scene changes, visibility toggles, volume changes all update instantly across everyone.
- **Plugin system** — extend the app with custom `.js` plugins. Hot-reload on file save, no restart needed.
- **Keyboard shortcuts** — scene navigation, search, transitions, all accessible from the keyboard. Press `F1` in the app to see the full list.
- **Connection profiles** — save multiple OBS connection configs and switch between them.
- **Stream control** — start/stop streaming from the sidebar.

## Requirements

- OBS Studio 28+ with the WebSocket server enabled
- The WebSocket address and password (if you set one)

## Setup

### OBS side

Go to **Tools → WebSocket Server Settings** and enable the server. The default URL is `ws://localhost:4455`. Set a password if you want one.

### App side

1. Open Settings (gear icon in the top bar, or press `F1`)
2. Enter the WebSocket URL and password
3. Save, then click **Connect to OBS**
4. Scenes load automatically

If you're connecting remotely (different machine), you'll need to forward the port or use a VPN like Radmin or Tailscale.

## Using the app

- **Left sidebar** — connect/disconnect, start/stop stream, scene list
- **Center** — dashboard with source controls for the selected scene
- **Right sidebar** — quick actions, plugin buttons
- **Bottom** — console log

Select a scene on the left to load its sources in the dashboard. Only sources with names starting with `_` will appear. Each source row can be expanded to show controls (volume, URL editing, etc.) depending on the source type.

When someone else changes something in OBS (or from another ROBS instance), your UI updates automatically. You'll see `(remote)` in the console for those changes.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `F5` | Refresh scenes and sources |
| `F1` | Open info/shortcuts panel |
| `Ctrl+F` | Focus search bar |
| `Ctrl+G` | Focus scene list (then arrow keys to navigate, Enter to preview, Ctrl+Enter to go live) |
| `Ctrl+Enter` | Transition preview scene to live |
| `Escape` | Close modal / exit focus |

## Plugins

Plugins let you add custom controls for specific source types. Drop a `.js` file in the `plugins/` folder and the app picks it up automatically — no restart needed.

See the full plugin docs:
- [Plugin Overview](documentation/pluginoverview.md) — how plugins work, lifecycle, structure
- [Plugin API Reference](documentation/pluginAPI.md) — all available functions with inputs/outputs

## Building

Requires Node.js. Uses Electron Builder.

```bash
npm install

# Run in dev mode
npm start

# Build portable executable (Windows)
npm run build
```

## Project structure

```
main/           — Electron main process (window, IPC, OBS client)
renderer/       — Frontend (HTML, CSS, JS)
  logic/        — App modules (scenes, dashboard, config, resize)
    handlers/   — Source type handlers (audio, browser, mic)
      plugins/  — Built-in plugins
documentation/  — Plugin docs
```

## Troubleshooting

- **Can't connect?** — Make sure OBS is running, WebSocket is enabled, URL and password are correct. Check firewall if remote.
- **Sources not showing?** — Source names need to start with `_` to appear in the dashboard.
- **Plugin not loading?** — Check the console at the bottom for errors. Make sure `canHandle()` returns `true` for the source type you're targeting.

## Contact

Open an issue on GitHub, or message me on Discord: **@limifaooooo**
