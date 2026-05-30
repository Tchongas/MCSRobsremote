const { obs, requireConnected } = require('../obs/client');

async function get() {
  requireConnected();
  return obs.call('GetInputList');
}

async function toggle(sourceName) {
  requireConnected();
  return obs.call('ToggleInputMute', { inputName: sourceName });
}

async function getMute(sourceName) {
  requireConnected();
  return obs.call('GetInputMute', { inputName: sourceName });
}

// Directly set mute state
async function setMute(sourceName, inputMuted) {
  requireConnected();
  return obs.call('SetInputMute', { inputName: sourceName, inputMuted });
}

// Volume controls
async function getVolume(sourceName) {
  requireConnected();
  // Returns { inputVolumeMul, inputVolumeDb }
  return obs.call('GetInputVolume', { inputName: sourceName });
}

async function setVolume(sourceName, inputVolumeMul) {
  requireConnected();
  return obs.call('SetInputVolume', { inputName: sourceName, inputVolumeMul });
}

// Get input settings (for text sources, etc.)
async function getSettings(sourceName) {
  requireConnected();
  return obs.call('GetInputSettings', { inputName: sourceName });
}

// Set input settings (for text sources, etc.)
async function setSettings(sourceName, inputSettings) {
  requireConnected();
  return obs.call('SetInputSettings', { inputName: sourceName, inputSettings });
}

module.exports = { get, toggle, getMute, setMute, getVolume, setVolume, getSettings, setSettings };
