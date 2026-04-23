chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'downloadImages') {
    handleDownloads(message.images, message.width, message.format, message.compression)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ success: false, error: err.message }));

    // Return true to keep the message channel open for async response
    return true;
  }
});

async function handleDownloads(images, width, format = 'webp', compression = 80) {
  if (!images || images.length === 0) {
    return { success: false, error: 'No images to download.' };
  }

  let downloadCount = 0;
  const errors = [];

  for (const imgData of images) {
    try {
      await downloadAndConvertImage(imgData.url, imgData.filename, width, format, compression);
      downloadCount++;
      // Small delay between downloads to avoid overwhelming the browser
      await sleep(150);
    } catch (err) {
      errors.push({ url: imgData.url, error: err.message });
    }
  }

  if (downloadCount === 0) {
    return { success: false, error: `All downloads failed. Errors: ${errors.map(e => e.error).join(', ')}` };
  }

  return { success: true, count: downloadCount, errors };
}

function downloadImage(url, filename, width) {
  return new Promise((resolve, reject) => {
    // Sanitize filename
    const safeName = sanitizeFilename(filename, width);

    chrome.downloads.download(
      {
        url: url,
        filename: safeName,
        conflictAction: 'uniquify',
        saveAs: true
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (downloadId === undefined) {
          reject(new Error('Download failed to start.'));
          return;
        }
        // Monitor download completion
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

        // Timeout fallback — resolve after 30s even if we miss the event
        setTimeout(() => {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(downloadId);
        }, 30000);
      }
    );
  });
}

async function downloadAndConvertImage(url, filename, width, format, compression) {
  try {
    // Fetch the image as a blob
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const blob = await response.blob();
    
    // Convert image if needed
    const convertedBlob = await convertImage(blob, format, compression);
    
    // Convert blob to data URL for download
    const dataUrl = await blobToDataUrl(convertedBlob);
    const safeName = sanitizeFilename(filename, width, format);
    
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          url: dataUrl,
          filename: safeName,
          conflictAction: 'uniquify',
          saveAs: true
        },
        (downloadId) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          if (downloadId === undefined) {
            reject(new Error('Download failed to start.'));
            return;
          }
          
          // Monitor download completion
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

          // Timeout fallback — resolve after 30s
          setTimeout(() => {
            chrome.downloads.onChanged.removeListener(listener);
            resolve(downloadId);
          }, 30000);
        }
      );
    });
  } catch (err) {
    throw new Error(`Image conversion failed: ${err.message}`);
  }
}

async function convertImage(blob, format, compression) {
  return new Promise(async (resolve, reject) => {
    try {
      // Create an image bitmap from the blob
      const img = await createImageBitmap(blob);
      
      // Use OffscreenCanvas for the service worker
      const canvas = new OffscreenCanvas(img.width, img.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      // Convert compression percentage (0-100) to quality (0-1)
      const quality = compression / 100;
      
      // Determine the MIME type
      const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/webp';
      
      const convertedBlob = await canvas.convertToBlob({
        type: mimeType,
        quality: quality
      });
      
      resolve(convertedBlob);
    } catch (err) {
      reject(new Error(`Failed to convert image: ${err.message}`));
    }
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

function sanitizeFilename(filename, width, format = null) {
  // Remove any path separators for safety
  let name = filename.replace(/[/\\:*?"<>|]/g, '_');

  // Remove existing extension
  const dotIdx = name.lastIndexOf('.');
  let base = name;
  
  if (dotIdx !== -1) {
    base = name.substring(0, dotIdx);
  }

  // Add width and format
  const ext = format ? `.${format}` : '.jpg';
  name = `${base}_w${width}${ext}`;

  // Return just the sanitized filename — Chrome will save to wherever the user last chose
  return name;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
