// Example External Plugin Template
// This demonstrates how to create a plugin that works with the OBS Remote app
// Place this file in the 'plugins/' folder next to the app executable

(function() {
  const ExamplePlugin = {
    name: 'ExamplePlugin',
    version: '1.0.0',

    // Determine if this plugin should handle a specific source
    canHandle(sourceKind, sourceName, context) {
      // Example: Handle all media sources
      return sourceKind === 'ffmpeg_source';
    },

    // Enhance the source with custom UI elements
    async enhance(options, sourceName, displayName, context) {
      // Create a custom section
      const section = document.createElement('div');
      section.className = 'example-plugin-section';
      section.style.cssText = `
        margin-top: 12px;
        padding: 10px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: white;
      `;
      
      // Add header
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span style="font-size: 14px;">🎵</span>
          <span style="font-weight: 600; font-size: 12px;">MEDIA CONTROLS</span>
        </div>
      `;
      
      // Add custom button
      const button = document.createElement('button');
      button.textContent = '⏯️ Toggle Media';
      button.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      `;
      
      button.addEventListener('click', async () => {
        try {
          // Use the OBS API to interact with the source
          console.log(`Example plugin: Toggling ${sourceName}`);
          window.uiHelpers?.log(`🎵 Example plugin toggled ${displayName}`);
        } catch (err) {
          console.error('Example plugin error:', err);
        }
      });
      
      section.appendChild(header);
      section.appendChild(button);
      options.appendChild(section);
    },

    // Set plugin priority (higher = runs first)
    priority() {
      return 5;
    },

    // Handle real-time updates from OBS
    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-name-changed') {
        console.log(`Example plugin: ${sourceName} renamed to ${data.newName}`);
      }
    },

    // Clean up when source is removed
    cleanup(sourceName) {
      const elements = document.querySelectorAll(`[data-example-source="${sourceName}"]`);
      elements.forEach(el => el.remove());
    }
  };

  // Register the plugin with the system
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(ExamplePlugin);
  } else {
    console.warn('CustomHandlerPlugins not available - plugin registration failed');
  }

  console.log('📦 ExamplePlugin loaded successfully');
})();
