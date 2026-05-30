const { obs, requireConnected } = require('../obs/client');

async function start() {
  requireConnected();
  return obs.call('StartStream');
}

async function stop() {
  requireConnected();
  return obs.call('StopStream');
}

async function status() {
  requireConnected();
  return obs.call('GetStreamStatus');
}

module.exports = { start, stop, status };
