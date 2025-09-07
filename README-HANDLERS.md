# Source Handler System

## Overview

The dashboard now uses a modular, plugin-like architecture for source controls. Each source type (browser, microphone, etc.) has its own dedicated handler that registers with the central `HandlerRegistry`.

## Architecture

```
renderer/logic/
├── handlers/
│   ├── HandlerRegistry.js      # Central registry system
│   ├── BrowserSourceHandler.js # Browser source controls
│   └── MicrophoneHandler.js    # Microphone controls
├── dashboard.js                # Main dashboard (now lightweight)
└── sourceTypes.js              # Type detection utilities
```

## Handler Interface

Each handler must implement:

```javascript
const MyHandler = {
  name: 'MyHandler',           // Required: unique identifier
  version: '1.0.0',           // Optional: version string
  
  // Required: determines if this handler applies to a source
  canHandle(sourceKind, sourceName, context) {
    return sourceKind === 'my_source_type';
  },
  
  // Required: creates UI controls for the source
  async createControls(options, sourceName, displayName, context) {
    // Add controls to the options DOM element
  },
  
  // Optional: handler execution priority (higher = first)
  priority() {
    return 5;
  },
  
  // Optional: handle remote updates (e.g., mute state changes)
  onRemoteUpdate(sourceName, eventType, data) {
    // Update UI based on remote changes
  },
  
  // Optional: cleanup when source is removed
  cleanup(sourceName) {
    // Cleanup resources
  }
};
```

## Creating New Handlers

1. **Create handler file**: `renderer/logic/handlers/MySourceHandler.js`

```javascript
(function() {
  const MySourceHandler = {
    name: 'MySourceHandler',
    version: '1.0.0',
    
    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'my_source_type';
    },
    
    async createControls(options, sourceName, displayName, context) {
      const row = document.createElement('div');
      row.className = 'dash-option-row';
      
      const button = document.createElement('button');
      button.textContent = 'My Control';
      button.addEventListener('click', async () => {
        // Handle button click
      });
      
      row.appendChild(button);
      options.appendChild(row);
    }
  };

  // Auto-register when loaded
  if (window.HandlerRegistry) {
    window.HandlerRegistry.register(MySourceHandler);
  } else {
    window.addEventListener('handlerRegistryReady', () => {
      window.HandlerRegistry.register(MySourceHandler);
    });
  }
})();
```

2. **Add to HTML**: Include script in `index.html` after `HandlerRegistry.js`

```html
<script src="renderer/logic/handlers/MySourceHandler.js"></script>
```

## Registry API

```javascript
// Register a handler
window.HandlerRegistry.register(handler);

// Unregister a handler
window.HandlerRegistry.unregister('HandlerName');

// Process source (called by dashboard)
await window.HandlerRegistry.processSource(options, sourceName, displayName, context);

// Handle remote updates
window.HandlerRegistry.handleRemoteUpdate(sourceName, eventType, data);

// Get registered handlers (debugging)
window.HandlerRegistry.getRegisteredHandlers();
```

## Context Object

Handlers receive a context object with:

```javascript
{
  inputKindMap: Map,    // sourceName -> inputKind mapping
  micNameSet: Set       // Set of detected microphone names
}
```

## Benefits

- **Modularity**: Each source type is self-contained
- **Extensibility**: Easy to add new source types
- **Maintainability**: Clear separation of concerns
- **Testability**: Handlers can be tested independently
- **Performance**: Only applicable handlers are executed
- **Priority System**: Control execution order
- **Hot-swappable**: Handlers can be registered/unregistered at runtime

## Examples

See existing handlers:
- `BrowserSourceHandler.js`: URL editing, parameter controls
- `MicrophoneHandler.js`: Mute/unmute, volume control

## Migration Notes

The old monolithic approach in `dashboard.js` has been replaced with this handler system. The dashboard now:

1. Builds context from OBS inputs
2. Calls `HandlerRegistry.processSource()` for each item
3. Handlers determine applicability and create controls
4. Remote updates are forwarded to applicable handlers
