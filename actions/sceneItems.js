const { obs, requireConnected } = require('../obs/client');

async function list(sceneName) {
  requireConnected();
  return obs.call('GetSceneItemList', { sceneName });
}

async function listGroup(groupName) {
  requireConnected();
  return obs.call('GetGroupSceneItemList', { sceneName: groupName });
}

async function setEnabled(sceneName, sceneItemId, sceneItemEnabled) {
  requireConnected();
  return obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled });
}

async function setGroupEnabled(groupName, sceneItemId, sceneItemEnabled) {
  requireConnected();
  return obs.call('SetSceneItemEnabled', { sceneName: groupName, sceneItemId, sceneItemEnabled });
}

async function getTransform(sceneName, sceneItemId) {
  requireConnected();
  return obs.call('GetSceneItemTransform', { sceneName, sceneItemId });
}

async function setTransform(sceneName, sceneItemId, sceneItemTransform) {
  requireConnected();
  return obs.call('SetSceneItemTransform', { sceneName, sceneItemId, sceneItemTransform });
}

module.exports = { list, listGroup, setEnabled, setGroupEnabled, getTransform, setTransform };
