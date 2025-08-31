const { obs, connect } = require('../obs/client');

async function getUrl(inputName) {
  await connect();
  const res = await obs.call('GetInputSettings', { inputName });
  // Some OBS versions return inputKind here; fallback: assume browser if url exists
  const isBrowser = res && (res.inputKind === 'browser_source' || (res.inputSettings && 'url' in res.inputSettings));
  if (!isBrowser) return null;
  return res.inputSettings ? res.inputSettings.url : null;
}

async function setUrl(inputName, url) {
  await connect();
  // Overlay true merges with existing settings
  return obs.call('SetInputSettings', { inputName, inputSettings: { url }, overlay: true });
}

// Hard reload (refresh cache / no cache)
async function refreshNoCache(inputName) {
  await connect();
  return obs.call('PressInputPropertiesButton', { inputName, propertyName: 'refreshnocache' });
}

module.exports = { getUrl, setUrl, refreshNoCache };
