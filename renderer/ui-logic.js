// UI and OBS interaction logic (no direct button bindings)
(function() {
  function log(msg) {
    const pre = document.getElementById('log');
    if (pre) pre.textContent += msg + '\n';
  }

  // Badge helpers
  function setConnBadge(connected) {
    const connBadge = document.getElementById('connBadge');
    if (!connBadge) return;
    connBadge.textContent = connected ? 'Connected' : 'Disconnected';
    connBadge.classList.toggle('badge-on', connected);
    connBadge.classList.toggle('badge-off', !connected);
  }

  function setSceneBadge(sceneName) {
    const sceneBadge = document.getElementById('sceneBadge');
    if (!sceneBadge) return;
    sceneBadge.textContent = `Scene: ${sceneName || '-'}`;
  }

  // Generic indicator helper
  function setIndicator(el, color /* 'green' | 'red' */) {
    if (!el) return;
    el.classList.toggle('is-green', color === 'green');
    el.classList.toggle('is-red', color === 'red');
  }

  // Function to populate scene dropdown
  async function refreshScenes() {
    try {
      const sceneList = await window.obsAPI.scenes.get();
      const select = document.getElementById('sceneSelect');
      if (!select) return;

      // Clear existing options except the first one
      select.innerHTML = '<option value="">Select a scene...</option>';

      // Add scenes to dropdown
      if (sceneList && sceneList.scenes) {
        sceneList.scenes.forEach(scene => {
          const option = document.createElement('option');
          option.value = scene.sceneName;
          option.textContent = scene.sceneName;
          select.appendChild(option);
        });

        // Enable the dropdown
        select.disabled = false;

        log(`✅ Loaded ${sceneList.scenes.length} scenes`);
        log(`Current scene: ${sceneList.currentProgramSceneName}`);

        // Update current scene badge and selection
        setSceneBadge(sceneList.currentProgramSceneName);
        select.value = sceneList.currentProgramSceneName || '';

        // Load dashboard items for current scene
        if (sceneList.currentProgramSceneName) {
          await loadDashboardItems(sceneList.currentProgramSceneName);
        }
      }
    } catch (e) {
      log('❌ Error loading scenes: ' + e.message);
    }
  }

  // Dashboard: list and control scene items for selected scene
  async function loadDashboardItems(sceneName) {
    const container = document.getElementById('dashboardItems');
    if (!container) return;
    container.classList.remove('placeholder');
    container.textContent = 'Loading items...';
    try {
      const res = await window.obsAPI.sceneItems.list(sceneName);
      const items = res && (res.sceneItems || res.items || res);
      if (!Array.isArray(items)) {
        container.textContent = 'No items found.';
        return;
      }
      // Filter: only show sources that begin with "_"
      const filtered = items.filter(item => {
        const nm = item.sourceName || item.inputName || '';
        return typeof nm === 'string' && nm.startsWith('_');
      });
      if (filtered.length === 0) {
        container.textContent = 'No matching items (names starting with _).';
        return;
      }
      container.innerHTML = '';
      for (const item of filtered) {
        // Item wrapper to place row + options panel
        const itemWrap = document.createElement('div');
        itemWrap.className = 'dash-item';

        const row = document.createElement('div');
        row.className = 'dash-row';

        const name = document.createElement('div');
        name.className = 'name';
        const rawName = item.sourceName || item.inputName || `Item ${item.sceneItemId}`;
        const displayName = typeof rawName === 'string' && rawName.length > 0 ? rawName.slice(1) : rawName;
        name.textContent = displayName;
        name.title = rawName; // tooltip shows full original name

        const nameWrap = document.createElement('div');
        nameWrap.className = 'name-wrap';
        nameWrap.appendChild(name);

        const toggleWrap = document.createElement('div');
        toggleWrap.className = 'dash-toggle';

        const label = document.createElement('label');
        label.className = 'flex-center';

        const chk = document.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'switch';
        chk.checked = !!item.sceneItemEnabled;
        chk.title = 'Toggle visibility';

        chk.addEventListener('change', async (ev) => {
          const desired = ev.target.checked;
          try {
            await window.obsAPI.sceneItems.setEnabled(sceneName, item.sceneItemId, desired);
            log(`${desired ? '✅ Shown' : '🚫 Hidden'}: ${name.textContent}`);
          } catch (err) {
            ev.target.checked = !desired; // revert on failure
            log('❌ Error toggling item: ' + err.message);
          }
        });

        label.appendChild(chk);
        toggleWrap.appendChild(label);

        // Options panel (hidden by default)
        const options = document.createElement('div');
        options.className = 'dash-options';
        options.setAttribute('aria-hidden', 'true');

        // Track whether we actually added any options
        let hasOptions = false;

        // If this is a browser source, add a URL editor
        try {
          const currentUrl = await window.obsAPI.browser.getUrl(rawName);
          if (currentUrl !== null && currentUrl !== undefined) {
            hasOptions = true;
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
                await window.obsAPI.browser.setUrl(rawName, newUrl);
                log(`🔗 Updated URL for ${displayName}`);
              } catch (err) {
                log('❌ Failed to set URL: ' + (err && err.message ? err.message : err));
              }
            });

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Open';
            openBtn.addEventListener('click', () => {
              const u = (urlInput.value || '').trim();
              if (!u) return;
              try { window.open(u, '_blank'); } catch (_) { /* ignore */ }
            });

            urlRow.appendChild(urlLabel);
            urlRow.appendChild(urlInput);
            urlRow.appendChild(saveBtn);
            urlRow.appendChild(openBtn);

            const hardBtn = document.createElement('button');
            hardBtn.textContent = 'Hard Refresh';
            hardBtn.title = 'Refresh cache (no cache)';
            hardBtn.addEventListener('click', async () => {
              try {
                await window.obsAPI.browser.refreshNoCache(rawName);
                log(`🧹 Hard refreshed (no cache) ${displayName}`);
              } catch (err) {
                log('❌ Failed hard refresh: ' + (err && err.message ? err.message : err));
              }
            });

            urlRow.appendChild(hardBtn);
            options.appendChild(urlRow);

            // Parameters section (always visible, first, inline)
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
            let parsedUrl;
            try {
              parsedUrl = new URL(currentUrl);
            } catch (_) {
              try { parsedUrl = new URL(currentUrl, 'https://dummy.local'); } catch (_) { parsedUrl = null; }
            }

            const entries = [];
            if (parsedUrl) {
              parsedUrl.searchParams.forEach((value, key) => {
                entries.push([key, value]);
              });
            } else {
              // Fallback manual parse of query string
              const idx = currentUrl.indexOf('?');
              if (idx >= 0) {
                const qs = currentUrl.slice(idx + 1).split('#')[0];
                for (const pair of qs.split('&')) {
                  if (!pair) continue;
                  const [k, v] = pair.split('=');
                  entries.push([decodeURIComponent(k || ''), decodeURIComponent(v || '')]);
                }
              }
            }

            // Build grid cells for each param
            const paramRows = [];
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

            // No add/remove controls for high-pressure simplicity

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
                // Rebuild URL with updated params
                let base;
                try { base = new URL(urlInput.value.trim()); }
                catch { base = new URL(urlInput.value.trim(), 'https://dummy.local'); }
                // Clear existing params and set new
                base.search = '';
                const seen = new Set();
                for (const { key, input } of paramRows) {
                  if (!key) continue;
                  if (seen.has(key)) continue; // avoid duplicates
                  seen.add(key);
                  base.searchParams.set(key, input.value);
                }
                let final = base.toString();
                // If we used dummy base for relative, reconstruct relative URL
                if (!/^https?:\/\//i.test(urlInput.value.trim())) {
                  const u = new URL(final);
                  final = u.pathname + (u.search || '') + (u.hash || '');
                }
                await window.obsAPI.browser.setUrl(rawName, final);
                urlInput.value = final;
                log(`✅ Updated parameters for ${displayName}`);
              } catch (err) {
                log('❌ Failed to save parameters: ' + (err && err.message ? err.message : err));
              }
            });
            resetParamsBtn.addEventListener('click', () => {
              // Reload from current URL field to reflect latest
              let current = urlInput.value || '';
              let pu = null;
              try { pu = new URL(current); } catch {
                try { pu = new URL(current, 'https://dummy.local'); } catch { pu = null; }
              }
              // Clear and rebuild inline params
              paramRows.splice(0, paramRows.length);
              paramsBody.innerHTML = '';
              const pairs = [];
              if (pu) {
                pu.searchParams.forEach((v, k) => pairs.push([k, v]));
              }
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
            });
            // Append actions row and assemble the section
            saveParamsRow.appendChild(resetParamsBtn);
            saveParamsRow.appendChild(saveParamsBtn);
            // Press Enter in any input to apply immediately
            paramsBody.addEventListener('keydown', (e) => {
              if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT') {
                e.preventDefault();
                saveParamsBtn.click();
              }
            });
            paramsWrap.appendChild(paramsTitleRow);
            paramsWrap.appendChild(paramsBody);
            paramsWrap.appendChild(saveParamsRow);
            // Put Parameters at the top of options for prominence
            options.insertBefore(paramsWrap, options.firstChild);
          }
        } catch (err) {
          // Browser source not available or error occurred
        }

        // Create arrow now that we know options exist
        if (hasOptions) {
          const expandBtn = document.createElement('button');
          expandBtn.className = 'icon-btn expand-btn';
          expandBtn.title = 'Show source options';
          expandBtn.textContent = '▸';
          nameWrap.insertBefore(expandBtn, nameWrap.firstChild);

          let expanded = false; // default closed; user can expand via arrow or name click
          const setArrow = () => expandBtn.textContent = expanded ? '▾' : '▸';
          const applyExpanded = () => {
            options.classList.toggle('open', expanded);
            expandBtn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            options.setAttribute('aria-hidden', expanded ? 'false' : 'true');
            setArrow();
          };
          applyExpanded();

          // Toggle via arrow button
          expandBtn.addEventListener('click', () => {
            expanded = !expanded;
            applyExpanded();
          });

          // Also toggle by clicking the name area for better accessibility
          nameWrap.style.cursor = 'pointer';
          nameWrap.setAttribute('role', 'button');
          nameWrap.tabIndex = 0;
          const safeToggle = (evt) => {
            // Avoid toggling when interacting with inputs or buttons inside
            if (evt.target.closest('input, button, .dash-options')) return;
            expanded = !expanded;
            applyExpanded();
          };
          nameWrap.addEventListener('click', safeToggle);
          nameWrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              safeToggle(e);
            }
          });
        }

        row.appendChild(nameWrap);
        row.appendChild(toggleWrap);

        itemWrap.appendChild(row);
        itemWrap.appendChild(options);
        container.appendChild(itemWrap);
      }
    } catch (e) {
      container.textContent = 'Failed to load items: ' + e.message;
      log('❌ Failed to load dashboard items: ' + e.message);
    }
  }

  // Expose logic to global so bindings can call it
  window.uiLogic = {
    log,
    setConnBadge,
    setSceneBadge,
    setIndicator,
    refreshScenes,
    loadDashboardItems,
  };
})();
