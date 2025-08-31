const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();
let connected = false;

async function connect(url = 'ws://localhost:4455', password = 'UQXZK2ZO2hnB8Und') {
  if (connected) return { connected: true };
  
  console.log(`Attempting to connect to OBS at ${url}...`);
  
  try {
    const res = await obs.connect(url, password);
    connected = true;
    console.log('Successfully connected to OBS');
    return res;
  } catch (error) {
    console.error('OBS connection failed:', error.message);
    throw error;
  }
}

async function disconnect() {
  if (!connected) return { disconnected: true };
  try {
    await obs.disconnect();
  } catch (e) {
    // ignore errors on disconnect
  } finally {
    connected = false;
    console.log('Disconnected from OBS');
  }
  return { disconnected: true };
}

module.exports = { obs, connect, disconnect };
