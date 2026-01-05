// Microphone Handler - Manages audio input controls (mute/volume)
(function() {
  const MicrophoneHandler = {
    name: 'MicrophoneHandler',
    version: '1.0.0',
    
    canHandle(sourceKind, sourceName, context) {
      if (window.sourceTypes?.isMicrophone) {
        return window.sourceTypes.isMicrophone(sourceKind, sourceName);
      }
      // Fallback detection
      return context.micNameSet?.has(sourceName) || false;
    },
    
    priority() {
      return 8; // High priority for microphones
    },
    
    async createControls(options, sourceName, displayName, context) {
      const row = document.createElement('div');
      row.className = 'dash-option-row';

      const muteBtn = document.createElement('button');
      muteBtn.className = 'btn-ghost';
      muteBtn.textContent = 'Mute';
      muteBtn.dataset.inputName = sourceName;

      const volLabel = document.createElement('label');
      volLabel.className = 'input-label';
      volLabel.textContent = 'Volume';

      const volInput = document.createElement('input');
      volInput.type = 'range';
      volInput.min = '0';
      volInput.max = '100';
      volInput.value = '100';
      volInput.className = 'mic-volume';
      volInput.dataset.inputName = sourceName;

      row.appendChild(muteBtn);
      row.appendChild(volLabel);
      row.appendChild(volInput);
      options.appendChild(row);

      // Load initial state
      try {
        const [muteState, volState] = await Promise.all([
          window.obsAPI.sources.getMute(sourceName),
          window.obsAPI.sources.getVolume(sourceName)
        ]);
        const isMuted = !!(muteState && (muteState.inputMuted ?? muteState.muted));
        this._applyMuteState(muteBtn, isMuted);
        const mul = volState && typeof volState.inputVolumeMul === 'number' ? volState.inputVolumeMul : 1.0;
        volInput.value = String(Math.round(mul * 100));
      } catch (_) { /* ignore */ }

      // Event listeners
      muteBtn.addEventListener('click', async () => {
        try {
          const current = await window.obsAPI.sources.getMute(sourceName);
          const isMuted = !!(current && (current.inputMuted ?? current.muted));
          await window.obsAPI.sources.setMute(sourceName, !isMuted);
          this._applyMuteState(muteBtn, !isMuted);
          window.uiHelpers.logInfo(`${displayName} ${!isMuted ? 'muted' : 'unmuted'}`, 'mic');
        } catch (e) {
          window.uiHelpers.logError('Error toggling mic: ' + e.message, 'mic');
        }
      });

      volInput.addEventListener('input', async (e) => {
        const value = Number(e.target.value);
        const mul = Math.max(0, Math.min(1, value / 100));
        try {
          await window.obsAPI.sources.setVolume(sourceName, mul);
        } catch (err) {
          window.uiHelpers.logError('Error setting volume: ' + err.message, 'mic');
        }
      });
    },
    
    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-mute-changed') {
        this._updateMuteState(sourceName, data.inputMuted);
      } else if (eventType === 'input-volume-changed' && data.inputName === sourceName) {
        const mul = typeof data.inputVolumeMul === 'number' ? data.inputVolumeMul : undefined;
        if (mul !== undefined) this._updateVolumeSlider(sourceName, mul);
      }
    },
    
    _applyMuteState(btn, muted) {
      if (!btn) return;
      btn.textContent = muted ? 'Unmute' : 'Mute';
      btn.classList.toggle('btn-danger', !muted);
      btn.classList.toggle('btn-success', muted);
    },
    
    _updateMuteState(inputName, muted) {
      try {
        const selector = `.dash-options .btn-ghost[data-input-name="${CSS.escape(inputName)}"]`;
        const btn = document.querySelector(selector);
        if (btn) this._applyMuteState(btn, muted);
      } catch (_) { /* ignore */ }
    },

    _updateVolumeSlider(inputName, mul) {
      try {
        const selector = `.dash-options input.mic-volume[data-input-name="${CSS.escape(inputName)}"]`;
        const slider = document.querySelector(selector);
        if (slider) slider.value = String(Math.round(Math.max(0, Math.min(1, mul)) * 100));
      } catch (_) { /* ignore */ }
    }
  };

  // Auto-register when loaded
  if (window.HandlerRegistry) {
    window.HandlerRegistry.register(MicrophoneHandler);
  } else {
    // Queue for later registration
    window.addEventListener('handlerRegistryReady', () => {
      window.HandlerRegistry.register(MicrophoneHandler);
    });
  }
})();
