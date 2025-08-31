// DOM event bindings that use uiLogic and window.obsAPI
(function() {
  const { log, setConnBadge, setSceneBadge, setIndicator, refreshScenes, loadDashboardItems } = window.uiLogic;

  const connectBtn = document.getElementById('connect');
  const disconnectBtn = document.getElementById('disconnect');

  // Connect to OBS
  connectBtn.addEventListener('click', async () => {
    log('Attempting to connect to OBS...');
    try {
      const result = await window.obsAPI.connect();
      log('✅ Connected to OBS successfully!');
      log('Connection details: ' + JSON.stringify(result, null, 2));
      setConnBadge(true);
      setIndicator(connectBtn, 'green');

      // Auto-refresh scenes after successful connection
      log('Loading available scenes...');
      await refreshScenes();
    } catch (e) {
      log('❌ Connection failed: ' + e.message);
      setConnBadge(false);
      setIndicator(connectBtn, 'red');

      if (e.message.includes('ETIMEDOUT') || e.message.includes('connect ECONNREFUSED')) {
        log('');
        log('Troubleshooting steps:');
        log('1. Make sure OBS Studio is running on localhost');
        log('2. In OBS: Tools → WebSocket Server Settings');
        log('3. Enable "WebSocket server" and set port to 4455');
        log('4. Check if the password matches: UQXZK2ZO2hnB8Und');
        log('5. Verify network connectivity to localhost');
      }
    }
  });

  // Disconnect from OBS
  disconnectBtn.addEventListener('click', async () => {
    log('Disconnecting from OBS...');
    try {
      await window.obsAPI.disconnect();
      setConnBadge(false);
      setIndicator(connectBtn, 'red');
      // Reset scene UI
      setSceneBadge('-');
      const select = document.getElementById('sceneSelect');
      if (select) {
        select.value = '';
        select.disabled = true;
      }
      // Clear dashboard
      const container = document.getElementById('dashboardItems');
      if (container) {
        container.classList.add('placeholder');
        container.textContent = 'Disconnected. Connect to load items...';
      }
      log('✅ Disconnected from OBS');
    } catch (e) {
      log('❌ Failed to disconnect: ' + e.message);
    }
  });

  // (Removed old Toggle Mic button and handlers)

  // Streaming controls
  document.getElementById('start').addEventListener('click', async () => {
    try {
      await window.obsAPI.streaming.start();
      log('Started streaming!');
    } catch (e) {
      log('Error starting streaming: ' + e.message);
    }
  });

  document.getElementById('stop').addEventListener('click', async () => {
    try {
      await window.obsAPI.streaming.stop();
      log('Stopped streaming!');
    } catch (e) {
      log('Error stopping streaming: ' + e.message);
    }
  });

  // Refresh scenes button
  document.getElementById('refreshScenes').addEventListener('click', refreshScenes);

  // Immediate scene switching on selection change
  document.getElementById('sceneSelect').addEventListener('change', async (e) => {
    const sceneName = e.target.value;
    if (!sceneName) return;
    try {
      await window.obsAPI.scenes.change(sceneName);
      log('🔁 Switched scene to: ' + sceneName);
      setSceneBadge(sceneName);
      await loadDashboardItems(sceneName);
    } catch (err) {
      log('❌ Error switching scene: ' + err.message);
    }
  });
})();
