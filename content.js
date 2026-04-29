// ─── Freepik Bulk-Select Content Script ───────────────────────────────────────
// Injected persistently on every page. Listens for messages from popup.js
// to activate/deactivate bulk-select mode.

(function () {
  'use strict';

  // ── State ────────────────────────────────────────────────────────────────────
  let bulkModeActive = false;
  let selectedFigures = new Set();   // Set of figure elements
  let floatingBar = null;
  let observer = null;

  const FIGURE_SELECTOR = 'figure.group.relative.h-full.rounded-xl';
  const CHECKBOX_CLASS  = '__fpk_bulk_cb__';
  const OVERLAY_CLASS   = '__fpk_select_overlay__';
  const BAR_ID          = '__fpk_bulk_bar__';
  const TOGGLE_ID       = '__fpk_bulk_toggle__';

  // ── Message listener (from popup.js) ─────────────────────────────────────────
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'fpk_toggleBulkMode') {
      if (bulkModeActive) {
        deactivateBulkMode();
        sendResponse({ active: false });
      } else {
        activateBulkMode();
        sendResponse({ active: true });
      }
      return true;
    }

    if (message.action === 'fpk_getBulkModeState') {
      sendResponse({ active: bulkModeActive });
      return true;
    }

    if (message.action === 'fpk_getSelectedImages') {
      const images = collectSelectedImages(message.width || 740);
      sendResponse({ images });
      return true;
    }
  });

  // ── Activate ──────────────────────────────────────────────────────────────────
  function activateBulkMode() {
    if (bulkModeActive) return;
    bulkModeActive = true;
    selectedFigures.clear();

    injectStyles();
    createFloatingBar();
    instrumentFigures();
    startObserver();
  }

  // ── Deactivate ────────────────────────────────────────────────────────────────
  function deactivateBulkMode() {
    if (!bulkModeActive) return;
    bulkModeActive = false;
    selectedFigures.clear();

    stopObserver();
    removeAllCheckboxes();
    removeFloatingBar();
  }

  // ── Inject CSS ────────────────────────────────────────────────────────────────
  function injectStyles() {
    if (document.getElementById('__fpk_styles__')) return;
    const style = document.createElement('style');
    style.id = '__fpk_styles__';
    style.textContent = `
      /* Checkbox wrapper injected into each figure */
      .${CHECKBOX_CLASS} {
        position: absolute;
        top: 10px;
        left: 10px;
        z-index: 9999;
        width: 22px;
        height: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: all;
      }

      .${CHECKBOX_CLASS} input[type="checkbox"] {
        width: 18px;
        height: 18px;
        border-radius: 5px;
        accent-color: #ff6b35;
        cursor: pointer;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
        border: 2px solid rgba(255,255,255,0.8);
        background: rgba(0,0,0,0.4);
        appearance: auto;
      }

      /* Tinted overlay on selected figures */
      .${OVERLAY_CLASS} {
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        z-index: 9998;
        transition: outline 0.12s ease, background 0.12s ease;
        outline: 2.5px solid transparent;
      }

      .${OVERLAY_CLASS}.selected {
        outline: 2.5px solid #ff6b35;
        background: rgba(255, 107, 53, 0.18);
      }

      /* Floating action bar */
      #${BAR_ID} {
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        z-index: 2147483647;
        background: linear-gradient(135deg, #1a1a1f 0%, #0e0e10 100%);
        border: 1px solid #2e2e38;
        border-radius: 999px;
        padding: 10px 20px 10px 16px;
        display: flex;
        align-items: center;
        gap: 14px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,107,53,0.12);
        font-family: 'DM Mono', 'Courier New', monospace;
        font-size: 13px;
        color: #f0ede8;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
        opacity: 0;
        pointer-events: none;
        white-space: nowrap;
        user-select: none;
      }

      #${BAR_ID}.visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
        pointer-events: all;
      }

      #${BAR_ID} .fpk-count-badge {
        background: rgba(255,107,53,0.2);
        color: #ff6b35;
        border-radius: 999px;
        padding: 2px 10px;
        font-size: 12px;
        font-weight: 600;
        min-width: 24px;
        text-align: center;
      }

      #${BAR_ID} .fpk-dl-btn {
        background: linear-gradient(135deg, #ff6b35 0%, #ff9f1c 100%);
        border: none;
        border-radius: 999px;
        padding: 8px 18px;
        color: #fff;
        font-family: inherit;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.12s;
        display: flex;
        align-items: center;
        gap: 7px;
        letter-spacing: 0.2px;
      }

      #${BAR_ID} .fpk-dl-btn:hover { opacity: 0.88; transform: scale(1.03); }
      #${BAR_ID} .fpk-dl-btn:active { transform: scale(0.97); }
      #${BAR_ID} .fpk-dl-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

      #${BAR_ID} .fpk-clear-btn {
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 999px;
        padding: 7px 14px;
        color: #c0bdb8;
        font-family: inherit;
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }

      #${BAR_ID} .fpk-clear-btn:hover {
        background: rgba(255,255,255,0.13);
        color: #f0ede8;
      }

      #${BAR_ID} .fpk-exit-btn {
        background: transparent;
        border: none;
        color: #7a7a8c;
        font-size: 18px;
        cursor: pointer;
        line-height: 1;
        padding: 0 2px;
        transition: color 0.15s;
      }
      #${BAR_ID} .fpk-exit-btn:hover { color: #f87171; }

      #${BAR_ID} .fpk-separator {
        width: 1px;
        height: 20px;
        background: rgba(255,255,255,0.1);
        flex-shrink: 0;
      }

      #${BAR_ID} .fpk-dl-status {
        font-size: 11px;
        color: #7a7a8c;
        min-width: 80px;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Floating bar ──────────────────────────────────────────────────────────────
  function createFloatingBar() {
    if (document.getElementById(BAR_ID)) return;

    floatingBar = document.createElement('div');
    floatingBar.id = BAR_ID;
    floatingBar.innerHTML = `
      <span class="fpk-count-badge" id="__fpk_count__">0</span>
      <span style="color:#7a7a8c;font-size:12px;">selected</span>
      <div class="fpk-separator"></div>
      <span class="fpk-dl-status" id="__fpk_dl_status__"></span>
      <button class="fpk-clear-btn" id="__fpk_clear__">Clear</button>
      <button class="fpk-dl-btn" id="__fpk_dl__" disabled>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Download Selected
      </button>
      <div class="fpk-separator"></div>
      <button class="fpk-exit-btn" id="__fpk_exit__" title="Exit bulk select">✕</button>
    `;
    document.body.appendChild(floatingBar);

    document.getElementById('__fpk_clear__').addEventListener('click', clearSelection);
    document.getElementById('__fpk_exit__').addEventListener('click', () => {
      deactivateBulkMode();
      // Notify popup that bulk mode is now off
      chrome.runtime.sendMessage({ action: 'fpk_bulkModeExited' }).catch(() => {});
    });
    document.getElementById('__fpk_dl__').addEventListener('click', triggerBulkDownload);
  }

  function removeFloatingBar() {
    const bar = document.getElementById(BAR_ID);
    if (bar) bar.remove();
    floatingBar = null;
  }

  function updateBarUI() {
    const count = selectedFigures.size;
    const countEl = document.getElementById('__fpk_count__');
    const dlBtn   = document.getElementById('__fpk_dl__');
    const statusEl= document.getElementById('__fpk_dl_status__');

    if (countEl) countEl.textContent = count;
    if (dlBtn)   dlBtn.disabled = count === 0;
    if (statusEl) statusEl.textContent = '';

    if (floatingBar) {
      if (count > 0) {
        floatingBar.classList.add('visible');
      } else {
        // Keep bar visible but gray when nothing selected if mode is active
        floatingBar.classList.add('visible');
      }
    }
  }

  // ── Instrument figures ────────────────────────────────────────────────────────
  function instrumentFigures() {
    const figures = document.querySelectorAll(FIGURE_SELECTOR);
    figures.forEach(addCheckboxToFigure);
  }

  function addCheckboxToFigure(figure) {
    if (figure.querySelector('.' + CHECKBOX_CLASS)) return; // already done

    // Ensure figure has relative positioning (it already does via class)
    const cbWrapper = document.createElement('div');
    cbWrapper.className = CHECKBOX_CLASS;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.setAttribute('aria-label', 'Select image for bulk download');

    cbWrapper.appendChild(cb);
    figure.appendChild(cbWrapper);

    // Selection overlay
    const overlay = document.createElement('div');
    overlay.className = OVERLAY_CLASS;
    figure.appendChild(overlay);

    // Toggle selection on checkbox change
    cb.addEventListener('change', (e) => {
      e.stopPropagation();
      toggleFigureSelection(figure, cb, overlay, cb.checked);
    });

    // Also allow clicking the overlay to toggle (for convenience)
    figure.addEventListener('click', (e) => {
      // Don't intercept clicks on interactive elements (links, buttons, etc.)
      if (!bulkModeActive) return;
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'a' || tag === 'button' || tag === 'input') return;
      if (e.target.closest('a') || e.target.closest('button') || e.target.closest('input')) return;

      cb.checked = !cb.checked;
      toggleFigureSelection(figure, cb, overlay, cb.checked);
      e.preventDefault();
    });
  }

  function toggleFigureSelection(figure, cb, overlay, isSelected) {
    if (isSelected) {
      selectedFigures.add(figure);
      overlay.classList.add('selected');
    } else {
      selectedFigures.delete(figure);
      overlay.classList.remove('selected');
    }
    updateBarUI();
  }

  function clearSelection() {
    selectedFigures.clear();
    document.querySelectorAll('.' + OVERLAY_CLASS).forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.' + CHECKBOX_CLASS + ' input').forEach(cb => { cb.checked = false; });
    updateBarUI();
  }

  // ── Remove checkboxes / overlays ──────────────────────────────────────────────
  function removeAllCheckboxes() {
    document.querySelectorAll('.' + CHECKBOX_CLASS).forEach(el => el.remove());
    document.querySelectorAll('.' + OVERLAY_CLASS).forEach(el => el.remove());
    const style = document.getElementById('__fpk_styles__');
    if (style) style.remove();
  }

  // ── MutationObserver — handle dynamically added figures ───────────────────────
  function startObserver() {
    observer = new MutationObserver(() => {
      if (!bulkModeActive) return;
      const figures = document.querySelectorAll(FIGURE_SELECTOR);
      figures.forEach(fig => {
        if (!fig.querySelector('.' + CHECKBOX_CLASS)) {
          addCheckboxToFigure(fig);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
  }

  // ── Collect selected image URLs ───────────────────────────────────────────────
  function collectSelectedImages(targetWidth) {
    const images = [];
    const seen = new Set();

    for (const figure of selectedFigures) {
      const img = figure.querySelector('img');
      if (!img) continue;

      let baseUrl = null;

      if (img.srcset) {
        const parts = img.srcset.split(',').map(s => s.trim());
        for (const part of parts) {
          const urlPart = part.split(/\s+/)[0];
          if (urlPart) { baseUrl = urlPart; break; }
        }
      }
      if (!baseUrl && img.src) baseUrl = img.src;
      if (!baseUrl) continue;

      const modifiedUrl = buildUrlWithWidth(baseUrl, targetWidth);
      if (!modifiedUrl || seen.has(modifiedUrl)) continue;
      seen.add(modifiedUrl);

      const urlObj = new URL(modifiedUrl);
      const pathParts = urlObj.pathname.split('/');
      const filename = pathParts[pathParts.length - 1] || 'image.jpg';

      images.push({ url: modifiedUrl, filename });
    }
    return images;
  }

  // ── Trigger bulk download via background.js ───────────────────────────────────
  async function triggerBulkDownload() {
    const dlBtn    = document.getElementById('__fpk_dl__');
    const statusEl = document.getElementById('__fpk_dl_status__');

    if (selectedFigures.size === 0) return;

    // Read settings from storage — works even when the popup is closed
    let width = 740, format = 'webp', compression = 80, zipMode = false;
    try {
      const settings = await new Promise((resolve) => {
        chrome.storage.local.get({ width: 740, format: 'webp', compression: 80, zipMode: false }, resolve);
      });
      width       = settings.width       || 740;
      format      = settings.format      || 'webp';
      compression = settings.compression || 80;
      zipMode     = settings.zipMode     ?? false;
    } catch (_) { /* use defaults */ }

    const images = collectSelectedImages(width);
    if (images.length === 0) {
      if (statusEl) statusEl.textContent = 'No valid images found';
      return;
    }

    if (dlBtn) dlBtn.disabled = true;
    if (statusEl) statusEl.textContent = `Downloading ${images.length}…`;

    chrome.runtime.sendMessage(
      { action: 'downloadImages', images, width, format, compression, zip: zipMode },
      (response) => {
        if (response && response.success) {
          if (statusEl) statusEl.textContent = `✓ ${response.count} done`;
        } else {
          if (statusEl) statusEl.textContent = response?.error || 'Failed';
        }
        if (dlBtn) dlBtn.disabled = selectedFigures.size === 0;
      }
    );
  }

  // ── URL width helper (mirrors the one in popup.js) ────────────────────────────
  function buildUrlWithWidth(rawUrl, width) {
    try {
      const qIdx = rawUrl.indexOf('?');
      if (qIdx === -1) return `${rawUrl}?w=${width}`;

      const base = rawUrl.substring(0, qIdx);
      const qs   = rawUrl.substring(qIdx + 1);

      if (/(?:^|&)w=/.test(qs)) {
        const newQs = qs.replace(/((?:^|&)w=)[^&]*/g, `$1${width}`);
        return `${base}?${newQs}`;
      } else {
        return `${base}?${qs}&w=${width}`;
      }
    } catch {
      return null;
    }
  }
})();
