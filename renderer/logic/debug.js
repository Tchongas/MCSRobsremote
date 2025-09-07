// Debug Console Logic
(function() {
  let debugPage;
  let debugResponse;

  function initDebug() {
    debugPage = document.getElementById('debugPage');
    debugResponse = document.getElementById('debugResponse');
    
    // Close debug page
    document.getElementById('closeDebug').addEventListener('click', hideDebug);
    
    // Clear output
    document.getElementById('clearOutput').addEventListener('click', clearOutput);
    
    // Debug request buttons
    document.querySelectorAll('.debug-btn[data-request]').forEach(btn => {
      btn.addEventListener('click', handleDebugRequest);
    });
    
    // Custom request
    document.getElementById('sendCustomRequest').addEventListener('click', handleCustomRequest);
    
    // Keyboard shortcut: Ctrl+D to toggle debug
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'D') {
        e.preventDefault();
        toggleDebug();
      }
    });
    
    // ESC to close debug
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !debugPage.classList.contains('hidden')) {
        hideDebug();
      }
    });
  }

  function toggleDebug() {
    if (debugPage.classList.contains('hidden')) {
      showDebug();
    } else {
      hideDebug();
    }
  }

  function showDebug() {
    debugPage.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function hideDebug() {
    debugPage.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function clearOutput() {
    debugResponse.textContent = 'Click a button to see the response...';
    debugResponse.className = 'debug-response';
  }

  async function handleDebugRequest(e) {
    const requestName = e.target.dataset.request;
    const paramName = e.target.dataset.param;
    
    let params = {};
    
    // Handle parameterized requests
    if (paramName === 'sceneName') {
      const sceneNameInput = document.getElementById('sceneNameInput');
      const sceneName = sceneNameInput.value.trim();
      if (!sceneName) {
        displayError('Please enter a scene name');
        return;
      }
      params.sceneName = sceneName;
    }
    
    await executeRequest(requestName, params);
  }

  async function handleCustomRequest() {
    const requestInput = document.getElementById('customRequest');
    const paramsInput = document.getElementById('customParams');
    
    const requestName = requestInput.value.trim();
    if (!requestName) {
      displayError('Please enter a request name');
      return;
    }
    
    let params = {};
    const paramsText = paramsInput.value.trim();
    if (paramsText) {
      try {
        params = JSON.parse(paramsText);
      } catch (err) {
        displayError('Invalid JSON in parameters: ' + err.message);
        return;
      }
    }
    
    await executeRequest(requestName, params);
  }

  async function executeRequest(requestName, params = {}) {
    displayLoading(`Executing ${requestName}...`);
    
    try {
      const result = await makeRawRequest(requestName, params);
      displaySuccess(result, requestName);
    } catch (err) {
      displayError(`Request failed: ${err.message}`, err);
    }
  }

  async function makeRawRequest(requestName, params) {
    // Map request names to actual obsAPI calls
    switch (requestName) {
      case 'GetSceneList':
        return await window.obsAPI.scenes.get();
      
      case 'GetSourcesList':
        return await window.obsAPI.sources.get();
      
      case 'GetStreamStatus':
        return await window.obsAPI.streaming.status();
      
      case 'GetSceneItemList':
        if (!params.sceneName) {
          throw new Error('sceneName parameter is required for GetSceneItemList');
        }
        return await window.obsAPI.sceneItems.list(params.sceneName);
      
      default:
        throw new Error(`Request type '${requestName}' is not supported. Available requests: GetSceneList, GetSourcesList, GetStreamStatus, GetSceneItemList`);
    }
  }

  function displayLoading(message) {
    debugResponse.className = 'debug-response';
    debugResponse.textContent = message;
  }

  function displaySuccess(result, requestName) {
    debugResponse.className = 'debug-response success';
    const timestamp = new Date().toLocaleTimeString();
    const formatted = JSON.stringify(result, null, 2);
    debugResponse.textContent = `[${timestamp}] ${requestName} Response:\n\n${formatted}`;
  }

  function displayError(message, error = null) {
    debugResponse.className = 'debug-response error';
    const timestamp = new Date().toLocaleTimeString();
    let content = `[${timestamp}] ERROR: ${message}`;
    
    if (error && error.stack) {
      content += `\n\nStack trace:\n${error.stack}`;
    }
    
    debugResponse.textContent = content;
  }

  // Export debug functions
  window.debugConsole = {
    show: showDebug,
    hide: hideDebug,
    toggle: toggleDebug
  };

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDebug);
  } else {
    initDebug();
  }
})();
