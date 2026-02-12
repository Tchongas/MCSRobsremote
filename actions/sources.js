const { obs, connect } = require('../obs/client');

async function get() {
  await connect();
  return obs.call('GetInputList');
}

async function toggle(sourceName) {
  await connect();
  return obs.call('ToggleInputMute', { inputName: sourceName });
}

async function getMute(sourceName) {
  await connect();
  return obs.call('GetInputMute', { inputName: sourceName });
}

// Directly set mute state
async function setMute(sourceName, inputMuted) {
  await connect();
  return obs.call('SetInputMute', { inputName: sourceName, inputMuted });
}

// Volume controls
async function getVolume(sourceName) {
  await connect();
  // Returns { inputVolumeMul, inputVolumeDb }
  return obs.call('GetInputVolume', { inputName: sourceName });
}

async function setVolume(sourceName, inputVolumeMul) {
  await connect();
  return obs.call('SetInputVolume', { inputName: sourceName, inputVolumeMul });
}

// Get input settings (for text sources, etc.)
async function getSettings(sourceName) {
  await connect();
  return obs.call('GetInputSettings', { inputName: sourceName });
}

// Set input settings (for text sources, etc.)
async function setSettings(sourceName, inputSettings) {
  await connect();
  return obs.call('SetInputSettings', { inputName: sourceName, inputSettings });
}

module.exports = { get, toggle, getMute, setMute, getVolume, setVolume, getSettings, setSettings };
