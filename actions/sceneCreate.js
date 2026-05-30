const { obs, requireConnected } = require('../obs/client');

/**
 * Create a new scene in OBS
 * @param {string} sceneName - Name for the new scene
 * @returns {Promise<{sceneName: string, sceneUuid: string}>}
 */
async function createScene(sceneName) {
  requireConnected();
  const result = await obs.call('CreateScene', { sceneName });
  return result;
}

/**
 * Create a new input/source in OBS
 * @param {string} sceneName - Scene to add the input to
 * @param {string} inputName - Name for the new input
 * @param {string} inputKind - Input kind (e.g., 'text_gdiplus_v3', 'browser_source', 'image_source')
 * @param {Object} inputSettings - Initial settings for the input
 * @param {boolean} sceneItemEnabled - Whether the scene item is visible
 * @returns {Promise<{sceneItemId: number, inputUuid: string}>}
 */
async function createInput(sceneName, inputName, inputKind, inputSettings = {}, sceneItemEnabled = true) {
  requireConnected();
  const result = await obs.call('CreateInput', {
    sceneName,
    inputName,
    inputKind,
    inputSettings,
    sceneItemEnabled
  });
  return result;
}

/**
 * Add an existing source to a scene as a scene item
 * @param {string} sceneName - Scene to add the source to
 * @param {string} sourceName - Name of the existing source/input
 * @param {boolean} sceneItemEnabled - Whether the scene item is visible (default true)
 * @returns {Promise<{sceneItemId: number}>}
 */
async function createSceneItem(sceneName, sourceName, sceneItemEnabled = true) {
  requireConnected();
  const result = await obs.call('CreateSceneItem', {
    sceneName,
    sourceName,
    sceneItemEnabled
  });
  return result;
}

/**
 * Remove a scene from OBS
 * @param {string} sceneName - Name of the scene to remove
 * @returns {Promise<void>}
 */
async function removeScene(sceneName) {
  requireConnected();
  await obs.call('RemoveScene', { sceneName });
}

/**
 * Check if a scene exists
 * @param {string} sceneName - Name of the scene to check
 * @returns {Promise<boolean>}
 */
async function sceneExists(sceneName) {
  requireConnected();
  try {
    const result = await obs.call('GetSceneSceneTransitionOverride', { sceneName });
    return !!result;
  } catch (err) {
    // Scene doesn't exist or other error
    return false;
  }
}

/**
 * Get list of available input kinds
 * @returns {Promise<Array<string>>}
 */
async function getInputKindList() {
  requireConnected();
  const result = await obs.call('GetInputKindList');
  return result?.inputKinds || [];
}

/**
 * Get default settings for an input kind
 * @param {string} inputKind - Input kind to get defaults for
 * @returns {Promise<Object>}
 */
async function getDefaultInputSettings(inputKind) {
  requireConnected();
  const result = await obs.call('GetDefaultInputSettings', { inputKind });
  return result?.defaultInputSettings || {};
}

module.exports = {
  createScene,
  createInput,
  createSceneItem,
  removeScene,
  sceneExists,
  getInputKindList,
  getDefaultInputSettings
};
