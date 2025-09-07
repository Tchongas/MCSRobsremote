# OBS Remote Control - Modular Architecture Guide

This guide explains how to work with the modular UI logic structure and add new functionality to the OBS Remote Control application.

## Architecture Overview

The UI logic has been split into modular components following the same pattern as the `actions/` directory:

```
renderer/
├── logic/
│   ├── ui.js          # UI helpers (logging, badges, indicators)
│   ├── config.js      # Configuration management
│   ├── scenes.js      # Scene management
│   ├── dashboard.js   # Dashboard/scene items management
│   └── index.js       # Main coordinator
└── ui-bindings.js     # DOM event bindings
```

## Module Structure

Each module follows this pattern:

```javascript
// Module description
(function() {
  // Private functions and variables
  function privateFunction() {
    // Implementation
  }

  // Public API
  function publicFunction() {
    // Implementation
  }

  // Export to global namespace
  window.moduleName = {
    publicFunction
  };
})();
```

## Adding New Functionality

### Step 1: Create a New Module

Create a new file in `renderer/logic/` for your functionality. For example, to add microphone controls:

**File: `renderer/logic/microphone.js`**

```javascript
// Microphone source management
(function() {
  // Get microphone sources
  async function getMicrophoneSources() {
    try {
      const sources = await window.obsAPI.sources.list();
      return sources.filter(source => 
        source.typeId === 'wasapi_input_capture' || 
        source.typeId === 'pulse_input_capture'
      );
    } catch (e) {
      window.uiHelpers.log('❌ Error getting microphone sources: ' + e.message);
      return [];
    }
  }

  // Toggle microphone mute
  async function toggleMicrophoneMute(sourceName) {
    try {
      const currentState = await window.obsAPI.sources.getMuted(sourceName);
      await window.obsAPI.sources.setMuted(sourceName, !currentState);
      window.uiHelpers.log(`🎤 ${sourceName} ${!currentState ? 'muted' : 'unmuted'}`);
      return !currentState;
    } catch (e) {
      window.uiHelpers.log('❌ Error toggling microphone: ' + e.message);
      throw e;
    }
  }

  // Set microphone volume
  async function setMicrophoneVolume(sourceName, volume) {
    try {
      await window.obsAPI.sources.setVolume(sourceName, volume);
      window.uiHelpers.log(`🎤 ${sourceName} volume set to ${Math.round(volume * 100)}%`);
    } catch (e) {
      window.uiHelpers.log('❌ Error setting microphone volume: ' + e.message);
      throw e;
    }
  }

  // Export to global namespace
  window.microphoneLogic = {
    getMicrophoneSources,
    toggleMicrophoneMute,
    setMicrophoneVolume
  };
})();
```

### Step 2: Update index.html

Add your new module to the HTML file **before** the `index.js` coordinator:

```html
<!-- Load modular logic files -->
<script src="renderer/logic/ui.js"></script>
<script src="renderer/logic/config.js"></script>
<script src="renderer/logic/scenes.js"></script>
<script src="renderer/logic/dashboard.js"></script>
<script src="renderer/logic/microphone.js"></script>  <!-- Add your module here -->
<script src="renderer/logic/index.js"></script>
<script src="renderer/ui-bindings.js"></script>
```

### Step 3: Update the Coordinator

Modify `renderer/logic/index.js` to include your new module in the unified API:

```javascript
// Wait for all modules to load, then expose unified API
function waitForModules() {
  return new Promise((resolve) => {
    const checkModules = () => {
      if (window.uiHelpers && 
          window.sceneLogic && 
          window.dashboardLogic && 
          window.configLogic && 
          window.microphoneLogic) {  // Add your module here
        resolve();
      } else {
        setTimeout(checkModules, 10);
      }
    };
    checkModules();
  });
}

// Initialize and expose unified API
waitForModules().then(() => {
  window.uiLogic = {
    // ... existing API ...
    
    // Microphone management
    getMicrophoneSources: window.microphoneLogic.getMicrophoneSources,
    toggleMicrophoneMute: window.microphoneLogic.toggleMicrophoneMute,
    setMicrophoneVolume: window.microphoneLogic.setMicrophoneVolume
  };

  // Signal that the unified API is ready
  window.dispatchEvent(new CustomEvent('uiLogicReady'));
});
```

### Step 4: Add UI Elements

Add a container in the Controls panel to host microphone rows (each row will have an expand arrow and options inside):

```html
<!-- Add to the controls section in index.html -->
<div id="micControls" class="panel-section"></div>
```

### Step 5: Add Event Bindings

Update `renderer/ui-bindings.js` to load microphone controls after connecting and to react to remote mute changes. Example (existing code already added):

