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
          window.PluginUtils.applyRowBackground(options, '#4f258a', '#291259', false);
        }

        window.uiHelpers?.log(`📺 Twitch plugin changed: ${displayName}`);
        
      } catch (error) {
        window.uiHelpers?.log(`❌ TwitchPlugin error: ${error.message}`);
      }
    },

    priority() {
      return 15;
    }
  };

  // Autoregister plugin
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(TwitchPlugin);
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(TwitchPlugin);
    });
  }

  window.uiHelpers?.log('📺 TwitchPlugin loaded');
})();
