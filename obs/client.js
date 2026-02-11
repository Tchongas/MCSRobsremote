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
  // Scene change events
  obs.on('CurrentProgramSceneChanged', (data) => {
    console.log('Scene changed to:', data.sceneName);
    notifyRenderer('scene-changed', data);
  });

  // Scene item visibility changes
  obs.on('SceneItemEnableStateChanged', (data) => {
    console.log('Scene item visibility changed:', data.sceneItemId, data.sceneItemEnabled);
    notifyRenderer('scene-item-changed', data);
  });

  // Scene list changes (when scenes are added/removed)
  obs.on('SceneListChanged', (data) => {
    console.log('Scene list changed');
    notifyRenderer('scene-list-changed', data);
  });

  // Scene item list changes (when items are added/removed/reordered)
  obs.on('SceneItemListReindexed', (data) => {
    console.log('Scene items reordered in:', data.sceneName);
    notifyRenderer('scene-items-reordered', data);
  });

  // Scene item created (new source added to a scene)
  obs.on('SceneItemCreated', (data) => {
    console.log('Scene item created:', data.sourceName, 'in', data.sceneName);
    notifyRenderer('scene-item-created', data);
  });

  // Scene item removed (source removed from a scene)
  obs.on('SceneItemRemoved', (data) => {
    console.log('Scene item removed:', data.sourceName, 'from', data.sceneName);
    notifyRenderer('scene-item-removed', data);
  });

  // Source/Input changes
  obs.on('InputMuteStateChanged', (data) => {
    console.log('Input mute state changed:', data.inputName, data.inputMuted);
    notifyRenderer('input-mute-changed', data);
  });

  // Input volume changes
  obs.on('InputVolumeChanged', (data) => {
    // data: { inputName, inputVolumeMul, inputVolumeDb }
    console.log('Input volume changed:', data.inputName, data.inputVolumeMul);
    notifyRenderer('input-volume-changed', data);
  });
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
