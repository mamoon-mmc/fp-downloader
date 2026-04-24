// ─── CRC32 (required for valid ZIP files) ─────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ─── Pure-JS ZIP builder (STORE / no compression) ────────────────────────────
// files: Array of { name: string, data: Uint8Array }
function buildZip(files) {
  const enc = new TextEncoder();
  const localParts   = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, data } of files) {
    const nameBytes = enc.encode(name);
    const fileSize  = data.length;
    const fileCrc   = crc32(data);

    // ── Local file header (30 bytes) + filename + file data ──────────────────
    const localBuf = new ArrayBuffer(30 + nameBytes.length + fileSize);
    const lv = new DataView(localBuf);
    const lu = new Uint8Array(localBuf);

    lv.setUint32( 0, 0x04034B50,      true); // local file signature
    lv.setUint16( 4, 20,              true); // version needed
    lv.setUint16( 6, 0,               true); // general flags
    lv.setUint16( 8, 0,               true); // compression: STORE
    lv.setUint16(10, 0,               true); // last mod time
    lv.setUint16(12, 0,               true); // last mod date
    lv.setUint32(14, fileCrc,         true); // crc-32
    lv.setUint32(18, fileSize,        true); // compressed size
    lv.setUint32(22, fileSize,        true); // uncompressed size
    lv.setUint16(26, nameBytes.length,true); // filename length
    lv.setUint16(28, 0,               true); // extra field length
    lu.set(nameBytes, 30);
    lu.set(data,      30 + nameBytes.length);

    localParts.push(new Uint8Array(localBuf));

    // ── Central directory entry (46 bytes) + filename ────────────────────────
    const centralBuf = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(centralBuf);
    const cu = new Uint8Array(centralBuf);

    cv.setUint32( 0, 0x02014B50,      true); // central dir signature
    cv.setUint16( 4, 0x031E,          true); // version made by (Unix 3.0)
    cv.setUint16( 6, 20,              true); // version needed
    cv.setUint16( 8, 0,               true); // general flags
    cv.setUint16(10, 0,               true); // compression: STORE
    cv.setUint16(12, 0,               true); // last mod time
    cv.setUint16(14, 0,               true); // last mod date
    cv.setUint32(16, fileCrc,         true); // crc-32
    cv.setUint32(20, fileSize,        true); // compressed size
    cv.setUint32(24, fileSize,        true); // uncompressed size
    cv.setUint16(28, nameBytes.length,true); // filename length
    cv.setUint16(30, 0,               true); // extra field length
    cv.setUint16(32, 0,               true); // file comment length
    cv.setUint16(34, 0,               true); // disk number start
    cv.setUint16(36, 0,               true); // internal attributes
    cv.setUint32(38, 0,               true); // external attributes
    cv.setUint32(42, offset,          true); // offset of local header
    cu.set(nameBytes, 46);

    centralParts.push(new Uint8Array(centralBuf));
    offset += 30 + nameBytes.length + fileSize;
  }

  // ── End of central directory record (22 bytes) ───────────────────────────
  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocdBuf = new ArrayBuffer(22);
  const ev = new DataView(eocdBuf);

  ev.setUint32( 0, 0x06054B50,   true); // end of central dir signature
  ev.setUint16( 4, 0,            true); // disk number
  ev.setUint16( 6, 0,            true); // disk with start of central dir
  ev.setUint16( 8, files.length, true); // entries on this disk
  ev.setUint16(10, files.length, true); // total entries
  ev.setUint32(12, centralSize,  true); // size of central dir
  ev.setUint32(16, offset,       true); // offset of central dir
  ev.setUint16(20, 0,            true); // comment length

  return new Blob(
    [...localParts, ...centralParts, new Uint8Array(eocdBuf)],
    { type: 'application/zip' }
  );
}

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadImages') {
    handleDownloads(message.images, message.width, message.format, message.compression, message.zip)
      .then(result => sendResponse(result))
      .catch(err  => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }
});

// ─── Main download handler ────────────────────────────────────────────────────
async function handleDownloads(images, width, format = 'webp', compression = 80, zip = false) {
  if (!images || images.length === 0) {
    return { success: false, error: 'No images to download.' };
  }

  const errors = [];
  let downloadCount = 0;

  if (zip) {
    // ── Bulk mode: fetch all, bundle into one ZIP ─────────────────────────
    const zipFiles = [];

    for (const imgData of images) {
      try {
        const blob = await fetchAndConvert(imgData.url, format, compression);
        const data = new Uint8Array(await blob.arrayBuffer());
        const name = sanitizeFilename(imgData.filename, width, format);
        zipFiles.push({ name, data });
      } catch (err) {
        errors.push({ url: imgData.url, error: err.message });
      }
    }

    if (zipFiles.length === 0) {
      return { success: false, error: `All downloads failed. ${errors.map(e => e.error).join('; ')}` };
    }

    const zipBlob = buildZip(zipFiles);
    const dataUrl = await blobToDataUrl(zipBlob);
    const ts      = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const zipName = `freepik_${ts}_${zipFiles.length}imgs.zip`;

    await downloadFile(dataUrl, zipName);
    downloadCount = zipFiles.length;

  } else {
    // ── Regular mode: download each image as an individual file ───────────
    for (const imgData of images) {
      try {
        const blob    = await fetchAndConvert(imgData.url, format, compression);
        const dataUrl = await blobToDataUrl(blob);
        const name    = sanitizeFilename(imgData.filename, width, format);
        await downloadFile(dataUrl, name);
        downloadCount++;
        await sleep(150); // small gap to avoid overwhelming the browser
      } catch (err) {
        errors.push({ url: imgData.url, error: err.message });
      }
    }

    if (downloadCount === 0) {
      return { success: false, error: `All downloads failed. ${errors.map(e => e.error).join('; ')}` };
    }
  }

  return { success: true, count: downloadCount, errors };
}

// ─── Fetch + convert via OffscreenCanvas ──────────────────────────────────────
async function fetchAndConvert(url, format, compression) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);

  const blob = await response.blob();
  const img  = await createImageBitmap(blob);

  const canvas = new OffscreenCanvas(img.width, img.height);
  canvas.getContext('2d').drawImage(img, 0, 0);

  const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/webp';
  return canvas.convertToBlob({ type: mimeType, quality: compression / 100 });
}

// ─── chrome.downloads wrapper ─────────────────────────────────────────────────
function downloadFile(dataUrl, filename) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      { url: dataUrl, filename, conflictAction: 'uniquify', saveAs: false },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (downloadId === undefined) {
          return reject(new Error('Download failed to start.'));
        }

        const listener = (delta) => {
          if (delta.id !== downloadId) return;
          if (delta.state?.current === 'complete') {
            chrome.downloads.onChanged.removeListener(listener);
            resolve(downloadId);
          } else if (delta.state?.current === 'interrupted') {
            chrome.downloads.onChanged.removeListener(listener);
            reject(new Error(`Download interrupted: ${delta.error?.current || 'unknown'}`));
          }
        };
        chrome.downloads.onChanged.addListener(listener);

        // Timeout fallback
        setTimeout(() => {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(downloadId);
        }, 60000);
      }
    );
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function sanitizeFilename(filename, width, format = null) {
  let name = filename.replace(/[/\\:*?"<>|]/g, '_');
  const dotIdx = name.lastIndexOf('.');
  const base   = dotIdx !== -1 ? name.substring(0, dotIdx) : name;
  const ext    = format ? `.${format}` : '.jpg';
  return `${base}_w${width}${ext}`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
