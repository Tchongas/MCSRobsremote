// Audio Output Handler - Manages desktop/system audio capture controls (mute/volume)
(function() {
    const AudioHandler = {
      name: 'AudioHandler',
      version: '1.0.0',
      
      canHandle(sourceKind, sourceName, context) {
        return sourceKind === 'wasapi_output_capture' || sourceKind === 'pulse_output_capture' || sourceKind === 'coreaudio_output_capture';
      },
      
      priority() {
        return 8; // High priority for microphones
      },
      
      async createControls(options, sourceName, displayName, context) {
        const vol = window.PluginUtils.createVolumeControl({ sourceName, displayName, logTag: 'audio' });
        options.appendChild(vol.container);

        // Load initial state
        try {
          const [muteState, volState] = await Promise.all([
            window.obsAPI.sources.getMute(sourceName),
            window.obsAPI.sources.getVolume(sourceName)
          ]);
          const isMuted = !!(muteState && (muteState.inputMuted ?? muteState.muted));
          vol.applyMuteVisual(isMuted);
          const mul = volState && typeof volState.inputVolumeMul === 'number' ? volState.inputVolumeMul : 1.0;
          const pct = Math.round(mul * 100);
          vol.slider.value = String(pct);
          vol.numInput.value = String(pct);
        } catch (_) { /* ignore */ }
      },
      
      onRemoteUpdate(sourceName, eventType, data) {
        if (eventType === 'input-mute-changed') {
          this._updateRemoteMute(sourceName, data.inputMuted);
        } else if (eventType === 'input-volume-changed' && data.inputName === sourceName) {
          const mul = typeof data.inputVolumeMul === 'number' ? data.inputVolumeMul : undefined;
          if (mul !== undefined) this._updateRemoteVolume(sourceName, mul);
        }
      },

      _updateRemoteMute(inputName, muted) {
        try {
          const btn = document.querySelector(`.volume-control .mute-btn[data-input-name="${CSS.escape(inputName)}"]`);
          if (!btn) return;
          btn.classList.toggle('is-muted', muted);
          btn.title = muted ? 'Unmute' : 'Mute';
          btn.innerHTML = muted
            ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
            : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        } catch (_) { /* ignore */ }
      },

      _updateRemoteVolume(inputName, mul) {
        try {
          const pct = String(Math.round(Math.max(0, Math.min(1, mul)) * 100));
          const slider = document.querySelector(`.volume-control .volume-slider[data-input-name="${CSS.escape(inputName)}"]`);
          if (slider) slider.value = pct;
          const num = slider?.closest('.volume-slider-wrap')?.querySelector('.volume-num');
          if (num) num.value = pct;
        } catch (_) { /* ignore */ }
      }
    };
  
    // Auto-register when loaded
    if (window.HandlerRegistry) {
      window.HandlerRegistry.register(AudioHandler);
    } else {
      // Queue for later registration
      window.addEventListener('handlerRegistryReady', () => {
        window.HandlerRegistry.register(AudioHandler);
      });
    }
  })();
  