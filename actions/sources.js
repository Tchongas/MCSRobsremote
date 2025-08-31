const { obs, connect } = require('../obs/client');

async function get() {
  await connect();
  return obs.call('GetInputList');
}

async function toggle(sourceName) {
  await connect();
  return obs.call('ToggleInputMute', { inputName: sourceName });
}

async function toggleMute(sourceName) {
  await connect();
  return obs.call('ToggleInputMute', { inputName: sourceName });
}

async function getMute(sourceName) {
  await connect();
  return obs.call('GetInputMute', { inputName: sourceName });
}

module.exports = { get, toggle, toggleMute, getMute };
