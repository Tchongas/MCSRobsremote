const { obs, requireConnected } = require('../obs/client');

async function playMedia(inputName) {
  requireConnected();
  // Use RESTART if you want to make sure starts from beginning
  const action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY';
  try {
    await obs.call('TriggerMediaInputAction', { inputName, mediaAction: action });
    return true;
  } catch (err) {
    console.error('playMedia error for', inputName, err);
    // Fallback to RESTART if PLAY fails
    try {
      await obs.call('TriggerMediaInputAction', { inputName, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' });
      return true;
    } catch (err2) {
      console.error('playMedia restart fallback failed for', inputName, err2);
      return false;
    }
  }
}

async function stopMedia(inputName) {
  requireConnected();
  try {
    await obs.call('TriggerMediaInputAction', { inputName, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP' });
    return true;
  } catch (err) {
    console.error('stopMedia error for', inputName, err);
    return false;
  }
}

async function getMediaStatus(inputName) {
  requireConnected();
  try {
    const res = await obs.call('GetMediaInputStatus', { inputName });
    return res; // { mediaState, mediaDuration, mediaCursor }
  } catch (err) {
    console.error('getMediaStatus error for', inputName, err);
    return null;
  }
}

async function toggleMedia(inputName) {
  requireConnected();
  const status = await getMediaStatus(inputName);
  const state = status?.mediaState;
  // States: OBS_MEDIA_STATE_NONE, STOPPED, PLAYING, PAUSED, ENDED, ERROR, OPENING, BUFFERING
  let action;
  if (state === 'OBS_MEDIA_STATE_PLAYING') {
    action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PAUSE';
  } else if (state === 'OBS_MEDIA_STATE_PAUSED' || state === 'OBS_MEDIA_STATE_STOPPED' || state === 'OBS_MEDIA_STATE_ENDED') {
    action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY';
  } else {
    // Fallback: try PLAY
    action = 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY';
  }
  try {
    await obs.call('TriggerMediaInputAction', { inputName, mediaAction: action });
    return true;
  } catch (err) {
    console.error('toggleMedia error for', inputName, err);
    return false;
  }
}

async function restartMedia(inputName) {
  requireConnected();
  try {
    await obs.call('TriggerMediaInputAction', { inputName, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART' });
    return true;
  } catch (err) {
    console.error('restartMedia error for', inputName, err);
    return false;
  }
}

module.exports = { playMedia, stopMedia, toggleMedia, restartMedia, getMediaStatus };