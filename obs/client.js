const OBSWebSocket = require('obs-websocket-js').default;
const obs = new OBSWebSocket();
let connected = false;
let eventCallbacks = new Map();

async function connect(url, password) {
  if (connected) return { connected: true };
  
  // Use provided parameters or fall back to defaults
  const connectionUrl = url || 'ws://:4455';
  const connectionPassword = password || '';
  
  console.log(`Attempting to connect to OBS at ${connectionUrl}...`);
  
  try {
    const res = await obs.connect(connectionUrl, connectionPassword);
    connected = true;
    console.log('Successfully connected to OBS');
    
    // Set up event listeners for real-time updates
    setupEventListeners();
    
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

// Event handling system
function setupEventListeners() {
  obs.on('CurrentProgramSceneChanged', (data) => notifyRenderer('scene-changed', data));
  obs.on('SceneItemEnableStateChanged', (data) => notifyRenderer('scene-item-changed', data));
  obs.on('SceneListChanged', (data) => notifyRenderer('scene-list-changed', data));
  obs.on('SceneItemListReindexed', (data) => notifyRenderer('scene-items-reordered', data));
  obs.on('SceneItemCreated', (data) => notifyRenderer('scene-item-created', data));
  obs.on('SceneItemRemoved', (data) => notifyRenderer('scene-item-removed', data));
  obs.on('InputMuteStateChanged', (data) => notifyRenderer('input-mute-changed', data));
  obs.on('InputVolumeChanged', (data) => notifyRenderer('input-volume-changed', data));
}

function notifyRenderer(eventType, data) {
  // Send event to all registered callbacks
  if (eventCallbacks.has(eventType)) {
    const callbacks = eventCallbacks.get(eventType);
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });
  }
}

function onEvent(eventType, callback) {
  if (!eventCallbacks.has(eventType)) {
    eventCallbacks.set(eventType, new Set());
  }
  eventCallbacks.get(eventType).add(callback);
}

function offEvent(eventType, callback) {
  if (eventCallbacks.has(eventType)) {
    eventCallbacks.get(eventType).delete(callback);
  }
}

module.exports = { obs, connect, disconnect, onEvent, offEvent };
