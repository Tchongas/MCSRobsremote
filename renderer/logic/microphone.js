// Microphone controls: list inputs, toggle mute, adjust volume
(function() {
  function isMicInput(input) {
    const kind = input.inputKind || input.typeId || '';
    const name = input.inputName || '';
    // Common desktop mic kinds across platforms
    const micKinds = [
      'wasapi_input_capture',
      'pulse_input_capture',
      'coreaudio_input_capture'
    ];
    return micKinds.includes(kind) || /microphone/i.test(name);
  }

  async function loadMicrophoneControls() {
    const container = document.getElementById('micControls');
    if (!container) return;

    container.innerHTML = '';
    const header = document.createElement('h3');
    header.textContent = 'Microphones';
    header.style.margin = '8px 0 6px 0';
    container.appendChild(header);

    const list = document.createElement('div');
    list.className = 'mic-list';
    container.appendChild(list);

    try {
      const res = await window.obsAPI.sources.get();
      const inputs = res && (res.inputs || res.sources || res);
      if (!Array.isArray(inputs)) {
        list.textContent = 'No inputs found';
        return;
      }

      const mics = inputs.filter(isMicInput);
      if (mics.length === 0) {
        list.textContent = 'No microphone inputs detected';
        return;
      }

      for (const mic of mics) {
        await renderMicRow(list, mic.inputName || mic.sourceName);
      }
    } catch (e) {
      window.uiHelpers.log('❌ Error loading microphones: ' + e.message);
      list.textContent = 'Failed to load microphones';
    }
  }

  async function renderMicRow(parent, inputName) {
    const itemWrap = document.createElement('div');
    itemWrap.className = 'mic-row';
    itemWrap.dataset.inputName = inputName;

    // Header row with name and expand arrow
    const row = document.createElement('div');
    row.className = 'dash-row';

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = inputName;

    const nameWrap = document.createElement('div');
    nameWrap.className = 'name-wrap';
    nameWrap.appendChild(name);

    // Options panel (hidden by default)
    const options = document.createElement('div');
    options.className = 'dash-options';
    options.setAttribute('aria-hidden', 'true');

    // Create expand arrow button
    const expandBtn = document.createElement('button');
    expandBtn.className = 'icon-btn expand-btn';
    expandBtn.title = 'Show microphone options';
    expandBtn.textContent = '▸';
    nameWrap.insertBefore(expandBtn, nameWrap.firstChild);

    let expanded = false;
    const setArrow = () => (expandBtn.textContent = expanded ? '▾' : '▸');
    const applyExpanded = () => {
      options.classList.toggle('open', expanded);
      expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      options.setAttribute('aria-hidden', expanded ? 'false' : 'true');
      setArrow();
    };
    applyExpanded();

    // Toggle expansion
    expandBtn.addEventListener('click', () => {
      expanded = !expanded;
      applyExpanded();
    });
    nameWrap.style.cursor = 'pointer';
    nameWrap.setAttribute('role', 'button');
    nameWrap.tabIndex = 0;
    const safeToggle = (evt) => {
      if (evt.target.closest('input, button, .dash-options')) return;
      expanded = !expanded;
      applyExpanded();
    };
    nameWrap.addEventListener('click', safeToggle);
    nameWrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        safeToggle(e);
      }
    });

    // Build controls inside options panel
    const controlsRow = document.createElement('div');
    controlsRow.className = 'dash-option-row';

    const muteBtn = document.createElement('button');
    muteBtn.className = 'btn-ghost';
    muteBtn.textContent = 'Mute';

    const volWrap = document.createElement('div');
    volWrap.className = 'mic-volume-wrap';
    const volLabel = document.createElement('label');
    volLabel.className = 'input-label';
    volLabel.textContent = 'Volume';
    const volInput = document.createElement('input');
    volInput.type = 'range';
    volInput.min = '0';
    volInput.max = '100';
    volInput.value = '100';
    volInput.className = 'mic-volume';

    controlsRow.appendChild(muteBtn);
    controlsRow.appendChild(volLabel);
    controlsRow.appendChild(volInput);
    options.appendChild(controlsRow);

    // Assemble elements
    row.appendChild(nameWrap);
    itemWrap.appendChild(row);
    itemWrap.appendChild(options);
    parent.appendChild(itemWrap);

    try {
      const [muteState, volumeState] = await Promise.all([
        window.obsAPI.sources.getMute(inputName),
        window.obsAPI.sources.getVolume(inputName)
      ]);

      const isMuted = !!(muteState && (muteState.inputMuted ?? muteState.muted));
      applyMuteState(muteBtn, isMuted);

      const mul = volumeState && typeof volumeState.inputVolumeMul === 'number' ? volumeState.inputVolumeMul : 1.0;
      volInput.value = String(Math.round(mul * 100));
    } catch (e) {
      // ignore initial state errors
    }

    muteBtn.addEventListener('click', async () => {
      try {
        // Toggle: fetch current then invert
        const current = await window.obsAPI.sources.getMute(inputName);
        const isMuted = !!(current && (current.inputMuted ?? current.muted));
        await window.obsAPI.sources.setMute(inputName, !isMuted);
        applyMuteState(muteBtn, !isMuted);
        window.uiHelpers.log(`🎤 ${inputName} ${!isMuted ? 'muted' : 'unmuted'}`);
      } catch (e) {
        window.uiHelpers.log('❌ Error toggling mic: ' + e.message);
      }
    });

    volInput.addEventListener('input', async (e) => {
      const value = Number(e.target.value);
      const mul = Math.max(0, Math.min(1, value / 100));
      try {
        await window.obsAPI.sources.setVolume(inputName, mul);
      } catch (err) {
        window.uiHelpers.log('❌ Error setting volume: ' + err.message);
      }
    });
  }

  function applyMuteState(btn, muted) {
    btn.textContent = muted ? 'Unmute' : 'Mute';
    btn.classList.toggle('btn-danger', !muted);
    btn.classList.toggle('btn-success', muted);
  }

  function updateMicMuteState(inputName, muted) {
    const row = document.querySelector(`.mic-row[data-input-name="${CSS.escape(inputName)}"]`);
    if (!row) return;
    const btn = row.querySelector('button');
    if (!btn) return;
    applyMuteState(btn, muted);
  }

  window.microphoneLogic = {
    loadMicrophoneControls,
    updateMicMuteState
  };
})();
