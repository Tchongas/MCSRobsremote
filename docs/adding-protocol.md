# Adding a New Protocol (IPC + OBS Action)

This guide shows the minimal steps to add a new "protocol" (feature/API surface) to the app, mirroring how media controls were added across:

- `actions/media.js` (OBS WebSocket calls)
- `main/main.js` (Electron IPC handlers)
- `main/preload.js` (Renderer-safe API exposure)

The end result is a callable API in the renderer: `window.obsAPI.<yourProtocol>.<method>(...)`.

---

## 1) Implement OBS actions in `actions/<yourProtocol>.js`

Create a new module under `actions/` that encapsulates all the OBS WebSocket calls for your protocol. Always:

- Import and use `connect()` from `obs/client` before calling OBS.
- Call the correct OBS v5 request names and parameter keys.

Media example (already in repo) uses:

- `TriggerMediaInputAction` with `mediaAction` (not `action`)
- `GetMediaInputStatus` to implement toggle logic safely

See `actions/media.js` for a concrete reference.

---

## 2) Register IPC handlers in `main/main.js`

Wire your action methods into Electron IPC so the renderer can call them. Use `ipcMain.handle(channel, handler)` and delegate to your `actions/` module.

Example:

```js
// main/main.js
const myProtocol = require('../actions/myProtocol');

function setupIpcHandlers() {
  // ...other handlers

  ipcMain.handle('myProtocol-doThing', async (event, paramA, paramB) => {
    return await myProtocol.doThing(paramA, paramB);
  });
}
```
---

## 3) Expose a safe API in `main/preload.js`

Expose a minimal, typed surface area to the renderer via `contextBridge.exposeInMainWorld`. Keep names short and consistent.

Example:

```js
// main/preload.js
contextBridge.exposeInMainWorld('obsAPI', {
  // ...existing domains
  myProtocol: {
    doThing: (paramA, paramB) => ipcRenderer.invoke('myProtocol-doThing', paramA, paramB),
  }
});
```

---

## 4) Where this is exposed and how to call it

Once added, you can call it from:

- Renderer code (UI, handlers, plugins):
  ```js
  await window.obsAPI.myProtocol.doThing('foo', 123);
  ```
- DevTools console (for quick tests):
  ```js
  window.obsAPI.myProtocol.doThing('foo', 123).then(console.log);
  ```

If you are writing a plugin (e.g., in `renderer/logic/handlers/plugins/`), import nothing—just call `window.obsAPI.<domain>.<method>(...)`.

---

## 5) Naming, errors, and return values

- Use `kebab-case` for IPC channels: `myDomain-myAction`.
- Use concise method names on the exposed API: `window.obsAPI.myDomain.myAction()`.
- Prefer returning booleans or small objects the UI can consume without decoding raw OBS types.
- Log errors in `actions/` but return a safe value to the renderer.

---

## 6) Testing tips

- Ensure OBS is reachable and `connect()` succeeds before testing.
- Verify OBS request names and parameter keys (OBS v5 changed many names/fields).
- For media-like features, check state first via a `Get*Status` request before issuing a toggle.
- Test in DevTools first, then wire into UI.

---

## 7) Media-specific gotchas (example)

- `TriggerMediaInputAction` requires `mediaAction` (not `action`).
- Use `GetMediaInputStatus` to decide whether to `PLAY` or `PAUSE` on toggle.
- `ffmpeg_source` inputs support media actions; browser sources don’t. Map UI buttons accordingly.

---

## 8) Security and boundaries

- `contextIsolation: true` is enabled; only expose what you need on `window.obsAPI`.
- Never `require` Node modules directly in renderer code.
- Keep all OBS calls in `actions/` and use IPC to traverse main↔renderer.

---

## Minimal checklist

- [ ] Add `actions/<yourProtocol>.js` with your OBS calls.
- [ ] Import it in `main/main.js` and add `ipcMain.handle(...)` handlers.
- [ ] Expose methods in `main/preload.js` under `window.obsAPI.<yourProtocol>`.
- [ ] Call from renderer via `await window.obsAPI.<yourProtocol>.<method>(...)`.
- [ ] Test via DevTools.
