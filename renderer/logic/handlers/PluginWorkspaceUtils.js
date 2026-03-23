// PluginWorkspaceUtils - modal/popup workspace helpers for plugins
(function() {
  let activePluginModal = null;
  let pluginModalBindingsReady = false;
  let popupRpcBindingsReady = false;
  const popupRpcHandlersByPlugin = new Map();

  const getPluginModalEls = () => {
    const modal = document.getElementById('pluginModal');
    const titleEl = document.getElementById('pluginModalTitle');
    const mount = document.getElementById('pluginModalMount');
    const closeBtn = document.getElementById('closePluginModal');
    const popoutBtn = document.getElementById('popoutPluginModal');
    return { modal, titleEl, mount, closeBtn, popoutBtn };
  };

  const closeActivePluginModal = () => {
    const { modal, mount, popoutBtn } = getPluginModalEls();
    if (!modal || !mount) return;

    const active = activePluginModal;
    activePluginModal = null;

    if (active?.cleanup && typeof active.cleanup === 'function') {
      try {
        active.cleanup();
      } catch (e) {
        window.uiHelpers?.logWarn(`Plugin modal cleanup failed: ${e?.message || e}`, 'plugin');
      }
    }

    mount.innerHTML = '';
    mount.className = 'plugin-modal-mount';
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');

    if (popoutBtn) {
      popoutBtn.style.display = '';
      popoutBtn.onclick = null;
    }
  };

  const ensurePluginModalBindings = () => {
    if (pluginModalBindingsReady) return;
    const { modal, closeBtn } = getPluginModalEls();
    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeActivePluginModal);
    }

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeActivePluginModal();
      }
    });

    pluginModalBindingsReady = true;
  };

  const ensurePopupRpcBindings = () => {
    if (popupRpcBindingsReady) return;
    if (!window.pluginAPI?.onPopupRpcRequest || !window.pluginAPI?.respondPopupRpc) return;

    window.pluginAPI.onPopupRpcRequest(async (request) => {
      const requestId = String(request?.requestId || '').trim();
      const pluginName = String(request?.pluginName || '').trim();
      const method = String(request?.method || '').trim();
      const args = Array.isArray(request?.args) ? request.args : [];

      if (!requestId || !pluginName || !method) {
        return;
      }

      const handlers = popupRpcHandlersByPlugin.get(pluginName);
      const fn = handlers && handlers[method];
      if (typeof fn !== 'function') {
        window.pluginAPI.respondPopupRpc(requestId, {
          ok: false,
          error: `No popup RPC handler for ${pluginName}.${method}`
        });
        return;
      }

      try {
        const result = await fn(...args, request);
        window.pluginAPI.respondPopupRpc(requestId, { ok: true, result });
      } catch (err) {
        window.pluginAPI.respondPopupRpc(requestId, {
          ok: false,
          error: err?.message || String(err)
        });
      }
    });

    popupRpcBindingsReady = true;
  };

  const registerPopupRpcHandlers = (pluginName, handlers = {}) => {
    const p = String(pluginName || '').trim() || 'unknown';
    popupRpcHandlersByPlugin.set(p, handlers || {});
    ensurePopupRpcBindings();
  };

  const unregisterPopupRpcHandlers = (pluginName) => {
    const p = String(pluginName || '').trim() || 'unknown';
    popupRpcHandlersByPlugin.delete(p);
  };

  const createPopupHtml = (pluginName, options = {}) => {
    const p = String(pluginName || '').trim() || 'unknown';
    const bodyHtml = String(options.bodyHtml || '<div id="pluginPopupRoot"></div>');
    const script = String(options.script || '').trim();
    const pluginNameJson = JSON.stringify(p);

    return `
      <section class="plugin-window-shell" style="height: calc(100vh - 28px); box-sizing: border-box; padding: 0; overflow: hidden;">
        ${bodyHtml}
      </section>
      <script>
        (async function() {
          const pluginName = ${pluginNameJson};
          try {
            if (!window.pluginPopupAPI) {
              throw new Error('pluginPopupAPI is not available in this window');
            }

            const context = await window.pluginPopupAPI.getContext();
            const popupHost = {
              context,
              pluginName,
              call(method, ...args) {
                return window.pluginPopupAPI.callHost(method, ...args);
              }
            };

            window.pluginPopupHost = popupHost;
            ${script}
          } catch (err) {
            var host = document.body || document.documentElement;
            var box = document.createElement('pre');
            box.style.margin = '12px';
            box.style.padding = '12px';
            box.style.border = '1px solid #8b2f2f';
            box.style.borderRadius = '8px';
            box.style.background = 'rgba(139,47,47,0.15)';
            box.style.color = '#fecaca';
            box.style.whiteSpace = 'pre-wrap';
            box.textContent = '[Plugin Popup Init Error] ' + (err && err.message ? err.message : String(err));
            if (host) host.appendChild(box);
          }
        })();
      </script>
    `;
  };

  const openPluginPopup = async (pluginName, options = {}) => {
    const p = String(pluginName || '').trim() || 'unknown';
    if (!window.pluginAPI?.openPopup) {
      throw new Error('Plugin popup API is not available');
    }

    const payload = {
      pluginName: p,
      title: options.title || p,
      width: Number(options.width) || 920,
      height: Number(options.height) || 640,
      html: typeof options.html === 'string' ? options.html : ''
    };

    return await window.pluginAPI.openPopup(payload);
  };

  const openPluginModal = (pluginName, options = {}) => {
    const p = String(pluginName || '').trim() || 'unknown';
    const { modal, titleEl, mount, popoutBtn } = getPluginModalEls();
    if (!modal || !titleEl || !mount) {
      throw new Error('Plugin modal host is not available');
    }

    ensurePluginModalBindings();
    closeActivePluginModal();

    const title = String(options.title || p).trim() || p;
    titleEl.textContent = title;

    mount.innerHTML = '';
    mount.className = 'plugin-modal-mount';
    if (options.className) {
      mount.classList.add(String(options.className));
    }

    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');

    const cleanup = typeof options.onClose === 'function' ? options.onClose : null;
    activePluginModal = { pluginName: p, cleanup };

    if (popoutBtn) {
      if (options.disablePopout) {
        popoutBtn.style.display = 'none';
        popoutBtn.onclick = null;
      } else {
        popoutBtn.style.display = '';
        popoutBtn.onclick = async () => {
          try {
            await openPluginPopup(p, {
              title,
              width: options.popupWidth,
              height: options.popupHeight,
              html: options.popupHtml || ''
            });
          } catch (e) {
            window.uiHelpers?.logError(`Failed to open popup: ${e?.message || e}`, 'plugin');
          }
        };
      }
    }

    return {
      mount,
      close: closeActivePluginModal,
      pluginName: p
    };
  };

  const closePluginModal = () => {
    closeActivePluginModal();
  };

  const registerModalSidebarButton = (pluginName, id, label, onRender, options = {}) => {
    const p = String(pluginName || '').trim() || 'unknown';

    if (!window.PluginUtils?.registerSidebarButton) {
      throw new Error('PluginUtils.registerSidebarButton is not available');
    }

    const callback = async () => {
      const modal = openPluginModal(p, {
        title: options.title || label,
        className: options.className,
        onClose: options.onClose,
        disablePopout: options.disablePopout,
        popupWidth: options.popupWidth,
        popupHeight: options.popupHeight,
        popupHtml: options.popupHtml
      });

      if (typeof onRender === 'function') {
        await onRender({
          mount: modal.mount,
          close: modal.close,
          pluginName: p
        });
      }
    };

    return window.PluginUtils.registerSidebarButton(
      p,
      id,
      label,
      callback,
      options.buttonClassName
    );
  };

  const workspaceApi = {
    openPluginModal,
    closePluginModal,
    registerModalSidebarButton,
    openPluginPopup,
    registerPopupRpcHandlers,
    unregisterPopupRpcHandlers,
    createPopupHtml
  };

  window.PluginWorkspaceUtils = workspaceApi;
  if (window.PluginUtils) {
    Object.assign(window.PluginUtils, workspaceApi);
  }
})();
