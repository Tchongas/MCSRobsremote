# Plugin Overview

## TL;DR

- Put your plugin `.js` in the `plugins/` folder next to the app executable.
- Save a file → the app auto‑reloads (hot reload).
- Plugins enhance Dashboard items (right panel). Only sources starting with `_` show up there.
- A plugin runs for a source if `canHandle(sourceKind, sourceName, context)` returns true.
- Plugins run in a sandbox with access to `obsAPI`, `uiHelpers`, `PluginUtils`, and `CustomHandlerPlugins.register(...)`.

## Where plugins live

- External (user) plugins: `plugins/` (same folder as the app executable).
- Built‑in plugins: `renderer/logic/handlers/plugins/` (bundled with the app).

## How loading and hot reload work

- On startup, rOBSon scans `plugins/` for `.js` files and loads them into a sandbox.
- The folder is watched:
  - Add/change → app reloads to apply changes.
  - Remove → plugin is unregistered.
- No restart needed—just save.

## When a plugin runs

- Each plugin implements `canHandle(sourceKind, sourceName, context)`.
- If it returns true, the plugin is considered applicable.
- Applicable plugins are sorted by `priority()` (desc) and executed in order.
- Execution happens when a Dashboard item renders for a source that begins with `_`.

## What plugins typically do

- Add controls inside a source’s Options panel (revealed by ▸).
- Use `obsAPI` to read/change settings (e.g., browser URL, refresh, mute/volume).
- Use `PluginUtils` to style the row or set an icon.

## Context you receive

- `sourceKind`: OBS type (`browser_source`, `media_source`, …).
- `sourceName`: Internal OBS name.
- `displayName`: Name shown in the Dashboard (the leading `_` trimmed).
- `context`: Helpful data like `inputKindMap` (maps name → type), etc.

## Security model in short

- External plugins are sandboxed—no filesystem, no arbitrary system APIs.
- Allowed: OBS actions (`obsAPI`), UI helpers, DOM creation, logging, `PluginUtils`.
- Don’t install plugins you don’t trust.

## Troubleshooting

- Plugin not running?
  - Does the source name start with `_`?
  - Does your `canHandle(...)` actually return true?
  - Check the Console for registration/execution logs.
- Hot reload didn’t apply? Save again or touch the file; the app will refresh automatically.