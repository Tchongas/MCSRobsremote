// CustomHandler - Extensible plugin system for additional source functionality
(function() {
  const plugins = new Map();
  const externalPlugins = new Map();
  let pluginLoadPromise = null;
  
  // Plugin interface specification
  const PluginInterface = {
    // Required methods
    name: 'UnknownPlugin',
    version: '1.0.0',
    canHandle: (sourceKind, sourceName, context) => false,
    execute: async (element, sourceName, displayName, context) => {},
    
    // Optional methods
    priority: () => 0, // Higher priority plugins run first
    cleanup: (sourceName) => {},
    onRemoteUpdate: (sourceName, eventType, data) => {},
    isExternal: false // Flag to distinguish external plugins
  };

  function registerPlugin(plugin) {
    if (!plugin.name) {
      console.warn('Plugin registration failed: missing name');
      return false;
    }
    
    if (!plugin.canHandle || typeof plugin.canHandle !== 'function') {
      console.warn(`Plugin ${plugin.name}: missing canHandle method`);
      return false;
    }
    
    if (!plugin.execute || typeof plugin.execute !== 'function') {
      console.warn(`Plugin ${plugin.name}: missing execute method`);
      return false;
    }

    const pluginData = {
      ...PluginInterface,
      ...plugin,
      priority: plugin.priority || (() => 0)
    };

    // Store in appropriate registry
    if (plugin.isExternal) {
      externalPlugins.set(plugin.name, pluginData);
      console.log(`🔌 Registered external plugin: ${plugin.name} v${plugin.version || '1.0.0'}`);
    } else {
      plugins.set(plugin.name, pluginData);
      console.log(`🔌 Registered built-in plugin: ${plugin.name} v${plugin.version || '1.0.0'}`);
    }

    return true;
  }

  function unregisterPlugin(name) {
    const removedBuiltIn = plugins.delete(name);
    const removedExternal = externalPlugins.delete(name);
    const removed = removedBuiltIn || removedExternal;
    
    if (removed) {
      console.log(`🗑️ Unregistered plugin: ${name}`);
    }
    return removed;
  }

  // Load external plugins from filesystem
  async function loadExternalPlugins() {
    if (pluginLoadPromise) {
      return pluginLoadPromise;
    }

    pluginLoadPromise = (async () => {
      try {
        if (!window.pluginAPI) {
          console.warn('Plugin API not available - external plugins disabled');
          return;
        }

        const externalPluginData = await window.pluginAPI.loadExternalPlugins();
        
        for (const pluginFile of externalPluginData) {
          try {
            await loadExternalPlugin(pluginFile);
          } catch (err) {
            console.error(`Failed to load external plugin ${pluginFile.filename}:`, err);
          }
        }

        // Set up file watcher for hot-reload
        setupPluginWatcher();
        
        console.log(`📦 Loaded ${externalPluginData.length} external plugins`);
      } catch (err) {
        console.error('Failed to load external plugins:', err);
      }
    })();

    return pluginLoadPromise;
  }

  async function loadExternalPlugin(pluginFile) {
    try {
      // Create a sandboxed environment for the plugin
      const pluginContext = createPluginContext();
      
      // Execute plugin code in sandboxed context
      const pluginFunction = new Function('context', `
        const { window, document, console, CustomHandlerPlugins } = context;
        ${pluginFile.content}
      `);
      
      pluginFunction(pluginContext);
      
      console.log(`✅ Loaded external plugin: ${pluginFile.filename}`);
    } catch (err) {
      console.error(`❌ Failed to execute plugin ${pluginFile.filename}:`, err);
      throw err;
    }
  }

  function createPluginContext() {
    // Create a restricted context for external plugins
    return {
      window: {
        obsAPI: window.obsAPI,
        uiHelpers: window.uiHelpers,
        PluginUtils: window.PluginUtils,
        CustomHandlerPlugins: {
          register: (plugin) => registerPlugin({ ...plugin, isExternal: true })
        }
      },
      document: {
        createElement: document.createElement.bind(document),
        querySelector: document.querySelector.bind(document),
        querySelectorAll: document.querySelectorAll.bind(document),
        getElementById: document.getElementById.bind(document)
      },
      console: {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      },
      CustomHandlerPlugins: {
        register: (plugin) => registerPlugin({ ...plugin, isExternal: true })
      }
    };
  }

  function setupPluginWatcher() {
    if (!window.pluginAPI) return;
    
    window.pluginAPI.watchPluginDirectory((changeData) => {
      console.log(`Plugin ${changeData.action}: ${changeData.file}`);
      
      if (changeData.action === 'changed' || changeData.action === 'added') {
        // Reload the plugin
        setTimeout(() => {
          window.location.reload(); // Simple hot-reload for now
        }, 500);
      } else if (changeData.action === 'removed') {
        // Unregister the plugin
        const pluginName = changeData.file.replace('.js', '');
        unregisterPlugin(pluginName);
      }
    });
  }

  function getAllPlugins() {
    return new Map([...plugins, ...externalPlugins]);
  }

  // Main CustomHandler implementation
  const CustomHandler = {
    name: 'CustomHandler',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      // CustomHandler runs for all sources to check if any plugins can handle them
      const allPlugins = getAllPlugins();
      return Array.from(allPlugins.values()).some(plugin => {
        try {
          return plugin.canHandle(sourceKind, sourceName, context);
        } catch (e) {
          console.warn(`Plugin ${plugin.name} canHandle error:`, e);
          return false;
        }
      });
    },

    async createControls(options, sourceName, displayName, context) {
      // Ensure external plugins are loaded
      await loadExternalPlugins();
      
      const sourceKind = context.inputKindMap?.get(sourceName) || '';
      
      // Get all plugins (built-in + external) sorted by priority
      const allPlugins = getAllPlugins();
      const applicablePlugins = Array.from(allPlugins.values())
        .filter(plugin => {
          try {
            return plugin.canHandle(sourceKind, sourceName, context);
          } catch (e) {
            console.warn(`Plugin ${plugin.name} canHandle error:`, e);
            return false;
          }
        })
        .sort((a, b) => b.priority() - a.priority());

      // Execute plugins in priority order
      for (const plugin of applicablePlugins) {
        try {
          await plugin.execute(options, sourceName, displayName, context);
          const pluginType = plugin.isExternal ? 'external' : 'built-in';
          console.debug(`✅ Plugin ${plugin.name} (${pluginType}) executed for ${sourceName}`);
        } catch (e) {
          console.error(`❌ Plugin ${plugin.name} failed for ${sourceName}:`, e);
        }
      }
    },

    priority() {
      return -100; // Run after all normal handlers (lower priority)
    },

    onRemoteUpdate(sourceName, eventType, data) {
      const sourceKind = data.inputKind || '';
      const allPlugins = getAllPlugins();
      
      allPlugins.forEach(plugin => {
        if (plugin.onRemoteUpdate && plugin.canHandle(sourceKind, sourceName, { inputKindMap: new Map([[sourceName, sourceKind]]) })) {
          try {
            plugin.onRemoteUpdate(sourceName, eventType, data);
          } catch (e) {
            console.warn(`Plugin ${plugin.name} remote update error:`, e);
          }
        }
      });
    },

    cleanup(sourceName) {
      const allPlugins = getAllPlugins();
      allPlugins.forEach(plugin => {
        if (plugin.cleanup) {
          try {
            plugin.cleanup(sourceName);
          } catch (e) {
            console.warn(`Plugin ${plugin.name} cleanup error:`, e);
          }
        }
      });
    }
  };

  // Export plugin system API
  window.CustomHandlerPlugins = {
    register: registerPlugin,
    unregister: unregisterPlugin,
    list: () => Array.from(getAllPlugins().keys()),
    get: (name) => getAllPlugins().get(name),
    
    // For debugging
    _builtInPlugins: plugins,
    _externalPlugins: externalPlugins,
    _allPlugins: getAllPlugins
  };

  // Fire event to notify plugins that CustomHandler is ready
  window.dispatchEvent(new CustomEvent('customHandlerReady'));
  console.log('🔌 CustomHandler plugin system initialized and ready event fired');

  // Auto-register CustomHandler when loaded
  if (window.HandlerRegistry) {
    window.HandlerRegistry.register(CustomHandler);
  } else {
    // Queue for later registration
    window.addEventListener('handlerRegistryReady', () => {
      window.HandlerRegistry.register(CustomHandler);
    });
  }
})();
