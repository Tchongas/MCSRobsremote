const { obs, requireConnected } = require('../obs/client');

async function get() {
  requireConnected();
  return obs.call('GetSceneList');
}

async function change(sceneName) {
  requireConnected();
  return obs.call('SetCurrentProgramScene', { sceneName });
}

async function setPreviewScene(sceneName) {
  requireConnected();
  return obs.call('SetCurrentPreviewScene', { sceneName });
}

async function triggerStudioModeTransition() {
  requireConnected();
  return obs.call('TriggerStudioModeTransition');
}

async function getStudioModeEnabled() {
  requireConnected();
  return obs.call('GetStudioModeEnabled');
}

module.exports = { get, change, setPreviewScene, triggerStudioModeTransition, getStudioModeEnabled };
