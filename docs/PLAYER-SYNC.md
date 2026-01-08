# Player Sync (MCSR Ranked -> OBS Text Sources)

## Overview

Player Sync is a built-in feature that fetches player data from the MCSR Ranked API and writes values into OBS **Text** sources.

It is designed to match the existing architecture:

- Renderer-side UI buttons trigger actions.
- The renderer fetches the external API directly.
- OBS updates are applied using `window.obsAPI.sources.setSettings()`.
- A small config is stored in `localStorage` so identifiers persist.

## What was added / changed

### New file

- `renderer/logic/playerSync.js`

This file exposes a small public API on `window.playerSyncLogic`.

### Updated files

- `index.html`
  - Adds two buttons in the left Controls panel:
    - `Set Player 1` (`id="set_player1"`)
    - `Set Player 2` (`id="set_player2"`)
  - Loads the new module:
    - `<script src="renderer/logic/playerSync.js"></script>`

- `renderer/ui-bindings.js`
  - Wires `set_player1` / `set_player2` clicks to `window.playerSyncLogic.syncPlayer(1|2)`.
  - If an identifier is not stored yet, it prompts using `window.prompt()`.
  - Logs progress and errors using `window.uiHelpers.logInfo/logSuccess/logError` with scope `playersync`.

- `renderer/logic/handlers/PluginUtils.js`
  - Adds reusable helpers (useful for plugins too):
    - `PluginUtils.fetchJson(url, opts)`
    - `PluginUtils.setTextSource(sourceName, text)`

## How it works (data flow)

1. You click `Set Player 1` or `Set Player 2`.
2. `renderer/ui-bindings.js` calls `runPlayerSync(1|2)`.
3. If there is no stored identifier:
   - It prompts: `Enter identifier for Player X:`
   - Saves it into `localStorage` via `playerSyncLogic.setIdentifier(...)`
4. `playerSyncLogic.syncPlayer(playerIndex)` runs:
   - Builds the API URL:
     - `https://mcsrranked.com/api/users/{identifier}`
   - Fetches JSON via `fetch()`.
   - Extracts:
     - `data.eloRate`
     - `data.statistics.total.bestTime.ranked`
   - Formats best time as `m:ss.mmm`.
5. It updates OBS Text sources using:

   - `window.obsAPI.sources.setSettings(sourceName, { text: value })`

6. The in-app console logs show progress/success/failure under scope `playersync`.

## API response expectations

The code expects the API shape:

- Top-level:
  - `status: "success"`
  - `data: { ... }`

The values used:

- ELO:
  - `data.eloRate`

- Ranked best time (ms):
  - `data.statistics.total.bestTime.ranked`

If `status !== "success"` or `data` is missing, Player Sync throws an error and logs it.

## OBS Text sources required

Create these OBS sources (Text / GDI+ is fine), **names must match exactly**:

- `_elo1`
- `_besttime1`
- `_elo2`
- `_besttime2`

Player Sync updates the `text` property of these sources.

## Configuration (localStorage)

Player Sync stores its config in:

- Key: `playerSyncConfig`

Default structure:

- `player1.identifier` (string)
- `player1.sources.elo` (string, default `_elo1`)
- `player1.sources.bestTime` (string, default `_besttime1`)
- `player2.identifier` (string)
- `player2.sources.elo` (string, default `_elo2`)
- `player2.sources.bestTime` (string, default `_besttime2`)

At the moment, only the identifier is set through the UI prompt. The source names remain defaults unless you edit localStorage manually.

## Developer notes

### `window.playerSyncLogic`

Exposed methods:

- `getConfig()`
- `saveConfig(cfg)`
- `setIdentifier(playerIndex, identifier)`
- `getIdentifier(playerIndex)`
- `syncPlayer(playerIndex)`

### OBS update method used

This project exposes OBS actions to the renderer via Electron preload:

- `window.obsAPI.sources.setSettings(sourceName, inputSettings)`

For a text source update, the settings object must include:

- `{ text: "..." }`

### PluginUtils additions

`PluginUtils.fetchJson(url, opts)`:

- Simple wrapper around `fetch()` that enforces JSON and throws on non-2xx.

`PluginUtils.setTextSource(sourceName, text)`:

- Calls `window.obsAPI.sources.setSettings(sourceName, { text })`.

This enables external plugins to do the same kind of “fetch external info -> write to text source” workflow.
