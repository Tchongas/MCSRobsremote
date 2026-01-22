// Resize functionality for sidebars and console
(function() {
  let isResizing = false;
  let currentHandle = null;
  let startX = 0;
  let startY = 0;
  let startWidth = 0;
  let startHeight = 0;

  const MIN_SIDEBAR = 160;
  const MAX_SIDEBAR = 320;
  const MIN_CONSOLE = 50;
  const MAX_CONSOLE = 250;

  function updateHandlePositions() {
    const leftSidebar = document.getElementById('sidebarLeft');
    const rightSidebar = document.getElementById('sidebarRight');
    const leftHandle = document.querySelector('.resize-handle-left');
    const rightHandle = document.querySelector('.resize-handle-right');

    if (leftSidebar && leftHandle) {
      leftHandle.style.left = leftSidebar.offsetWidth + 'px';
    }
    if (rightSidebar && rightHandle) {
      rightHandle.style.right = rightSidebar.offsetWidth + 'px';
    }
  }

  function initResize() {
    const handles = document.querySelectorAll('.resize-handle');
    const app = document.querySelector('.app');

    // Initial positioning
    updateHandlePositions();

    handles.forEach(handle => {
      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isResizing = true;
        currentHandle = handle;
        startX = e.clientX;
        startY = e.clientY;

        const resizeType = handle.dataset.resize;

        if (resizeType === 'left') {
          const sidebar = document.getElementById('sidebarLeft');
          startWidth = sidebar ? sidebar.offsetWidth : 200;
          app.classList.add('resizing');
        } else if (resizeType === 'right') {
          const sidebar = document.getElementById('sidebarRight');
          startWidth = sidebar ? sidebar.offsetWidth : 200;
          app.classList.add('resizing');
        } else if (resizeType === 'console') {
          const consoleEl = document.getElementById('consoleArea');
          startHeight = consoleEl ? consoleEl.offsetHeight : 90;
          app.classList.add('resizing-console');
        }

        handle.classList.add('active');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });

    // Update handle positions on window resize
    window.addEventListener('resize', updateHandlePositions);
  }

  function onMouseMove(e) {
    if (!isResizing || !currentHandle) return;

    const resizeType = currentHandle.dataset.resize;
    const mainLayout = document.querySelector('.main-layout');
    const app = document.querySelector('.app');

    if (resizeType === 'left') {
      const delta = e.clientX - startX;
      let newWidth = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, startWidth + delta));
      
      if (mainLayout) {
        const rightSidebar = document.getElementById('sidebarRight');
        const rightWidth = rightSidebar ? rightSidebar.offsetWidth : 200;
        mainLayout.style.gridTemplateColumns = `${newWidth}px 1fr ${rightWidth}px`;
        // Update handle position
        currentHandle.style.left = newWidth + 'px';
      }
    } else if (resizeType === 'right') {
      const delta = startX - e.clientX;
      let newWidth = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, startWidth + delta));
      
      if (mainLayout) {
        const leftSidebar = document.getElementById('sidebarLeft');
        const leftWidth = leftSidebar ? leftSidebar.offsetWidth : 200;
        mainLayout.style.gridTemplateColumns = `${leftWidth}px 1fr ${newWidth}px`;
        // Update handle position
        currentHandle.style.right = newWidth + 'px';
      }
    } else if (resizeType === 'console') {
      const delta = startY - e.clientY;
      let newHeight = Math.max(MIN_CONSOLE, Math.min(MAX_CONSOLE, startHeight + delta));
      
      const consoleEl = document.getElementById('consoleArea');
      if (consoleEl) {
        consoleEl.style.height = newHeight + 'px';
      }
    }
  }

  function onMouseUp() {
    if (!isResizing) return;

    isResizing = false;
    const app = document.querySelector('.app');
    app.classList.remove('resizing', 'resizing-console');
    
    if (currentHandle) {
      currentHandle.classList.remove('active');
    }
    currentHandle = null;

    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);

    // Update handle positions after resize
    updateHandlePositions();
    
    // Save sizes to localStorage
    saveSizes();
  }

  function saveSizes() {
    const leftSidebar = document.getElementById('sidebarLeft');
    const rightSidebar = document.getElementById('sidebarRight');
    const consoleArea = document.getElementById('consoleArea');

    const sizes = {
      leftWidth: leftSidebar ? leftSidebar.offsetWidth : 200,
      rightWidth: rightSidebar ? rightSidebar.offsetWidth : 200,
      consoleHeight: consoleArea ? consoleArea.offsetHeight : 90
    };

    try {
      localStorage.setItem('robs-panel-sizes', JSON.stringify(sizes));
    } catch (e) {
      // Ignore storage errors
    }
  }

  function loadSizes() {
    try {
      const saved = localStorage.getItem('robs-panel-sizes');
      if (!saved) return;

      const sizes = JSON.parse(saved);
      const mainLayout = document.querySelector('.main-layout');
      const app = document.querySelector('.app');

      if (mainLayout && sizes.leftWidth && sizes.rightWidth) {
        mainLayout.style.gridTemplateColumns = `${sizes.leftWidth}px 1fr ${sizes.rightWidth}px`;
      }

      if (sizes.consoleHeight) {
        const consoleEl = document.getElementById('consoleArea');
        if (consoleEl) {
          consoleEl.style.height = sizes.consoleHeight + 'px';
        }
      }

      // Update handle positions after loading sizes
      setTimeout(updateHandlePositions, 0);
    } catch (e) {
      // Ignore errors
    }
  }

  // Clear old saved sizes if they have outdated structure
  function clearOldSizes() {
    try {
      const saved = localStorage.getItem('robs-panel-sizes');
      if (saved) {
        const sizes = JSON.parse(saved);
        // If console height is too big (from old version), reset
        if (sizes.consoleHeight && sizes.consoleHeight > MAX_CONSOLE) {
          localStorage.removeItem('robs-panel-sizes');
        }
      }
    } catch (e) {
      localStorage.removeItem('robs-panel-sizes');
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      clearOldSizes();
      initResize();
      loadSizes();
    });
  } else {
    clearOldSizes();
    initResize();
    loadSizes();
  }

  // Export for external use
  window.resizeLogic = {
    saveSizes,
    loadSizes,
    updateHandlePositions
  };
})();
