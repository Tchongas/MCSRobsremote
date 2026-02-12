(function() {
    const MediaControllerPlugin = {
      name: 'MediaControllerPlugin',
      version: '1.0.0',

      canHandle(sourceKind, sourceName, context) {
        return sourceKind === 'ffmpeg_source';
      },

      async execute(options, sourceName, displayName, context) {
        // Create media control panel aligned with dashboard styles
        const panel = document.createElement('div');
        panel.className = 'dash-options open';
        panel.dataset.mediaSource = sourceName;
        
        // Header
        const header = document.createElement('div');
        header.className = 'dash-option-row';
        const title = document.createElement('div');
        title.className = 'params-title flex-center';
        title.style.paddingBottom = '12px';
        title.innerHTML = `<span class="source-icon">🎵</span><span>Media Controls</span>`;
        header.appendChild(title);
        
        // Control buttons container
        const controls = document.createElement('div');
        controls.className = 'dash-option-row';
        
        // Create control buttons
        const buttons = [
          { text: '⏯️ Toggle', action: 'toggle', className: 'btn-accent' },
          { text: '⏹️ Stop', action: 'stop', className: 'btn-danger' },
          { text: '⏮️ Restart', action: 'restart', className: 'btn-success' },
        ];
        
        buttons.forEach(({ text, action, className }) => {
          const btn = document.createElement('button');
          btn.textContent = text;
          if (className) btn.classList.add(className);
          
          btn.addEventListener('click', async () => {
            try {
              switch (action) {
                case 'toggle':
                  // Toggle media playback (would need custom OBS request)
                  await window.obsAPI.media.toggle(sourceName);
                  window.uiHelpers?.logInfo(`Toggled: ${displayName}`, 'media');
                  break;
                case 'stop':
                  // Stop media playback
                  await window.obsAPI.media.stop(sourceName);
                  window.uiHelpers?.logInfo(`Stopped: ${displayName}`, 'media');
                  break;
                case 'restart':
                  // Restart media from beginning
                  await window.obsAPI.media.restart(sourceName);
                  window.uiHelpers?.logInfo(`Restarted: ${displayName}`, 'media');
                  break;
              }
            } catch (err) {
              window.uiHelpers?.logError(`Media control failed: ${err.message}`, 'media');
            }
          });
          
          controls.appendChild(btn);
        });
        
        panel.appendChild(header);
        panel.appendChild(controls);
        options.appendChild(panel);
      },

      priority() {
        return 10;
      },

      onRemoteUpdate(sourceName, eventType, data) {
        if (eventType === 'input-name-changed') {
          // Update any UI elements that display the source name
          console.log(`Media source ${sourceName} renamed to ${data.newName}`);
        }
      },
  
      cleanup(sourceName) {
        // Remove any persistent UI elements
        const panels = document.querySelectorAll(`[data-media-source="${sourceName}"]`);
        panels.forEach(panel => panel.remove());
      }
    };
  
    if (window.CustomHandlerPlugins) {
        window.CustomHandlerPlugins.register(MediaControllerPlugin);
    } else {
        window.addEventListener('customHandlerReady', () => {
            window.CustomHandlerPlugins.register(MediaControllerPlugin);
        });
    }
  })();