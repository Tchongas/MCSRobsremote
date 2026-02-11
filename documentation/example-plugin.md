# Example Plugin — Kitchen Sink

This is a complete example plugin that demonstrates every feature available to plugins. It's not meant to be used as-is — it's a reference you can copy pieces from.

This plugin targets browser sources that contain "twitch" in their URL. It:
- Changes the row icon and background color
- Reads a config file
- Adds sidebar buttons
- Fetches external data
- Controls volume, visibility, text sources, and URLs
- Handles remote updates from other clients
- Logs to the app console

## The Plugin

```javascript
// KitchenSinkPlugin — demonstrates every plugin feature
// Drop this file in the plugins folder to try it out
(function() {

  // ── Plugin config (loaded from a JSON file later) ──
  let config = null;

  const KitchenSinkPlugin = {
    name: 'KitchenSinkPlugin',
    version: '1.0.0',

    // ────────────────────────────────────────────────────────
    // canHandle — called for every source in the dashboard.
    // Return true if your plugin should run for this source.
    //
    // If you plugin isnt made for a specific source kind, return false.
    //
    // sourceKind: OBS source type string, e.g.:
    //   'browser_source', 'ffmpeg_source', 'wasapi_input_capture',
    //   'text_gdiplus_v3', 'image_source', etc.
    //
    // sourceName: the raw OBS source name (e.g. '_TwitchStream')
    //
    // context: { inputKindMap: Map<name, kind>, ... }
    //   inputKindMap lets you check the type of any source by name
    // ────────────────────────────────────────────────────────
    canHandle(sourceKind, sourceName, context) {
      // Only handle browser sources
      return sourceKind === 'browser_source';
    },

    canHandle() {
      // Isn't made for a specific source kind
      return false;
    },

    // ────────────────────────────────────────────────────────
    // execute — runs when a matching source renders in the dashboard.
    // This is where you build your UI and wire up controls.
    //
    // options:     HTMLElement — the container to append your controls to.
    //              This is inside the expandable options panel for the source.
    // sourceName:  raw OBS name (e.g. '_TwitchStream')
    // displayName: cleaned name shown in the UI (e.g. 'TwitchStream')
    // context:     same object as canHandle
    // ────────────────────────────────────────────────────────
    async execute(options, sourceName, displayName, context) {
      try {

        // ── Load config from a JSON file (optional) ──
        // Place a file called KitchenSinkPlugin.json in the plugins folder.
        // If it doesn't exist, we just skip it.
        if (!config) {
          try {
            const raw = await window.pluginAPI.readFile('KitchenSinkPlugin.json');
            config = JSON.parse(raw);
            window.uiHelpers.logInfo('Config loaded: ' + JSON.stringify(config), 'kitchen-sink');
          } catch (e) {
            // No config file, that's fine
            config = {};
          }
        }

        // ── Check the URL using getSourceURL to decide if we care about this source ──
        const url = await window.PluginUtils.getSourceURL(sourceName);
        if (!url) return;

        const isTwitch = url.toLowerCase().includes('twitch.tv');
        if (!isTwitch) return; // skip non-twitch browser sources

        // ── Customize the dashboard row appearance ──
        // Change the icon to a TV emoji
        window.PluginUtils.applySourceIcon(options, '📺');

        // Set a gold background on the row, from the config or from the default
        const bgColor = config.rowColor || '#b39544';
        window.PluginUtils.applyRowBackground(options, bgColor);

        // ── Build custom controls inside the options panel, creating Html elements inside the dashboard ──

        // -- URL display --
        const urlLabel = document.createElement('div');
        urlLabel.style.cssText = 'font-size: 11px; color: #888; margin-bottom: 6px; word-break: break-all;';
        urlLabel.textContent = 'URL: ' + url;
        options.appendChild(urlLabel);

        // -- Volume control --
        // Read current volume
        const currentVolume = await window.PluginUtils.getSourceVolumePercent(sourceName);
        window.uiHelpers.logInfo(`${displayName} volume: ${currentVolume}%`, 'kitchen-sink');

        // Simple volume buttons
        const volRow = document.createElement('div');
        volRow.style.cssText = 'display: flex; gap: 4px; margin-bottom: 6px;';

        const muteBtn = document.createElement('button');
        muteBtn.className = 'btn-plugin';
        muteBtn.textContent = 'Mute';
        muteBtn.addEventListener('click', async () => {
          await window.PluginUtils.setSourceVolume(sourceName, 0);
          window.uiHelpers.logInfo(`${displayName} muted`, 'kitchen-sink');
        });

        const fullVolBtn = document.createElement('button');
        fullVolBtn.className = 'btn-plugin';
        fullVolBtn.textContent = '100%';
        fullVolBtn.addEventListener('click', async () => {
          await window.PluginUtils.setSourceVolume(sourceName, 100);
          window.uiHelpers.logInfo(`${displayName} volume set to 100%`, 'kitchen-sink');
        });

        volRow.appendChild(muteBtn);
        volRow.appendChild(fullVolBtn);
        options.appendChild(volRow);

        // -- Visibility toggle --
        const visBtn = document.createElement('button');
        visBtn.className = 'btn-plugin';
        visBtn.textContent = 'Toggle Visibility';
        visBtn.addEventListener('click', async () => {
          const newState = await window.PluginUtils.toggleSourceEnabled(sourceName);
          window.uiHelpers.logSuccess(
            `${displayName} is now ${newState ? 'visible' : 'hidden'}`,
            'kitchen-sink'
          );
        });
        options.appendChild(visBtn);

        // -- Fetch external data --
        // Example: fetch some JSON from an API and display it
        try {
          const data = await window.PluginUtils.fetchJson('https://api.example.com/stream-info');
          const infoLabel = document.createElement('div');
          infoLabel.textContent = 'Viewers: ' + data.viewers;
          options.appendChild(infoLabel);
        } catch (e) {
          window.uiHelpers.logWarn('Could not fetch stream info: ' + e.message, 'kitchen-sink');
        }
        // -- Set a text source from within a browser source plugin --
        // plugins can control ANY source, not just the one they're attached to
        await window.PluginUtils.setTextSource('_StreamTitle', 'Live on Twitch!');
        // -- Change the browser source URL --
        // Useful for switching between different overlays
        await window.PluginUtils.setSourceURL(sourceName, 'https://twitch.tv/newchannel');
        // ── Register a sidebar button ──
        // This button shows up in the right sidebar, not inside the source options.
        // Use registerSidebarButton so it gets tracked and cleaned up properly.
        window.PluginUtils.registerSidebarButton(
          'KitchenSinkPlugin',        // plugin name (for cleanup)
          'kitchen-sink-refresh-btn',  // unique button ID
          'Refresh Twitch',            // button label
          async () => {
            // This runs when the button is clicked
            // The dashboard auto-refreshes after this function returns
            await window.obsAPI.browser.refresh(sourceName);
            window.uiHelpers.logSuccess(`Refreshed ${displayName}`, 'kitchen-sink');
          }
        );

        // You can also add a button with a custom CSS class
        window.PluginUtils.registerSidebarButton(
          'KitchenSinkPlugin',
          'kitchen-sink-hide-btn',
          'Hide Twitch',
          async () => {
            await window.PluginUtils.setSourceEnabled(sourceName, false);
          },
          'btn-plugin'  // optional CSS class (btn-plugin is the default)
        );

        window.uiHelpers.logSuccess(`KitchenSinkPlugin loaded for ${displayName}`, 'kitchen-sink');

      } catch (error) {
        window.uiHelpers.logError('KitchenSinkPlugin error: ' + error.message, 'kitchen-sink');
      }
    },

    // ────────────────────────────────────────────────────────
    // priority — higher number = runs before other plugins.
    // If two plugins both canHandle the same source, the one
    // with higher priority runs first.
    // Default range: 1-100
    // ────────────────────────────────────────────────────────
    priority() {
      return 15;
    },

    // ────────────────────────────────────────────────────────
    // cleanup — called when the plugin reloads (hot-reload) or
    // when a source leaves the dashboard (scene switch, removal).
    // It runs BEFORE the new instance loads, so the plugin can
    // clean up after itself and start fresh.
    //
    // Only needed for things you created OUTSIDE the options panel
    // (sidebar buttons, global listeners, intervals, etc.).
    // The options panel is destroyed automatically — you don't
    // need to clean that up.
    // ────────────────────────────────────────────────────────
    cleanup(sourceName) {
      // Remove all sidebar buttons we registered
      window.PluginUtils.unregisterSidebarButtons('KitchenSinkPlugin');
    },

    // ────────────────────────────────────────────────────────
    // onRemoteUpdate — called when OBS sends a real-time event
    // for a source this plugin handles. This fires when another
    // client (or OBS itself) changes something.
    //
    // sourceName: the source that changed
    // eventType:  string like 'input-mute-changed', 'input-volume-changed'
    // data:       event-specific data from OBS
    //
    // Use this to keep your UI in sync without a full refresh.
    // ────────────────────────────────────────────────────────
    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-mute-changed') {
        window.uiHelpers.logInfo(
          `${sourceName} mute changed remotely: ${data.inputMuted}`,
          'kitchen-sink'
        );
      }

      if (eventType === 'input-volume-changed') {
        window.uiHelpers.logInfo(
          `${sourceName} volume changed remotely`,
          'kitchen-sink'
        );
      }
    }
  };

  // ── Registration ──
  // Always handle the case where CustomHandlerPlugins might not be ready yet.
  // On hot-reload it's usually available immediately, but on first load
  // it might not be.
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(KitchenSinkPlugin);
    window.uiHelpers.logSuccess('KitchenSinkPlugin registered', 'kitchen-sink');
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(KitchenSinkPlugin);
      window.uiHelpers.logSuccess('KitchenSinkPlugin registered (deferred)', 'kitchen-sink');
    });
  }

})();
```

