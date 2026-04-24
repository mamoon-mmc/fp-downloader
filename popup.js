(() => {
  let selectedWidth = 740;
  let selectedFormat = 'webp';
  let selectedCompression = 80;
  let currentTheme = 'dark';
  let bulkModeActive = false;

  const btn740 = document.getElementById('btn-740');
  const btn1060 = document.getElementById('btn-1060');
  const customInput = document.getElementById('custom-input');
  const customSection = document.getElementById('custom-section');
  const downloadBtn = document.getElementById('download-btn');
  const bulkSelectBtn = document.getElementById('bulk-select-btn');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const formatSelect = document.getElementById('format-select');
  const compressionSlider = document.getElementById('compression-slider');
  const compressionValue = document.getElementById('compression-value');
  const compressionInfoText = document.getElementById('compression-info-text');
  const themeToggle = document.getElementById('theme-toggle');

  function setStatus(msg, type = 'idle') {
    statusText.textContent = msg;
    statusText.className = 'status-text' + (type !== 'idle' ? ` ${type}` : '');
    statusDot.className = 'status-dot' + (type === 'loading' ? ' active' : type === 'success' ? ' success' : type === 'error' ? ' error' : '');
  }

  function initTheme() {
    // Try to load saved theme preference
    const savedTheme = localStorage.getItem('freepikTheme');
    if (savedTheme) {
      currentTheme = savedTheme;
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDark ? 'dark' : 'light';
    }
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    html.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('freepikTheme', theme);
    updateThemeIcon();
  }

  function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
  }

  function updateThemeIcon() {
    if (themeToggle) {
      themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';
      themeToggle.title = currentTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }

  function loadSettings() {
    if (!chrome || !chrome.storage) {
      // Fallback to default values if storage is unavailable
      return;
    }
    
    chrome.storage.local.get({
      width: 740,
      format: 'webp',
      compression: 80
    }, (items) => {
      if (chrome.runtime.lastError) {
        console.error('Failed to load settings:', chrome.runtime.lastError);
        return;
      }
      selectedWidth = items.width || 740;
      selectedFormat = items.format || 'webp';
      selectedCompression = items.compression || 80;
      setActiveBtn(selectedWidth);
      formatSelect.value = selectedFormat;
      compressionSlider.value = selectedCompression;
      updateCompressionDisplay();
    });
  }

  // ── Settings provider for content script ──────────────────────────────────
  // content.js asks for current popup settings before bulk download
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === 'fpk_getSettings') {
      sendResponse({
        width: selectedWidth,
        format: selectedFormat,
        compression: selectedCompression
      });
      return true;
    }
    // User exited bulk mode from the page (✕ button on floating bar)
    if (message.action === 'fpk_bulkModeExited') {
      bulkModeActive = false;
      syncBulkBtn();
    }
  });

  // Initialize theme
  initTheme();
  themeToggle.addEventListener('click', toggleTheme);

  function updateCompressionDisplay() {
    compressionValue.textContent = selectedCompression;
    const descriptions = {
      0: 'Maximum compression (low quality)',
      25: 'High compression',
      50: 'Good balance',
      75: 'High quality',
      100: 'Maximum quality (large file)'
    };
    
    // Find the closest description
    const levels = Object.keys(descriptions).map(Number).sort((a, b) => a - b);
    let closest = levels[0];
    for (const level of levels) {
      if (Math.abs(level - selectedCompression) < Math.abs(closest - selectedCompression)) {
        closest = level;
      }
    }
    compressionInfoText.textContent = descriptions[closest];
  }

  function setActiveBtn(width) {
    btn740.classList.remove('active');
    btn1060.classList.remove('active');
    if (width === 740) btn740.classList.add('active');
    else if (width === 1060) btn1060.classList.add('active');
  }

  btn740.addEventListener('click', () => {
    selectedWidth = 740;
    customInput.value = '';
    setActiveBtn(740);
    if (chrome && chrome.storage) chrome.storage.local.set({ width: 740 });
    setStatus('Ready — width set to 740px');
  });

  btn1060.addEventListener('click', () => {
    selectedWidth = 1060;
    customInput.value = '';
    setActiveBtn(1060);
    if (chrome && chrome.storage) chrome.storage.local.set({ width: 1060 });
    setStatus('Ready — width set to 1060px');
  });

  customInput.addEventListener('focus', () => {
    customSection.classList.add('focused');
  });

  customInput.addEventListener('blur', () => {
    customSection.classList.remove('focused');
  });

  customInput.addEventListener('input', () => {
    const val = parseInt(customInput.value, 10);
    if (val > 0) {
      selectedWidth = val;
      btn740.classList.remove('active');
      btn1060.classList.remove('active');
      if (chrome && chrome.storage) chrome.storage.local.set({ width: val });
      setStatus(`Ready — width set to ${val}px`);
    }
  });

  formatSelect.addEventListener('change', () => {
    selectedFormat = formatSelect.value;
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ format: selectedFormat });
    }
    setStatus(`Ready — format set to ${selectedFormat.toUpperCase()}`);
  });

  compressionSlider.addEventListener('input', () => {
    selectedCompression = parseInt(compressionSlider.value, 10);
    if (chrome && chrome.storage) {
      chrome.storage.local.set({ compression: selectedCompression });
    }
    updateCompressionDisplay();
    setStatus(`Ready — compression set to ${selectedCompression}%`);
  });

  // ── Bulk select toggle ────────────────────────────────────────────────────
  function syncBulkBtn() {
    if (!bulkSelectBtn) return;
    if (bulkModeActive) {
      bulkSelectBtn.classList.add('active');
      bulkSelectBtn.querySelector('.bulk-btn-label').textContent = 'Exit Select Mode';
    } else {
      bulkSelectBtn.classList.remove('active');
      bulkSelectBtn.querySelector('.bulk-btn-label').textContent = 'Bulk Select Mode';
    }
  }

  if (bulkSelectBtn) {
    bulkSelectBtn.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: 'fpk_toggleBulkMode' }, (resp) => {
          if (chrome.runtime.lastError) {
            setStatus('Reload the Freepik page first.', 'error');
            return;
          }
          bulkModeActive = resp?.active ?? !bulkModeActive;
          syncBulkBtn();
          setStatus(
            bulkModeActive
              ? '✓ Bulk select active — check images on page'
              : 'Bulk select mode off',
            bulkModeActive ? 'success' : 'idle'
          );
        });
      } catch (err) {
        setStatus('Error: ' + err.message, 'error');
      }
    });
  }

  // On popup open: sync bulk-mode state from content script
  (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      chrome.tabs.sendMessage(tab.id, { action: 'fpk_getBulkModeState' }, (resp) => {
        if (chrome.runtime.lastError) return; // page not loaded yet — ok
        bulkModeActive = resp?.active ?? false;
        syncBulkBtn();
      });
    } catch (_) { /* ignore */ }
  })();

  downloadBtn.addEventListener('click', async () => {
    const customVal = parseInt(customInput.value, 10);
    if (customInput.value.trim() !== '' && customVal > 0) {
      selectedWidth = customVal;
    }

    if (!selectedWidth || selectedWidth <= 0) {
      setStatus('Please select or enter a valid width.', 'error');
      return;
    }

    setStatus('Scanning page for images…', 'loading');
    downloadBtn.disabled = true;

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      // Inject content script function and execute
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: scanAndGetImageUrls,
        args: [selectedWidth]
      });

      const imageData = results[0]?.result;

      if (!imageData || imageData.error) {
        setStatus(imageData?.error || 'Failed to scan page.', 'error');
        downloadBtn.disabled = false;
        return;
      }

      if (imageData.urls.length === 0) {
        setStatus('No matching images found on this page.', 'error');
        downloadBtn.disabled = false;
        return;
      }

      setStatus(`Found ${imageData.urls.length} image(s). Starting download…`, 'loading');

      // Send to background for downloading
      chrome.runtime.sendMessage(
        { action: 'downloadImages', images: imageData.urls, width: selectedWidth, format: selectedFormat, compression: selectedCompression },
        (response) => {
          if (response && response.success) {
            setStatus(`✓ Downloaded ${response.count} image(s) at ${selectedWidth}px`, 'success');
          } else {
            setStatus(response?.error || 'Download failed.', 'error');
          }
          downloadBtn.disabled = false;
        }
      );

    } catch (err) {
      setStatus('Error: ' + err.message, 'error');
      downloadBtn.disabled = false;
    }
  });

  // This function is injected into the page
  function scanAndGetImageUrls(targetWidth) {
    try {
      // Match the escaped class selector
      // Classes: col-span-1 sm:col-span-2 md:col-span-2 col-span-1 xs:col-span-2 -mx-5 sm:mx-0
      const selector = '.col-span-1.\\\\:col-span-2, [class*="sm:col-span-2"][class*="md:col-span-2"][class*="xs:col-span-2"][class*="-mx-5"][class*="sm:mx-0"]';

      // Use a more robust approach: find all elements and filter by class names
      const allElements = document.querySelectorAll('div, section, article');
      const targetElements = [];

      for (const el of allElements) {
        const cls = el.className || '';
        if (
          cls.includes('col-span-1') &&
          cls.includes('sm:col-span-2') &&
          cls.includes('md:col-span-2') &&
          cls.includes('xs:col-span-2') &&
          cls.includes('-mx-5') &&
          cls.includes('sm:mx-0')
        ) {
          targetElements.push(el);
        }
      }

      if (targetElements.length === 0) {
        return { urls: [], error: null };
      }

      const seen = new Set();
      const imageUrls = [];

      for (const container of targetElements) {
        const imgs = container.querySelectorAll('img');

        for (const img of imgs) {
          let baseUrl = null;

          // Try srcset first — pick any entry to extract base URL
          if (img.srcset) {
            const srcsetParts = img.srcset.split(',').map(s => s.trim());
            for (const part of srcsetParts) {
              const urlPart = part.split(/\s+/)[0];
              if (urlPart) {
                baseUrl = urlPart;
                break;
              }
            }
          }

          // Fall back to src
          if (!baseUrl && img.src) {
            baseUrl = img.src;
          }

          if (!baseUrl) continue;

          // Normalize the URL: strip existing w= param and query string tokens
          // to get a clean base, then rebuild with our target width
          const modifiedUrl = buildUrlWithWidth(baseUrl, targetWidth);

          if (!modifiedUrl) continue;

          // Deduplicate by the modified URL
          if (seen.has(modifiedUrl)) continue;
          seen.add(modifiedUrl);

          // Extract filename from the URL path
          const urlObj = new URL(modifiedUrl);
          const pathParts = urlObj.pathname.split('/');
          const filename = pathParts[pathParts.length - 1] || 'image.jpg';

          imageUrls.push({ url: modifiedUrl, filename });
        }
      }

      return { urls: imageUrls };
    } catch (e) {
      return { urls: [], error: e.message };
    }

    function buildUrlWithWidth(rawUrl, width) {
      try {
        const qIdx = rawUrl.indexOf('?');

        if (qIdx === -1) {
          // No query string at all — just append w=
          return `${rawUrl}?w=${width}`;
        }

        const base = rawUrl.substring(0, qIdx);
        const qs = rawUrl.substring(qIdx + 1);

        // Replace existing w= value if present, otherwise append it.
        // The w= param is always the last token in Freepik URLs, but we
        // handle both cases safely.
        if (/(?:^|&)w=/.test(qs)) {
          // Swap only the w= value, keep everything else intact
          const newQs = qs.replace(/((?:^|&)w=)[^&]*/g, `$1${width}`);
          return `${base}?${newQs}`;
        } else {
          // w= not present — append it
          return `${base}?${qs}&w=${width}`;
        }
      } catch {
        return null;
      }
    }
  }

  // Load settings on popup open
  loadSettings();
})();
