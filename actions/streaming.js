const { obs, connect } = require('../obs/client');

async function start() {
  await connect();
  return obs.call('StartStream');
}

async function stop() {
  await connect();
  return obs.call('StopStream');
}

async function status() {
  await connect();
  return obs.call('GetStreamStatus');
}

module.exports = { start, stop, status };
