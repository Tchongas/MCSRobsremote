(function() {
    const YoutubePlugin = {
      name: 'YoutubePlugin',
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
          const isYoutube = urlLower.includes('youtube.com') || urlLower.includes('youtu.be'); 

          
          if (!isYoutube) {
            return;
          }
  
          if (window.PluginUtils?.applySourceIcon) {
            window.PluginUtils.applySourceIcon(options, '📺');
          }
          if (window.PluginUtils?.applyRowBackground) {
            window.PluginUtils.applyRowBackground(options, '#ff0000');
          } 
        } catch (error) {
          window.uiHelpers?.logError(`YoutubePlugin error: ${error.message}`, 'plugin');
          console.error('YoutubePlugin detailed error:', error);
        }
      },
  
      priority() {
        return 15;
      }
    };
  
    // Autoregister plugin
    window.uiHelpers?.logInfo('YoutubePlugin attempting registration...', 'plugin');
    if (window.CustomHandlerPlugins) {
      window.CustomHandlerPlugins.register(YoutubePlugin);
      window.uiHelpers?.logSuccess('YoutubePlugin registered', 'plugin');
    } else {
      window.uiHelpers?.logWarn('CustomHandlerPlugins not ready, waiting for event...', 'plugin');
      window.addEventListener('customHandlerReady', () => {
        window.CustomHandlerPlugins.register(YoutubePlugin);
        window.uiHelpers?.logSuccess('YoutubePlugin registered (after event)', 'plugin');
      });
    }
  
    window.uiHelpers?.logInfo('YoutubePlugin loaded', 'plugin');
  })();
  