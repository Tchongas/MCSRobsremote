// PluginCreateUtils - Utilities for plugins to register scene/source creation handlers
// This allows plugins to define "templates" that create scenes with pre-configured sources
(function() {
  /**
   * Registry of scene creation handlers, keyed by plugin name
   * Structure: {
   *   pluginName: {
   *     handlers: [
   *       {
   *         id: 'handler-id',
   *         label: 'Description of what this creates',
   *         description: 'Optional longer description',
   *         onCreate: async () => { ... },
   *         sceneName: 'Optional suggested scene name'
   *       }
   *     ]
   *   }
   * }
   */
  const createHandlersRegistry = new Map();

  /**
   * Register a scene creation handler for a plugin
   * @param {string} pluginName - Name of the plugin
   * @param {string} handlerId - Unique ID for this handler within the plugin
   * @param {Object} options - Handler options
   * @param {string} options.label - Display label/description for the button (e.g., "Create simple splits scene")
   * @param {string} [options.description] - Optional longer description shown as tooltip
   * @param {string} [options.sceneName] - Optional suggested scene name
   * @param {Function} options.onCreate - Async function that creates the scene and sources
   *        Should return { sceneName: string, created: Array<string> } or throw on error
   */
  function registerSceneCreateHandler(pluginName, handlerId, options) {
    if (!pluginName || typeof pluginName !== 'string') {
      console.error('[PluginCreateUtils] registerSceneCreateHandler: pluginName is required');
      return;
    }
    if (!handlerId || typeof handlerId !== 'string') {
      console.error('[PluginCreateUtils] registerSceneCreateHandler: handlerId is required');
      return;
    }
    if (!options || typeof options !== 'object') {
      console.error('[PluginCreateUtils] registerSceneCreateHandler: options is required');
      return;
    }
    if (!options.label || typeof options.label !== 'string') {
      console.error('[PluginCreateUtils] registerSceneCreateHandler: options.label is required');
      return;
    }
    if (!options.onCreate || typeof options.onCreate !== 'function') {
      console.error('[PluginCreateUtils] registerSceneCreateHandler: options.onCreate function is required');
      return;
    }

    if (!createHandlersRegistry.has(pluginName)) {
      createHandlersRegistry.set(pluginName, { handlers: [] });
    }

    const pluginEntry = createHandlersRegistry.get(pluginName);
    
    // Remove existing handler with same ID if present
    const existingIndex = pluginEntry.handlers.findIndex(h => h.id === handlerId);
    if (existingIndex >= 0) {
      pluginEntry.handlers.splice(existingIndex, 1);
    }

    // Add the new handler
    pluginEntry.handlers.push({
      id: handlerId,
      label: options.label,
      description: options.description || '',
      sceneName: options.sceneName || '',
      onCreate: options.onCreate
    });

    console.log(`[PluginCreateUtils] Registered handler "${handlerId}" for plugin "${pluginName}"`);

    // Notify the create tab that registry has changed
    notifyCreateTabUpdated();
  }

  /**
   * Unregister a specific handler for a plugin
   * @param {string} pluginName - Name of the plugin
   * @param {string} handlerId - ID of the handler to remove
   */
  function unregisterSceneCreateHandler(pluginName, handlerId) {
    const pluginEntry = createHandlersRegistry.get(pluginName);
    if (!pluginEntry) return;

    const index = pluginEntry.handlers.findIndex(h => h.id === handlerId);
    if (index >= 0) {
      pluginEntry.handlers.splice(index, 1);
      console.log(`[PluginCreateUtils] Unregistered handler "${handlerId}" for plugin "${pluginName}"`);
    }

    // Clean up empty plugin entries
    if (pluginEntry.handlers.length === 0) {
      createHandlersRegistry.delete(pluginName);
    }

    notifyCreateTabUpdated();
  }

  /**
   * Unregister all handlers for a plugin (useful for cleanup)
   * @param {string} pluginName - Name of the plugin
   */
  function unregisterAllPluginHandlers(pluginName) {
    if (createHandlersRegistry.has(pluginName)) {
      createHandlersRegistry.delete(pluginName);
      console.log(`[PluginCreateUtils] Unregistered all handlers for plugin "${pluginName}"`);
      notifyCreateTabUpdated();
    }
  }

  /**
   * Get all registered handlers organized by plugin
   * @returns {Map<string, {handlers: Array}>}
   */
  function getAllHandlers() {
    return new Map(createHandlersRegistry);
  }

  /**
   * Get handlers for a specific plugin
   * @param {string} pluginName - Name of the plugin
   * @returns {Array|null}
   */
  function getPluginHandlers(pluginName) {
    const entry = createHandlersRegistry.get(pluginName);
    return entry ? entry.handlers : null;
  }

  /**
   * Execute a create handler
   * @param {string} pluginName - Name of the plugin
   * @param {string} handlerId - ID of the handler to execute
   * @returns {Promise<{sceneName: string, created: Array<string>}>}
   */
  async function executeHandler(pluginName, handlerId) {
    const pluginEntry = createHandlersRegistry.get(pluginName);
    if (!pluginEntry) {
      throw new Error(`Plugin "${pluginName}" not found in registry`);
    }

    const handler = pluginEntry.handlers.find(h => h.id === handlerId);
    if (!handler) {
      throw new Error(`Handler "${handlerId}" not found for plugin "${pluginName}"`);
    }

    try {
      const result = await handler.onCreate();
      return result || { sceneName: '', created: [] };
    } catch (err) {
      console.error(`[PluginCreateUtils] Handler "${handlerId}" for "${pluginName}" failed:`, err);
      throw err;
    }
  }

  /**
   * Helper to create a scene with multiple sources
   * This is a convenience wrapper around OBS scene creation APIs
   * @param {string} sceneName - Name for the new scene
   * @param {Array<Object>} sources - Array of source definitions
   * @param {string} sources[].name - Source name
   * @param {string} sources[].kind - Source kind (e.g., 'text_gdiplus_v3', 'browser_source')
   * @param {Object} [sources[].settings] - Source settings
   * @param {boolean} [sources[].enabled] - Whether source is visible (default true)
   * @returns {Promise<{sceneName: string, created: Array<string>}>}
   */
  async function createSceneWithSources(sceneName, sources = []) {
    if (!window.obsAPI?.sceneCreate?.createScene) {
      throw new Error('Scene creation API not available');
    }

    // Check if scene already exists
    const exists = await window.obsAPI.sceneCreate.sceneExists(sceneName);
    if (exists) {
      throw new Error(`Scene "${sceneName}" already exists`);
    }

    // Create the scene
    await window.obsAPI.sceneCreate.createScene(sceneName);

    // Create all sources
    const created = [];
    const failed = [];

    for (const source of sources) {
      if (!source.name || !source.kind) {
        console.warn('[PluginCreateUtils] Skipping invalid source:', source);
        continue;
      }

      try {
        // Try to create the input (source)
        await window.obsAPI.sceneCreate.createInput(
          sceneName,
          source.name,
          source.kind,
          source.settings || {},
          source.enabled !== false
        );
        created.push(source.name);
        console.log(`[PluginCreateUtils] Created source: ${source.name}`);
      } catch (err) {
        // Check if error is because source already exists (OBS error code 601)
        const isDuplicate = err?.code === 601 ||
                           err?.message?.includes('already exists') ||
                           err?.error?.includes('already exists');

        if (isDuplicate) {
          console.log(`[PluginCreateUtils] Source "${source.name}" already exists, adding to scene...`);
          try {
            // Try to add existing source to scene using createSceneItem
            if (window.obsAPI?.sceneCreate?.createSceneItem) {
              await window.obsAPI.sceneCreate.createSceneItem(
                sceneName,
                source.name,
                source.enabled !== false
              );
              created.push(source.name);
              console.log(`[PluginCreateUtils] Added existing source to scene: ${source.name}`);
            } else {
              console.warn(`[PluginCreateUtils] Cannot add existing source - createSceneItem not available`);
              failed.push(source.name);
            }
          } catch (addErr) {
            console.warn(`[PluginCreateUtils] Failed to add existing source "${source.name}":`, addErr.message);
            // Source might already be in the scene, count as success
            if (addErr?.message?.includes('already in scene') || addErr?.code === 601) {
              created.push(source.name);
            } else {
              failed.push(source.name);
            }
          }
        } else {
          console.error(`[PluginCreateUtils] Failed to create source "${source.name}":`, err);
          failed.push(source.name);
        }
      }
    }

    console.log(`[PluginCreateUtils] Scene "${sceneName}" created with ${created.length} sources (${failed.length} failed)`);
    return { sceneName, created, failed };
  }

  /**
   * Helper to generate a unique scene name by appending a number if needed
   * @param {string} baseName - Desired base name
   * @param {number} [maxAttempts] - Maximum number to try (default 100)
   * @returns {Promise<string>} - Unique scene name
   */
  async function generateUniqueSceneName(baseName, maxAttempts = 100) {
    if (!window.obsAPI?.sceneCreate?.sceneExists) {
      return baseName;
    }

    // Check if base name is available
    const exists = await window.obsAPI.sceneCreate.sceneExists(baseName);
    if (!exists) {
      return baseName;
    }

    // Try numbered variants
    for (let i = 2; i <= maxAttempts; i++) {
      const candidate = `${baseName} ${i}`;
      const exists = await window.obsAPI.sceneCreate.sceneExists(candidate);
      if (!exists) {
        return candidate;
      }
    }

    // Fallback with timestamp
    return `${baseName} ${Date.now()}`;
  }

  /**
   * Notify the create tab that registry has been updated
   * This allows the UI to refresh without polling
   */
  function notifyCreateTabUpdated() {
    // Dispatch a custom event that create-tab.js can listen for
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('plugincreateutils:registry-updated', {
        detail: { registry: createHandlersRegistry }
      }));
    }
  }

  // Public API
  window.PluginCreateUtils = {
    registerSceneCreateHandler,
    unregisterSceneCreateHandler,
    unregisterAllPluginHandlers,
    getAllHandlers,
    getPluginHandlers,
    executeHandler,
    createSceneWithSources,
    generateUniqueSceneName,
    _notifyUpdate: notifyCreateTabUpdated
  };

  console.log('[PluginCreateUtils] Initialized');
})();
