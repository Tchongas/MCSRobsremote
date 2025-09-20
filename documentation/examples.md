# Examples of plugins

## Twitch row color
Changes the row background color of a browser source if it is a twitch URL, and change its icon to a TV emoji.

```javascript
// TwitchPlugin - Simple Twitch source detector with background color and icon
(function() {
  const TwitchPlugin = {
    name: 'TwitchPlugin',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      if (sourceKind !== 'browser_source') {
        return false;
      }
      return true;
    },

    async execute(options, sourceName, displayName, context) {
      try {
        const url = await window.obsAPI.browser.getUrl(sourceName);
        
        if (!url) {
          return;
        }

        const urlLower = url.toLowerCase();
        const isTwitch = urlLower.includes('twitch.tv');
        
        if (!isTwitch) {
          return;
        }

        if (window.PluginUtils?.applySourceIcon) {
          window.PluginUtils.applySourceIcon(options, '📺');
        }
        if (window.PluginUtils?.applyRowBackground) {
          window.PluginUtils.applyRowBackground(options, '#b39544');
        } 
      } catch (error) {
        window.uiHelpers?.log(`❌ TwitchPlugin error: ${error.message}`);
        console.error('TwitchPlugin detailed error:', error);
      }
    },

    priority() {
      return 15;
    }
  };

  // Autoregister plugin
  window.uiHelpers?.log('🔌 TwitchPlugin attempting registration...');
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(TwitchPlugin);
    window.uiHelpers?.log('✅ TwitchPlugin registered immediately');
  } else {
    window.uiHelpers?.log('⏳ CustomHandlerPlugins not ready, waiting for event...');
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(TwitchPlugin);
      window.uiHelpers?.log('✅ TwitchPlugin registered after event');
    });
  }

  window.uiHelpers?.log('📺 TwitchPlugin loaded');
})();
```