```javascript
// After successful connect
await refreshScenes();
if (window.uiLogic.loadMicrophoneControls) {
  await window.uiLogic.loadMicrophoneControls();
}

// React to remote mute changes
case 'input-mute-changed':
  if (window.uiLogic.updateMicMuteState) {
    window.uiLogic.updateMicMuteState(data.inputName, data.inputMuted);
  }
  break;
```

## Using the expandable options pattern (arrow)

Controls for specific sources should follow the same UX pattern used by browser sources in `renderer/logic/dashboard.js`:

- A header row with the source name and an arrow button.
- Clicking the arrow (or the name area) toggles an options panel.
- All controls (mute, volume, URLs, parameters, etc.) live inside the options panel.

Minimal pattern you can reuse:

```javascript
// Create header
const itemWrap = document.createElement('div');
itemWrap.className = 'mic-row';
const row = document.createElement('div');
row.className = 'dash-row';
const nameWrap = document.createElement('div');
nameWrap.className = 'name-wrap';
const name = document.createElement('div');
name.className = 'name';
name.textContent = inputName;
nameWrap.appendChild(name);

// Options panel
const options = document.createElement('div');
options.className = 'dash-options';
options.setAttribute('aria-hidden', 'true');

// Expand arrow
const expandBtn = document.createElement('button');
expandBtn.className = 'icon-btn expand-btn';
expandBtn.textContent = '▸';
nameWrap.insertBefore(expandBtn, nameWrap.firstChild);

let expanded = false;
const applyExpanded = () => {
  options.classList.toggle('open', expanded);
  expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  options.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  expandBtn.textContent = expanded ? '▾' : '▸';
};
applyExpanded();
expandBtn.addEventListener('click', () => { expanded = !expanded; applyExpanded(); });
nameWrap.addEventListener('click', (evt) => {
  if (!evt.target.closest('input, button, .dash-options')) {
    expanded = !expanded;
    applyExpanded();
  }
});

// Put your controls inside options
const controlsRow = document.createElement('div');
controlsRow.className = 'dash-option-row';
// ... append buttons, sliders here ...
options.appendChild(controlsRow);

row.appendChild(nameWrap);
itemWrap.appendChild(row);
itemWrap.appendChild(options);
parent.appendChild(itemWrap);
```

## Module Communication

Modules can communicate with each other through:

1. **Shared global namespaces**: `window.uiHelpers`, `window.configLogic`, etc.
2. **Custom events**: Dispatch and listen for custom events
3. **The unified API**: Access other modules through `window.uiLogic`

Example of custom event communication:

```javascript
// In your module
function notifyMicrophoneChanged(sourceName, muted) {
  window.dispatchEvent(new CustomEvent('microphoneChanged', {
    detail: { sourceName, muted }
  }));
}

// In ui-bindings.js or another module
window.addEventListener('microphoneChanged', (event) => {
  const { sourceName, muted } = event.detail;
  log(`🎤 ${sourceName} is now ${muted ? 'muted' : 'unmuted'}`);
});
```

## Best Practices

### 1. Module Naming
- Use descriptive names: `microphone.js`, `streaming.js`, `filters.js`
- Export to consistent global namespace: `window.microphoneLogic`

### 2. Error Handling
- Always wrap async operations in try-catch blocks
- Use `window.uiHelpers.log()` for consistent logging
- Provide meaningful error messages

### 3. Dependencies
- Modules should depend on `window.uiHelpers` for logging
- Use the coordinator pattern for complex dependencies
- Keep modules as independent as possible

### 4. UI Updates
- Use data attributes for efficient element targeting
- Provide visual feedback for user actions
- Handle loading states appropriately

### 5. Real-time Updates
- Listen for OBS WebSocket events in `ui-bindings.js`
- Update UI elements without full page reloads
- Use the existing event system for consistency

## Example: Microphone module using expandable options

Here's a trimmed example showing how to add microphone controls using the expandable arrow pattern:

**File: `renderer/logic/microphone.js`**

```javascript
// Microphone source management with expandable controls
(function() {
  async function loadMicrophoneControls() {
    const container = document.getElementById('micControls');
    if (!container) return;
    container.innerHTML = '';
    const res = await window.obsAPI.sources.get();
    const inputs = res.inputs || [];
    for (const input of inputs) {
      if (!/microphone/i.test(input.inputName)) continue;
      // Build expandable row as shown in the pattern above
      // Include Mute button and Volume slider inside options
    }
  }

  window.microphoneLogic = { loadMicrophoneControls };
})();
```

This modular approach makes it easy to add new features while keeping the code organized and maintainable. Each module has a clear responsibility and can be developed independently.
