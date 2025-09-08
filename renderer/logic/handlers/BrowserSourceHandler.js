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

      const urlInput = document.createElement('input');
      urlInput.type = 'url';
      urlInput.placeholder = 'https://';
      urlInput.value = currentUrl || '';
      urlInput.className = 'input-grow';

      const saveBtn = document.createElement('button');
      saveBtn.className = 'btn-accent';
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', async () => {
        try {
          const newUrl = urlInput.value.trim();
          if (!newUrl) return;
          await window.obsAPI.browser.setUrl(sourceName, newUrl);
          window.uiHelpers.log(`🔗 Updated URL for ${displayName}`);
        } catch (err) {
          window.uiHelpers.log('❌ Failed to set URL: ' + (err?.message || err));
        }
      });

      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open';
      openBtn.addEventListener('click', () => {
        const u = (urlInput.value || '').trim();
        if (!u) return;
        try { window.open(u, '_blank'); } catch (_) { /* ignore */ }
      });

      const hardBtn = document.createElement('button');
      hardBtn.textContent = 'Hard Refresh';
      hardBtn.title = 'Refresh cache (no cache)';
      hardBtn.addEventListener('click', async () => {
        try {
          await window.obsAPI.browser.refreshNoCache(sourceName);
          window.uiHelpers.log(`🧹 Hard refreshed (no cache) ${displayName}`);
        } catch (err) {
          window.uiHelpers.log('❌ Failed hard refresh: ' + (err?.message || err));
        }
      });

      urlRow.appendChild(urlLabel);
      urlRow.appendChild(urlInput);
      urlRow.appendChild(saveBtn);
      urlRow.appendChild(openBtn);
      urlRow.appendChild(hardBtn);
      options.appendChild(urlRow);
      
      // Return the urlInput reference for parameter section
      return urlInput;
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

      const paramsBody = document.createElement('div');
      paramsBody.className = 'params-grid';

      // Parse URL query params safely
      const entries = this._parseUrlParams(currentUrl);
      const paramRows = [];

      // Build grid cells for each param
      for (const [key, value] of entries) {
        const cell = document.createElement('div');
        cell.className = 'param-cell';
        const keyLabel = document.createElement('label');
        keyLabel.textContent = key;
        keyLabel.className = 'param-label';
        const valInput = document.createElement('input');
        valInput.type = 'text';
        valInput.value = value;
        valInput.className = 'param-input';
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
      const saveParamsBtn = document.createElement('button');
      saveParamsBtn.className = 'btn-accent';
      saveParamsBtn.textContent = 'Apply';
      
      saveParamsBtn.addEventListener('click', async () => {
        try {
          const final = this._rebuildUrlWithParams(urlInput.value.trim(), paramRows);
          await window.obsAPI.browser.setUrl(sourceName, final);
          urlInput.value = final;
          window.uiHelpers.log(`✅ Updated parameters for ${displayName}`);
        } catch (err) {
          window.uiHelpers.log('❌ Failed to save parameters: ' + (err?.message || err));
        }
      });

      resetParamsBtn.addEventListener('click', () => {
        this._resetParams(paramsBody, paramRows, urlInput.value || '');
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
