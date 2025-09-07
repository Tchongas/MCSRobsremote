// Source Types Registry and Helpers
// Centralize logic for determining source features and icons.
(function() {
  const MIC_KINDS = new Set([
    'wasapi_input_capture',
    'pulse_input_capture',
    'coreaudio_input_capture'
  ]);

  function isMicrophone(kind, name) {
    const k = (kind || '').toLowerCase();
    const n = (name || '').toLowerCase();
    return MIC_KINDS.has(k) || /microphone/.test(n);
  }

  function isBrowser(kind) {
    return (kind || '').toLowerCase() === 'browser_source';
  }

  function getIcon(kind, name) {
    const k = (kind || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (MIC_KINDS.has(k) || /microphone/.test(n)) return '🎤';
    if (k === 'browser_source') return '🌐';
    if (k === 'display_capture') return '🖥️';
    if (k === 'window_capture') return '🖥️';
    if (k === 'game_capture') return '🎮';
    if (k === 'media_source') return '🎞️';
    if (k === 'image_source') return '🖼️';
    if (k === 'color_source') return '🎨';
    if (k === 'text_gdiplus_v3') return '🅰️';
    if (k === 'dshow_input' || k === 'av_capture_input' || k === 'video_capture_device') return '🎥';
    if (k === 'scene') return '🎬';
    if (k === 'group') return '🗂️';
    return '📦';
  }

  function collectInputMaps(inputs) {
    const kindByName = new Map();
    const micNameSet = new Set();
    for (const input of inputs || []) {
      const kind = input.inputKind || input.typeId || '';
      const name = input.inputName || input.sourceName || '';
      if (!name) continue;
      kindByName.set(name, kind || '');
      if (isMicrophone(kind, name)) micNameSet.add(name);
    }
    return { kindByName, micNameSet };
  }

  window.sourceTypes = {
    isMicrophone,
    isBrowser,
    getIcon,
    collectInputMaps
  };
})();
