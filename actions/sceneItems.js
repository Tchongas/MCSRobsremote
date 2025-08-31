const { obs, connect } = require('../obs/client');

async function list(sceneName) {
  await connect();
  return obs.call('GetSceneItemList', { sceneName });
}

async function setEnabled(sceneName, sceneItemId, sceneItemEnabled) {
  await connect();
  return obs.call('SetSceneItemEnabled', { sceneName, sceneItemId, sceneItemEnabled });
}

module.exports = { list, setEnabled };
