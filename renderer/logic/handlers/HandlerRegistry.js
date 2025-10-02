// Source Handler Registry - Plugin-like architecture for dashboard source controls
(function() {
  const handlers = new Map();
  const eventHandlers = new Map();

  // Handler interface specification
  const HandlerInterface = {
    // Required methods
    canHandle: (sourceKind, sourceName, context) => false,
    createControls: async (options, sourceName, displayName, context) => {},
    
    // Optional methods
    priority: () => 0, // Higher priority handlers run first
    onRemoteUpdate: (sourceName, eventType, data) => {},
    cleanup: (sourceName) => {},
    
    // Metadata
    name: 'UnknownHandler',
    version: '1.0.0'
  };

  function registerHandler(handler) {
    if (!handler.name) {
      console.warn('Handler registration failed: missing name');
      return false;
    }
    
    if (!handler.canHandle || typeof handler.canHandle !== 'function') {
      console.warn(`Handler ${handler.name}: missing canHandle method`);
      return false;
    }
    
    if (!handler.createControls || typeof handler.createControls !== 'function') {
      console.warn(`Handler ${handler.name}: missing createControls method`);
      return false;
    }

    handlers.set(handler.name, {
      ...HandlerInterface,
      ...handler,
      priority: handler.priority || (() => 0)
    });

    console.log(`📦 Registered source handler: ${handler.name} v${handler.version || '1.0.0'}`);
    return true;
  }

  function unregisterHandler(name) {
    const removed = handlers.delete(name);
    if (removed) {
      console.log(`🗑️ Unregistered handler: ${name}`);
    }
    return removed;
  }

  async function processSource(options, sourceName, displayName, context) {
    const sourceKind = context.inputKindMap?.get(sourceName) || '';
    let hasOptions = false;

    // Get applicable handlers sorted by priority (highest first)
    const applicableHandlers = Array.from(handlers.values())
      .filter(handler => {
        try {
          return handler.canHandle(sourceKind, sourceName, context);
        } catch (e) {
          console.warn(`Handler ${handler.name} canHandle error:`, e);
          return false;
        }
      })
      .sort((a, b) => b.priority() - a.priority());

    // Execute handlers in priority order
    for (const handler of applicableHandlers) {
      try {
        await handler.createControls(options, sourceName, displayName, context);
        hasOptions = true;
        console.debug(`✅ Handler ${handler.name} processed ${sourceName}`);
      } catch (e) {
        console.error(`❌ Handler ${handler.name} failed for ${sourceName}:`, e);
      }
    }

    return hasOptions;
  }

  function handleRemoteUpdate(sourceName, eventType, data) {
    // Broadcast to all handlers; let each handler decide if it cares
    handlers.forEach(handler => {
      if (handler.onRemoteUpdate) {
        try {
          handler.onRemoteUpdate(sourceName, eventType, data);
        } catch (e) {
          console.warn(`Handler ${handler.name} remote update error:`, e);
        }
      }
    });
  }

  function getRegisteredHandlers() {
    return Array.from(handlers.entries()).map(([name, handler]) => ({
      name,
      version: handler.version,
      priority: handler.priority()
    }));
  }

  function cleanup(sourceName) {
    handlers.forEach(handler => {
      if (handler.cleanup) {
        try {
          handler.cleanup(sourceName);
        } catch (e) {
          console.warn(`Handler ${handler.name} cleanup error:`, e);
        }
      }
    });
  }

  // Export registry API
  window.HandlerRegistry = {
    register: registerHandler,
    unregister: unregisterHandler,
    processSource,
    handleRemoteUpdate,
    getRegisteredHandlers,
    cleanup,
    
    // For debugging
    _handlers: handlers
  };

  console.log('🏗️ Handler Registry initialized');
})();
