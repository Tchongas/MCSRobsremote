const { obs, connect } = require('../obs/client');

async function list(sceneName) {
  await connect();
  return obs.call('GetSceneItemList', { sceneName });
}

async function setEnabled(sceneName, sceneItemId, sceneItemEnabled) {
  await connect();
  return obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled });
}

async function getTransform(sceneName, sceneItemId) {
  await connect();
  return obs.call('GetSceneItemTransform', { sceneName, sceneItemId });
}

async function setTransform(sceneName, sceneItemId, sceneItemTransform) {
  await connect();
  return obs.call('SetSceneItemTransform', { sceneName, sceneItemId, sceneItemTransform });
}

module.exports = { list, setEnabled, getTransform, setTransform };
