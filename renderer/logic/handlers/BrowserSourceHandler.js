// Browser Source Handler - Manages URL editing and parameter controls
(function() {
  const BrowserSourceHandler = {
    name: 'BrowserSourceHandler',
    version: '1.0.0',
    
    canHandle(sourceKind, sourceName, context) {
      return sourceKind === 'browser_source';
    },
    
    priority() {
      return 10; // High priority for browser sources
    },
    
    async createControls(options, sourceName, displayName, context) {
      try {
        const currentUrl = await window.obsAPI.browser.getUrl(sourceName);
        if (currentUrl === null || currentUrl === undefined) return;
        
        const urlInput = await this._createUrlControls(options, sourceName, displayName, currentUrl);
        await this._createParametersSection(options, currentUrl, sourceName, displayName, urlInput);
        // Add audio controls (mute + volume)
        await this._createAudioControls(options, sourceName, displayName);
      } catch (err) {
        console.warn(`BrowserSourceHandler error for ${sourceName}:`, err);
      }
    },
    
    async _createUrlControls(options, sourceName, displayName, currentUrl) {
      const urlRow = document.createElement('div');
      urlRow.className = 'dash-option-row';

      const urlLabel = document.createElement('label');
      urlLabel.textContent = 'Link';
      urlLabel.className = 'input-label';

      const urlInputId = `browser-url-${String(sourceName || '').replace(/[^a-z0-9_-]/gi, '_')}`;

      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.placeholder = 'https://';
      urlInput.value = currentUrl || '';
      urlInput.className = 'input-grow';
      urlInput.id = urlInputId;
      urlInput.setAttribute('aria-label', `URL for ${displayName}`);
      urlLabel.setAttribute('for', urlInputId);

      const statusEl = document.createElement('span');
      statusEl.className = 'save-status';
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
      statusEl.setAttribute('aria-atomic', 'true');

      const setStatus = (state, message) => {
        statusEl.classList.remove('is-saving', 'is-saved', 'is-error');
        if (state) statusEl.classList.add(state);
        statusEl.textContent = message || '';
        if (state === 'is-saved') {
          window.clearTimeout(statusEl._t);
          statusEl._t = window.setTimeout(() => {
            statusEl.classList.remove('is-saved');
            statusEl.textContent = '';
          }, 1500);
        }
      };

      const doSaveUrl = async () => {
        try {
          const newUrl = urlInput.value.trim();
          if (!newUrl) {
            setStatus('is-error', 'URL is empty');
            return;
          }
          setStatus('is-saving', 'Saving…');
          await window.obsAPI.browser.setUrl(sourceName, newUrl);
          setStatus('is-saved', 'Saved');
          window.uiHelpers.logSuccess(`Updated URL: ${displayName}`, 'browser');
        } catch (err) {
          setStatus('is-error', 'Save failed');
          window.uiHelpers.logError('Failed to set URL: ' + (err?.message || err), 'browser');
        }
      };

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-accent';
      saveBtn.textContent = 'Save';
      saveBtn.type = 'button';
      saveBtn.setAttribute('aria-label', `Save URL for ${displayName}`);
      saveBtn.addEventListener('click', doSaveUrl);

      urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          doSaveUrl();
        }
      });

      const openBtn = document.createElement('button');
      openBtn.className = 'btn-ghost';
      openBtn.textContent = 'Open';
      openBtn.type = 'button';
      openBtn.setAttribute('aria-label', `Open URL for ${displayName}`);
      openBtn.addEventListener('click', () => {
        const u = (urlInput.value || '').trim();
        if (!u) return;
        try { window.open(u, '_blank'); } catch (_) { /* ignore */ }
      });

      const hardBtn = document.createElement('button');
      hardBtn.className = 'btn-ghost';
      hardBtn.textContent = 'Hard Refresh';
      hardBtn.title = 'Refresh cache (no cache)';
      hardBtn.type = 'button';
      hardBtn.setAttribute('aria-label', `Hard refresh ${displayName}`);
      hardBtn.addEventListener('click', async () => {
        try {
          setStatus('is-saving', 'Refreshing…');
          await window.obsAPI.browser.refreshNoCache(sourceName);
          setStatus('is-saved', 'Refreshed');
          window.uiHelpers.logSuccess(`Hard refreshed (no cache): ${displayName}`, 'browser');
        } catch (err) {
          setStatus('is-error', 'Refresh failed');
          window.uiHelpers.logError('Failed hard refresh: ' + (err?.message || err), 'browser');
        }
      });

      urlRow.appendChild(urlLabel);
      urlRow.appendChild(urlInput);
      urlRow.appendChild(saveBtn);
      urlRow.appendChild(openBtn);
      urlRow.appendChild(hardBtn);
      urlRow.appendChild(statusEl);
      options.appendChild(urlRow);
      
      // Return the urlInput reference for parameter section
      urlInput._statusEl = statusEl;
      urlInput._setStatus = setStatus;
      urlInput._doSaveUrl = doSaveUrl;
      return urlInput;
    },

    async _createAudioControls(options, sourceName, displayName) {
      const vol = window.PluginUtils.createVolumeControl({ sourceName, displayName, logTag: 'browser' });
      options.appendChild(vol.container);

      // Initial states
      try {
        const [muteState, volState] = await Promise.all([
          window.obsAPI.sources.getMute(sourceName),
          window.obsAPI.sources.getVolume(sourceName)
        ]);
        const isMuted = !!(muteState && (muteState.inputMuted ?? muteState.muted));
        vol.applyMuteVisual(isMuted);
        const mul = volState && typeof volState.inputVolumeMul === 'number' ? volState.inputVolumeMul : 1.0;
        const pct = Math.round(mul * 100);
        vol.slider.value = String(pct);
        vol.numInput.value = String(pct);
      } catch (_) { /* ignore */ }
    },

    onRemoteUpdate(sourceName, eventType, data) {
      if (eventType === 'input-mute-changed') {
        this._updateRemoteMute(sourceName, data.inputMuted);
      } else if (eventType === 'input-volume-changed' && data.inputName === sourceName) {
        const mul = typeof data.inputVolumeMul === 'number' ? data.inputVolumeMul : undefined;
        if (mul !== undefined) this._updateRemoteVolume(sourceName, mul);
      }
    },

    _updateRemoteMute(inputName, muted) {
      try {
        const btn = document.querySelector(`.volume-control .mute-btn[data-input-name="${CSS.escape(inputName)}"]`);
        if (!btn) return;
        btn.classList.toggle('is-muted', muted);
        btn.title = muted ? 'Unmute' : 'Mute';
        btn.innerHTML = muted
          ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
          : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
      } catch (_) { /* ignore */ }
    },

    _updateRemoteVolume(inputName, mul) {
      try {
        const pct = String(Math.round(Math.max(0, Math.min(1, mul)) * 100));
        const slider = document.querySelector(`.volume-control .volume-slider[data-input-name="${CSS.escape(inputName)}"]`);
        if (slider) slider.value = pct;
        const num = slider?.closest('.volume-slider-wrap')?.querySelector('.volume-num');
        if (num) num.value = pct;
      } catch (_) { /* ignore */ }
    },

    
    async _createParametersSection(options, currentUrl, sourceName, displayName, urlInput) {
      const paramsWrap = document.createElement('div');
      paramsWrap.className = 'params-section';
      const paramsTitleRow = document.createElement('div');
      paramsTitleRow.className = 'dash-option-row';
      const paramsTitle = document.createElement('div');
      paramsTitle.className = 'params-title';
      paramsTitle.textContent = 'Parameters';
      paramsTitleRow.appendChild(paramsTitle);

      const paramsStatus = document.createElement('span');
      paramsStatus.className = 'save-status';
      paramsStatus.setAttribute('role', 'status');
      paramsStatus.setAttribute('aria-live', 'polite');
      paramsStatus.setAttribute('aria-atomic', 'true');
      paramsTitleRow.appendChild(paramsStatus);

      const setParamsStatus = (state, message) => {
        paramsStatus.classList.remove('is-saving', 'is-saved', 'is-error');
        if (state) paramsStatus.classList.add(state);
        paramsStatus.textContent = message || '';
        if (state === 'is-saved') {
          window.clearTimeout(paramsStatus._t);
          paramsStatus._t = window.setTimeout(() => {
            paramsStatus.classList.remove('is-saved');
            paramsStatus.textContent = '';
          }, 1500);
        }
      };

      const paramsBody = document.createElement('div');
      paramsBody.className = 'params-grid';

      // Parse URL query params safely
      const entries = this._parseUrlParams(currentUrl);
      const paramRows = [];

      // Build grid cells for each param
      for (const [key, value] of entries) {
        const cell = document.createElement('div');
        cell.className = 'param-cell';

        const inputId = `browser-param-${String(sourceName || '').replace(/[^a-z0-9_-]/gi, '_')}-${String(key || '').replace(/[^a-z0-9_-]/gi, '_')}`;

        const keyLabel = document.createElement('label');
        keyLabel.textContent = key;
        keyLabel.className = 'param-label';

        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.value = value;
        valInput.className = 'param-input';
        valInput.id = inputId;
        valInput.setAttribute('aria-label', `${displayName} parameter ${key}`);
        keyLabel.setAttribute('for', inputId);

        cell.appendChild(keyLabel);
        cell.appendChild(valInput);
        paramsBody.appendChild(cell);
        paramRows.push({ key, input: valInput });
      }

      // Save params button
      const saveParamsRow = document.createElement('div');
      saveParamsRow.className = 'dash-option-row params-actions';
      const resetParamsBtn = document.createElement('button');
      resetParamsBtn.className = 'btn-ghost';
      resetParamsBtn.textContent = 'Reset';
      resetParamsBtn.type = 'button';
      resetParamsBtn.setAttribute('aria-label', `Reset parameters for ${displayName}`);
      const saveParamsBtn = document.createElement('button');
      saveParamsBtn.className = 'btn-accent';
      saveParamsBtn.textContent = 'Apply';
      saveParamsBtn.type = 'button';
      saveParamsBtn.setAttribute('aria-label', `Apply parameters for ${displayName}`);
      
      saveParamsBtn.addEventListener('click', async () => {
        try {
          setParamsStatus('is-saving', 'Saving…');
          const final = this._rebuildUrlWithParams(urlInput.value.trim(), paramRows);
          await window.obsAPI.browser.setUrl(sourceName, final);
          urlInput.value = final;
          if (typeof urlInput._setStatus === 'function') {
            urlInput._setStatus('is-saved', 'Saved');
          }
          setParamsStatus('is-saved', 'Saved');
          window.uiHelpers.logSuccess(`Updated parameters: ${displayName}`, 'browser');
        } catch (err) {
          setParamsStatus('is-error', 'Save failed');
          if (typeof urlInput._setStatus === 'function') {
            urlInput._setStatus('is-error', 'Save failed');
          }
          window.uiHelpers.logError('Failed to save parameters: ' + (err?.message || err), 'browser');
        }
      });

      resetParamsBtn.addEventListener('click', () => {
        this._resetParams(paramsBody, paramRows, urlInput.value || '');
        setParamsStatus(null, '');
      });

      // Press Enter in any input to apply immediately
      paramsBody.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target?.tagName === 'INPUT') {
          e.preventDefault();
          saveParamsBtn.click();
        }
      });

      saveParamsRow.appendChild(resetParamsBtn);
      saveParamsRow.appendChild(saveParamsBtn);
      
      paramsWrap.appendChild(paramsTitleRow);
      paramsWrap.appendChild(paramsBody);
      paramsWrap.appendChild(saveParamsRow);
      
      // Put Parameters at the top of options for prominence
      options.insertBefore(paramsWrap, options.firstChild);
    },
    
    _parseUrlParams(url) {
      const entries = [];
      let parsedUrl;
      try {
        parsedUrl = new URL(url);
      } catch (_) {
        try { parsedUrl = new URL(url, 'https://dummy.local'); } catch (_) { parsedUrl = null; }
      }

      if (parsedUrl) {
        parsedUrl.searchParams.forEach((value, key) => {
          entries.push([key, value]);
        });
      } else {
        // Fallback manual parse of query string
        const idx = url.indexOf('?');
        if (idx >= 0) {
          const qs = url.slice(idx + 1).split('#')[0];
          for (const pair of qs.split('&')) {
            if (!pair) continue;
            const [k, v] = pair.split('=');
            entries.push([decodeURIComponent(k || ''), decodeURIComponent(v || '')]);
          }
        }
      }
      return entries;
    },
    
    _rebuildUrlWithParams(baseUrl, paramRows) {
      let base;
      try { base = new URL(baseUrl); }
      catch { base = new URL(baseUrl, 'https://dummy.local'); }
      
      // Clear existing params and set new
      base.search = '';
      const seen = new Set();
      for (const { key, input } of paramRows) {
        if (!key || seen.has(key)) continue;
        seen.add(key);
        base.searchParams.set(key, input.value);
      }
      
      let final = base.toString();
      // If we used dummy base for relative, reconstruct relative URL
      if (!/^https?:\/\//i.test(baseUrl)) {
        const u = new URL(final);
        final = u.pathname + (u.search || '') + (u.hash || '');
      }
      return final;
    },
    
    _resetParams(paramsBody, paramRows, currentUrl) {
      const pairs = this._parseUrlParams(currentUrl);
      paramRows.splice(0, paramRows.length);
      paramsBody.innerHTML = '';
      
      for (const [k, v] of pairs) {
        const cell = document.createElement('div');
        cell.className = 'param-cell';
        const keyLabel = document.createElement('label');
        keyLabel.textContent = k;
        keyLabel.className = 'param-label';
        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.value = v;
        valInput.className = 'param-input';
        cell.appendChild(keyLabel);
        cell.appendChild(valInput);
        paramsBody.appendChild(cell);
        paramRows.push({ key: k, input: valInput });
      }
    }
  };

  // Auto-register when loaded
  if (window.HandlerRegistry) {
    window.HandlerRegistry.register(BrowserSourceHandler);
  } else {
    // Queue for later registration
    window.addEventListener('handlerRegistryReady', () => {
      window.HandlerRegistry.register(BrowserSourceHandler);
    });
  }
})();
