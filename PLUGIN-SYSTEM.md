# OBS Remote Plugin System Documentation

## Overview

The OBS Remote app features a powerful plugin system that allows users to extend functionality by creating custom source handlers. The system supports both built-in plugins (hardcoded in the app) and external plugins (user-provided JavaScript files).

## 🏗️ Architecture

### Plugin Types

1. **Built-in Plugins**: Compiled into the app, located in `renderer/logic/handlers/plugins/`
2. **External Plugins**: User-provided `.js` files in the `plugins/` folder next to the app executable

### Directory Structure

```
app-directory/
├── MCSRobsremote.exe          # Main application
└── plugins/                   # External plugins folder
    ├── MyCustomPlugin.js      # User plugin
    ├── TwitchEnhancer.js      # User plugin
    └── ExamplePlugin.js       # Template plugin
```

## 📋 Plugin Interface

### Required Properties

```javascript
const MyPlugin = {
  name: 'MyPlugin',                    // Unique plugin identifier
  version: '1.0.0',                   // Plugin version
  canHandle: function(sourceKind, sourceName, context) {
    // Return true if this plugin should handle the source
    return sourceKind === 'browser_source';
  },
  enhance: async function(options, sourceName, displayName, context) {
    // Add custom UI elements and functionality
    // options: DOM element to append controls to
    // sourceName: Internal OBS source name
    // displayName: User-friendly display name
    // context: Additional data (settings, etc.)
  }
};
```

### Optional Properties

```javascript
const MyPlugin = {
  // ... required properties ...
  
  priority: function() {
    return 10; // Higher numbers run first (default: 0)
  },
  
  cleanup: function(sourceName) {
    // Clean up when source is removed
    const elements = document.querySelectorAll(`[data-source="${sourceName}"]`);
    elements.forEach(el => el.remove());
  },
  
  onRemoteUpdate: function(sourceName, eventType, data) {
    // Handle real-time updates from OBS
    if (eventType === 'input-name-changed') {
      console.log(`Source renamed: ${data.newName}`);
    }
  }
};
```

## 🔌 Plugin Registration

### Built-in Plugins

```javascript
// In renderer/logic/handlers/plugins/MyPlugin.js
(function() {
  const MyPlugin = {
    // ... plugin definition ...
  };

  // Auto-register when loaded
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(MyPlugin);
  } else {
    window.addEventListener('customHandlerReady', () => {
      window.CustomHandlerPlugins.register(MyPlugin);
    });
  }
})();
```

### External Plugins

```javascript
// In plugins/MyPlugin.js
(function() {
  const MyPlugin = {
    // ... plugin definition ...
  };

  // Register with the system
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(MyPlugin);
  } else {
    console.warn('CustomHandlerPlugins not available');
  }
})();
```

## 🛠️ Available APIs

### OBS API Access

```javascript
// Access OBS WebSocket functions
await window.obsAPI.sources.setSettings(sourceName, { url: 'https://example.com' });
await window.obsAPI.browser.refreshNoCache(sourceName);
await window.obsAPI.scenes.change('Scene 1');
```

### UI Helper Functions

```javascript
// Log messages to console
window.uiHelpers?.log('✅ Plugin action completed');
window.uiHelpers?.log('❌ Plugin error occurred');
```

### DOM Manipulation

```javascript
// Create and manipulate DOM elements
const button = document.createElement('button');
button.textContent = 'Custom Action';
button.addEventListener('click', handleClick);
options.appendChild(button);
```

## 📚 Examples

### Example 1: Simple Button Plugin

```javascript
(function() {
  const SimpleButtonPlugin = {
    name: 'SimpleButtonPlugin',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      // Handle all browser sources
      return sourceKind === 'browser_source';
    },

    async enhance(options, sourceName, displayName, context) {
      // Create a simple button
      const button = document.createElement('button');
      button.textContent = '🔄 Refresh Source';
      button.className = 'btn-accent';
      button.style.marginTop = '8px';
      
      button.addEventListener('click', async () => {
        try {
          await window.obsAPI.browser.refreshNoCache(sourceName);
          window.uiHelpers?.log(`🔄 Refreshed ${displayName}`);
        } catch (err) {
          window.uiHelpers?.log(`❌ Failed to refresh: ${err.message}`);
        }
      });
      
      options.appendChild(button);
    },

    priority() {
      return 5; // Medium priority
    }
  };

  // Register the plugin
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(SimpleButtonPlugin);
  }
})();
```

### Example 2: YouTube URL Detector

