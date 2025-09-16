# rOBSon – OBS Remote Control

rOBSon lets you control OBS Studio remotely from a simple electron app. Connect to your OBS over WebSocket, change scenes instantly, toggle scene item visibility, start/stop streaming, and extend the dashboard with plugins – all with real‑time updates shared across multiple clients.

# How to use

## IMPORTANT
### Only sources whose names start with an underscore appear in the Dashboard. Example: `_Scoreboard`, `_Timer`, `_LowerThird`, so you can control what to see in the dashboard.
### This IS NOT a security feature, it is just a way to organize your sources, DO NOT, give access to your OBS to people who you dont trust, since they can just plug the password in other apps to control your OBS, not putting a `_` will not stop them from controlling your OBS.
### DO NOT download plugins from unknown sources, they can be malicious.

## Quick overview

- Connect to your OBS Studio using the OBS WebSocket.
- See and switch between scenes quickly.
- Control scene items in a clean “Dashboard” view.
- Toggle item visibility with a single click.
- Expand items to reveal extra options when available.
- Start and stop streaming.
- Get live status and logs directly in the app.
- Enjoy real‑time synchronization if multiple people use the app against the same OBS.
- Add optional plugins to enhance certain sources (e.g., browser overlays).


## Requirements

- OBS Studio 28+ with OBS WebSocket enabled.
- OBS WebSocket address and (if set) password.

## First‑time setup in OBS

Tools → WebSocket Server Settings → enable the server. Default local URL is `ws://localhost:4455`. Set a password if you use one.


## Connect the app to OBS

Open Settings (⚙️), set the WebSocket URL and optional password, Save, then hit “Connect to OBS”. Scenes load automatically on success.


## Using the app

- Top badges show connection and current scene.
- Left panel: Connect/Disconnect, Start/Stop, Scene selector.
- Right panel (Dashboard):
  - Select a scene to load its items.
  - You will only see items whose source names start with `_`.
  - Toggle visibility via the switch.
  - If available, use ▸ to expand extra controls (e.g., browser source tools).
- Bottom Console shows live logs.


## Real‑time updates

If another person changes scenes or toggles items from a different rOBSon instance (or directly in OBS), your app will update automatically. You’ll see “(remote)” in the console next to those actions.


## Plugins (optional)

Plugins can enhance the controls for certain sources. For example, a plugin can add a “Refresh” button or special controls for browser‑based overlays.

- Built‑in plugins are included with the app and work automatically.
- You can add your own plugins by placing `.js` files in the `plugins/` folder next to the app executable.
- When you add or edit a plugin file, the app detects the change and reloads automatically.

Note: Plugins run in a restricted environment with access to the app’s UI and OBS actions only. This helps protect your system and keep the app stable.


## Connection hiccups (quick checks)

- Is OBS running and its WebSocket enabled?
- Is the URL/password correct? Local default: `ws://localhost:4455`.
- Any firewall blocking the port?
- If you are using it remotly, make sure to forward the port, or use something like RadminVPN.
Check the Console for the exact error.


## Privacy and security

- rOBSon connects only to the OBS WebSocket you specify.
- No cloud account is required.
- External plugins are sandboxed with limited access.


## Getting updates or help

You can open a issue here on github, or message me in discord: @limifaooooos
