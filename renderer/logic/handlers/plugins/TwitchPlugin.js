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
          window.PluginUtils.applyRowBackground(options, '#7e1cd4');
        } 
      } catch (error) {
        window.uiHelpers?.logError(`TwitchPlugin error: ${error.message}`, 'plugin');
        console.error('TwitchPlugin detailed error:', error);
      }
    },

    priority() {
      return 15;
    }
  };

  // Autoregister plugin
  window.uiHelpers?.logInfo('TwitchPlugin attempting registration...', 'plugin');
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(TwitchPlugin);
    window.uiHelpers?.logSuccess('TwitchPlugin registered', 'plugin');
  } else {
    window.uiHelpers?.logWarn('CustomHandlerPlugins not ready, waiting for event...', 'plugin');
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(TwitchPlugin);
      window.uiHelpers?.logSuccess('TwitchPlugin registered (after event)', 'plugin');
    });
  }

  window.uiHelpers?.logInfo('TwitchPlugin loaded', 'plugin');
})();
