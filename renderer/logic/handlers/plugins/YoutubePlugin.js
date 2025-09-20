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
          window.uiHelpers?.log(`❌ YoutubePlugin error: ${error.message}`);
          console.error('YoutubePlugin detailed error:', error);
        }
      },
  
      priority() {
        return 15;
      }
    };
  
    // Autoregister plugin
    window.uiHelpers?.log('🔌 YoutubePlugin attempting registration...');
    if (window.CustomHandlerPlugins) {
      window.CustomHandlerPlugins.register(YoutubePlugin);
      window.uiHelpers?.log('✅ YoutubePlugin registered immediately');
    } else {
      window.uiHelpers?.log('⏳ CustomHandlerPlugins not ready, waiting for event...');
      window.addEventListener('customHandlerReady', () => {
        window.CustomHandlerPlugins.register(YoutubePlugin);
        window.uiHelpers?.log('✅ YoutubePlugin registered after event');
      });
    }
  
    window.uiHelpers?.log('📺 YoutubePlugin loaded');
  })();
  