## Config File (optional)

If you want to use a config file, create `KitchenSinkPlugin.json` in the same `plugins` folder:

```json
{
  "rowColor": "#b39544",
  "someCustomSetting": true
}
```

Read it in your plugin with:

```javascript
const raw = await window.pluginAPI.readFile('KitchenSinkPlugin.json');
const config = JSON.parse(raw);
```

## What each method does

| Method | Required | When it runs |
|--------|----------|-------------|
| `canHandle(sourceKind, sourceName, context)` | Yes | For every source in the dashboard. Return `true` to claim it. |
| `execute(options, sourceName, displayName, context)` | Yes | When a claimed source renders. Build your UI here. |
| `priority()` | Yes | Used to sort plugins. Higher = runs first. |
| `cleanup(sourceName)` | No | When a source is removed from the dashboard. |
| `onRemoteUpdate(sourceName, eventType, data)` | No | When OBS sends a real-time event for a source you handle. |

## Tips

- Wrap `execute` in try/catch. Errors won't crash the app but will stop your plugin from rendering.
- Use `registerSidebarButton` instead of `addControlButton` — it tracks buttons under your plugin name so cleanup is easy.
- The `options` element is destroyed when the source leaves the dashboard, so you don't need to manually remove controls you appended to it.
- Use `requestDashboardRefresh` if you make changes that should update the UI but aren't covered by the built-in auto-refresh (most setter functions already trigger it).
- Check the app console (bottom panel) for your log messages. Use a consistent tag so you can filter them.