```javascript
(function() {
  const YouTubePlugin = {
    name: 'YouTubePlugin',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      if (sourceKind !== 'browser_source') return false;
      
      // Check if URL contains YouTube
      const settings = context.sourceSettings?.get(sourceName);
      return settings?.url?.includes('youtube.com') || settings?.url?.includes('youtu.be');
    },

    async enhance(options, sourceName, displayName, context) {
      // Create YouTube-themed section
      const section = document.createElement('div');
      section.style.cssText = `
        margin-top: 12px;
        padding: 10px;
        background: linear-gradient(135deg, #ff0000 0%, #cc0000 100%);
        border-radius: 8px;
        color: white;
      `;
      
      // Add YouTube branding
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span style="font-size: 14px;">📺</span>
          <span style="font-weight: 600; font-size: 12px;">YOUTUBE SOURCE</span>
        </div>
      `;
      
      // Extract video ID if possible
      const settings = context.sourceSettings?.get(sourceName);
      if (settings?.url) {
        const videoIdMatch = settings.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
        if (videoIdMatch) {
          const videoId = videoIdMatch[1];
          const info = document.createElement('div');
          info.style.cssText = `
            background: rgba(0, 0, 0, 0.3);
            padding: 6px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-bottom: 8px;
          `;
          info.innerHTML = `<strong>Video ID:</strong> ${videoId}`;
          header.appendChild(info);
        }
      }
      
      // Add control buttons
      const controls = document.createElement('div');
      controls.style.display = 'flex';
      controls.style.gap = '8px';
      
      const refreshBtn = document.createElement('button');
      refreshBtn.textContent = '🔄 Refresh Video';
      refreshBtn.style.cssText = `
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
      `;
      
      refreshBtn.addEventListener('click', async () => {
        try {
          await window.obsAPI.browser.refreshNoCache(sourceName);
          window.uiHelpers?.log(`📺 Refreshed YouTube source: ${displayName}`);
        } catch (err) {
          window.uiHelpers?.log(`❌ Failed to refresh YouTube source: ${err.message}`);
        }
      });
      
      controls.appendChild(refreshBtn);
      
      section.appendChild(header);
      section.appendChild(controls);
      options.appendChild(section);
    },

    priority() {
      return 15; // High priority for visual enhancement
    }
  };

  // Register the plugin
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(YouTubePlugin);
  }
})();
```

### Example 3: Advanced Media Source Controller

```javascript
(function() {
  const MediaControllerPlugin = {
    name: 'MediaControllerPlugin',
    version: '1.0.0',

    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'media_source';
    },

    async enhance(options, sourceName, displayName, context) {
      // Create media control panel
      const panel = document.createElement('div');
      panel.className = 'media-controller-panel';
      panel.style.cssText = `
        margin-top: 12px;
        padding: 12px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        color: white;
      `;
      
      // Header
      const header = document.createElement('div');
      header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px;">
          <span style="font-size: 14px;">🎵</span>
          <span style="font-weight: 600; font-size: 12px;">MEDIA CONTROLS</span>
        </div>
      `;
      
      // Control buttons container
      const controls = document.createElement('div');
      controls.style.cssText = `
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      `;
      
      // Create control buttons
      const buttons = [
        { text: '⏯️ Toggle', action: 'toggle' },
        { text: '⏹️ Stop', action: 'stop' },
        { text: '⏮️ Restart', action: 'restart' },
        { text: '🔄 Refresh', action: 'refresh' }
      ];
      
      buttons.forEach(({ text, action }) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.style.cssText = `
          background: rgba(255, 255, 255, 0.15);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11px;
          transition: all 0.2s ease;
        `;
        
        btn.addEventListener('mouseenter', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.25)';
        });
        
        btn.addEventListener('mouseleave', () => {
          btn.style.background = 'rgba(255, 255, 255, 0.15)';
        });
        
        btn.addEventListener('click', async () => {
          try {
            switch (action) {
              case 'toggle':
                // Toggle media playback (would need custom OBS request)
                window.uiHelpers?.log(`⏯️ Toggled ${displayName}`);
                break;
              case 'stop':
                // Stop media playback
                window.uiHelpers?.log(`⏹️ Stopped ${displayName}`);
                break;
              case 'restart':
                // Restart media from beginning
                window.uiHelpers?.log(`⏮️ Restarted ${displayName}`);
                break;
              case 'refresh':
                // Refresh the source
                await window.obsAPI.browser.refreshNoCache(sourceName);
                window.uiHelpers?.log(`🔄 Refreshed ${displayName}`);
                break;
            }
          } catch (err) {
            window.uiHelpers?.log(`❌ Media control failed: ${err.message}`);
          }
        });
        
        controls.appendChild(btn);
      });
      
      panel.appendChild(header);
      panel.appendChild(controls);
      options.appendChild(panel);
    },

    priority() {
      return 10;
    },

    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-name-changed') {
        // Update any UI elements that display the source name
        console.log(`Media source ${sourceName} renamed to ${data.newName}`);
      }
    },

    cleanup(sourceName) {
      // Remove any persistent UI elements
      const panels = document.querySelectorAll(`[data-media-source="${sourceName}"]`);
      panels.forEach(panel => panel.remove());
    }
  };

  // Register the plugin
  if (window.CustomHandlerPlugins) {
    window.CustomHandlerPlugins.register(MediaControllerPlugin);
  }
})();
```

## 🔧 Plugin Management API

### Registration Functions

```javascript
// Register a plugin
window.CustomHandlerPlugins.register(myPlugin);

// Unregister a plugin
window.CustomHandlerPlugins.unregister('PluginName');

// Get all registered plugins
const plugins = window.CustomHandlerPlugins.getRegisteredPlugins();
console.log(plugins); // Array of plugin info objects
```

### Debugging Functions

```javascript
// Get built-in plugins
const builtIn = window.CustomHandlerPlugins._builtInPlugins;

// Get external plugins
const external = window.CustomHandlerPlugins._externalPlugins;

// Get all plugins combined
const all = window.CustomHandlerPlugins._allPlugins();

// Get plugin directory path
const pluginDir = window.CustomHandlerPlugins.getPluginDirectory();
```

## 🚀 Installation & Usage

### For End Users

1. **Create Plugin File**: Write your plugin in a `.js` file
2. **Place in Plugins Folder**: Put the file in the `plugins/` folder next to the app executable
3. **Restart App**: The plugin will be automatically discovered and loaded
4. **Hot Reload**: Edit the plugin file and the app will automatically reload

### For Developers

1. **Built-in Plugins**: Place in `renderer/logic/handlers/plugins/` and include in `index.html`
2. **External Plugins**: Use the external plugin system for user-installable plugins

## 🔒 Security & Sandboxing

External plugins run in a restricted environment with limited API access:

- **Allowed**: OBS API, UI helpers, DOM manipulation (restricted)
- **Blocked**: File system access, network requests, system APIs
- **Error Isolation**: Plugin failures don't crash the app

## 🐛 Debugging

### Console Logging

```javascript
// Plugin registration messages
🔌 Registered built-in plugin: TwitchPlugin v1.0.0
🔌 Registered external plugin: MyPlugin v1.0.0

// Plugin execution messages
✅ Plugin MyPlugin (external) enhanced SourceName
❌ Plugin MyPlugin failed for SourceName: Error message
```

### Debug Commands

```javascript
// List all plugins
window.CustomHandlerPlugins.getRegisteredPlugins();

// Check plugin directory
window.CustomHandlerPlugins.getPluginDirectory();

// Force reload external plugins
window.CustomHandlerPlugins.loadExternalPlugins();
```

## 📝 Best Practices

1. **Use Unique Names**: Ensure plugin names are unique to avoid conflicts
2. **Error Handling**: Wrap async operations in try-catch blocks
3. **Clean Styling**: Use consistent CSS styling with the app theme
4. **Performance**: Avoid heavy operations in `canHandle()` method
5. **Memory Management**: Clean up event listeners and DOM elements in `cleanup()`
6. **User Feedback**: Use `window.uiHelpers.log()` to provide user feedback

## 🔄 Hot Reload

The system automatically watches the `plugins/` folder for changes:

- **File Added**: Plugin is loaded automatically
- **File Modified**: App reloads to apply changes
- **File Deleted**: Plugin is unregistered

## 📋 Source Types Reference

Common OBS source types you can handle:

- `browser_source` - Browser sources (web pages, overlays)
- `media_source` - Video/audio files
- `text_gdiplus_v3` - Text sources
- `image_source` - Image files
- `window_capture` - Window capture
- `display_capture` - Display capture
- `game_capture` - Game capture
- `dshow_input` - Camera/microphone inputs

## 🎯 Plugin Ideas

- **Stream Deck Integration**: Control StreamDeck buttons
- **Chat Integration**: Twitch/YouTube chat overlays
- **Social Media**: Twitter/Discord notifications
- **Analytics**: Stream statistics and metrics
- **Custom Overlays**: Specialized overlay controls
- **Hardware Integration**: Control external devices
- **File Management**: Batch operations on media files
