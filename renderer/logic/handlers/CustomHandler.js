// CustomHandler - Extensible plugin system for additional source functionality
(function() {
  const plugins = new Map();
  const externalPlugins = new Map();
  const externalPluginRuntime = new Map();
  let pluginLoadPromise = null;
  let pluginWatcherBound = false;
  let reloadTimer = null;

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

    if (pluginData.isExternal) {
      const runtimeKey = String(pluginData.__runtimePluginKey || pluginData.name || '').trim();
      const runtimeMeta = runtimeKey ? externalPluginRuntime.get(runtimeKey) : null;
      if (runtimeMeta) {
        pluginData.packageId = runtimeMeta.id;
        pluginData.packageFolder = runtimeMeta.folderName;
        pluginData.packageDisplayName = runtimeMeta.displayName;
        pluginData.packageVersion = runtimeMeta.version;
        pluginData.packageDescription = runtimeMeta.description;
        pluginData.packageSummary = runtimeMeta.summary;
        pluginData.packageFiles = runtimeMeta.files;
        pluginData.packageIconDataUrl = runtimeMeta.iconDataUrl;
        pluginData.packageReadme = runtimeMeta.readme;
        pluginData.packageManifest = runtimeMeta.manifest;
        runtimeMeta.registeredName = pluginData.name;
        runtimeMeta.status = 'loaded';
      }
    }

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
        externalPluginRuntime.clear();
        
        for (const pluginFile of externalPluginData) {
          try {
            externalPluginRuntime.set(pluginFile.id || pluginFile.folderName || pluginFile.filename, {
              ...pluginFile,
              status: 'loading',
              registeredName: ''
            });
            await loadExternalPlugin(pluginFile);
          } catch (err) {
            const runtimeKey = pluginFile.id || pluginFile.folderName || pluginFile.filename;
            const runtimeMeta = externalPluginRuntime.get(runtimeKey);
            if (runtimeMeta) {
              runtimeMeta.status = 'error';
              runtimeMeta.error = err?.message || String(err);
            }
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
      const pluginContext = createPluginContext(pluginFile);
      
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

  function createScopedPluginApi(pluginFile) {
    const packageId = String(pluginFile?.id || pluginFile?.folderName || '').trim();
    return {
      ...window.pluginAPI,
      readFile: async (relativeFile) => {
        const file = String(relativeFile || '').trim();
        if (!file) throw new Error('Missing plugin file path');
        if (packageId && window.pluginAPI?.readPackageFile) {
          return await window.pluginAPI.readPackageFile(packageId, file);
        }
        if (window.pluginAPI?.readFile) {
          return await window.pluginAPI.readFile(file);
        }
        throw new Error('Plugin file API not available');
      },
      readConfig: async () => {
        const configFile = pluginFile?.configFile || '';
        if (!configFile) throw new Error('No config.yaml in this plugin package');
        if (packageId && window.pluginAPI?.readPackageFile) {
          return await window.pluginAPI.readPackageFile(packageId, configFile);
        }
        throw new Error('Plugin file API not available');
      },
      getPluginPackage: () => ({
        id: pluginFile?.id || '',
        folderName: pluginFile?.folderName || '',
        displayName: pluginFile?.displayName || pluginFile?.folderName || '',
        version: pluginFile?.version || '1.0.0',
        description: pluginFile?.description || '',
        files: Array.isArray(pluginFile?.files) ? [...pluginFile.files] : [],
        iconFile: pluginFile?.iconFile || '',
        iconDataUrl: pluginFile?.iconDataUrl || '',
        readmeFile: pluginFile?.readmeFile || '',
        configFile: pluginFile?.configFile || '',
        entryRelativePath: pluginFile?.entryRelativePath || ''
      })
    };
  }

  function createPluginContext(pluginFile) {
    // Create a restricted context for external plugins
    const runtimeKey = String(pluginFile?.id || pluginFile?.folderName || pluginFile?.filename || '').trim();
    const scopedPluginApi = createScopedPluginApi(pluginFile);

    // Create the sandbox window object
    const sandboxWindow = {
      obsAPI: window.obsAPI,
      pluginAPI: scopedPluginApi,
      uiHelpers: window.uiHelpers,
      PluginUtils: window.PluginUtils,
      PluginCreateUtils: window.PluginCreateUtils,
      CustomHandlerPlugins: {
        register: (plugin) => registerPlugin({ ...plugin, isExternal: true, __runtimePluginKey: runtimeKey })
      }
    };

    // Register this sandbox so PluginUtils.loadPluginScript can use it
    if (window.PluginUtils?.registerPluginSandbox) {
      window.PluginUtils.registerPluginSandbox(runtimeKey, sandboxWindow);
    }

    return {
      window: sandboxWindow,
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
        register: (plugin) => registerPlugin({ ...plugin, isExternal: true, __runtimePluginKey: runtimeKey })
      }
    };
  }

  function setupPluginWatcher() {
    if (!window.pluginAPI) return;

    if (pluginWatcherBound) return;
    pluginWatcherBound = true;
    
    window.pluginAPI.watchPluginDirectory((changeData) => {
      console.log(`Plugin ${changeData.action}: ${changeData.file}`);

      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
      reloadTimer = setTimeout(() => {
        window.location.reload();
      }, 400);
      
    });
  }

  function getAllPlugins() {
    return new Map([...plugins, ...externalPlugins]);
  }

  function listExternalPluginRuntime() {
    return Array.from(externalPluginRuntime.values()).map((item) => ({
      id: item.id,
      folderName: item.folderName,
      displayName: item.displayName,
      version: item.version,
      description: item.description,
      summary: item.summary,
      files: Array.isArray(item.files) ? [...item.files] : [],
      iconFile: item.iconFile,
      iconDataUrl: item.iconDataUrl,
      readmeFile: item.readmeFile,
      readme: item.readme,
      manifest: item.manifest,
      filename: item.filename,
      entryRelativePath: item.entryRelativePath,
      status: item.status || 'idle',
      registeredName: item.registeredName || '',
      error: item.error || ''
    }));
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
            // Only call cleanup on plugins that actually handle this source.
            // Plugins that return false from canHandle (e.g. sidebar-only plugins)
            // should not have their cleanup called for arbitrary source names.
            const handles = plugin.canHandle
              ? plugin.canHandle('', sourceName, { inputKindMap: new Map() })
              : true;
            if (handles) {
              plugin.cleanup(sourceName);
            }
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
    listExternalRuntime: listExternalPluginRuntime,
    
    // For debugging
    _builtInPlugins: plugins,
    _externalPlugins: externalPlugins,
    _allPlugins: getAllPlugins,
    _externalRuntime: externalPluginRuntime
  };

  // Fire event to notify plugins that CustomHandler is ready
  window.dispatchEvent(new CustomEvent('customHandlerReady'));
  console.log('🔌 CustomHandler plugin system initialized and ready event fired');

  // Load external plugins as early as possible so they can register sidebar buttons
  // without waiting for any dashboard item to render.
  setTimeout(() => {
    loadExternalPlugins().catch((err) => {
      console.error('Failed to preload external plugins:', err);
    });
  }, 0);

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
