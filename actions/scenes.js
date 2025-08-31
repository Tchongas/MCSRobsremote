const { obs, connect } = require('../obs/client');

async function get() {
  await connect();
  return obs.call('GetSceneList');
}

async function change(sceneName) {
  await connect();
  return obs.call('SetCurrentProgramScene', { sceneName });
}

module.exports = { get, change };
