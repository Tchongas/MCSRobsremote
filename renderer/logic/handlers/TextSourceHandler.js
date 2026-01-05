// Text source handler
(function() {
  const TextSourceHandler = {
    name: 'TextSourceHandler',
    version: '1.0.0',
    
    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'text_gdiplus_v3';
    },
    
    async createControls(options, sourceName, displayName, context) {
      const row = document.createElement('div');
      row.className = 'dash-option-row';
      
      const textLabel = document.createElement('label');
      textLabel.textContent = 'Text Content';
      textLabel.className = 'input-label';
      
      const textArea = document.createElement('textarea');
      textArea.className = 'text-input';
      textArea.placeholder = 'Enter text content...';
      textArea.rows = 3;
      
      // Load current text value
      try {
        const settings = await window.obsAPI.sources.getSettings(sourceName);
        textArea.value = settings?.inputSettings?.text || '';
      } catch (err) {
        console.warn('Failed to load text settings:', err);
      }
      
      textArea.addEventListener('input', async (e) => {
        try {
          await window.obsAPI.sources.setSettings(sourceName, { text: e.target.value });
        } catch (err) {
          console.error('Failed to update text:', err);
          window.uiHelpers?.logError('Failed to update text: ' + err.message, 'text');
        }
      });
      
      row.appendChild(textLabel);
      row.appendChild(textArea);
      options.appendChild(row);
    },

    priority() {
      return 5;
    },

    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-name-changed') {
        this._updateDisplayName(sourceName, data.newName);
      }
    },

    _updateDisplayName(sourceName, newName) {
      const input = document.querySelector(`.dash-option-row[data-input-name="${CSS.escape(sourceName)}"] input`);
      if (input) input.value = newName;
    },
  };
  
  // Auto-register when loaded
  if (window.HandlerRegistry) {
    window.HandlerRegistry.register(TextSourceHandler);
  } else {
    // Queue for later registration
    window.addEventListener('handlerRegistryReady', () => {
      window.HandlerRegistry.register(TextSourceHandler);
    });
  }
})();
