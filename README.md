# Freepik Image Downloader

A Chrome extension that lets you download Freepik images with one click — now with **Dark Mode** and a **Bulk Downloader**.

## What's New in v2.0

- 🌙 **Dark Mode** — Toggle between light and dark themes for a comfortable experience
- 📦 **Bulk Downloader** — Download multiple images at once from any Freepik page
- 🗜️ **Format & Compression** — Choose between WEBP and JPG, and adjust compression levels
- 🗂️ **ZIP Export** — Optionally bundle bulk downloads into a single convenient ZIP file
- ⚡ Improved performance and stability

## Features

- 🖼️ Download images directly from Freepik
- 📐 Specify custom image widths
- 🗜️ Choose output format (WEBP/JPG) and compression level
- 🌙 Dark mode support
- 📦 Bulk download multiple images at once
- 🗂️ Option to bundle bulk downloads into a single ZIP file
- ⚡ One-click downloading
- 🛡️ Secure and easy to use

## Installation

### Method 1: Install from GitHub (Recommended for Development)

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/mamoon-mmc/fp-downloader
   cd fp-downloader
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in your Chrome browser
   - Or navigate to: **Menu** → **More Tools** → **Extensions**

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the Extension**
   - Click **Load unpacked**
   - Select the `freepik-downloader-v2` folder from your computer
   - The extension will now appear in your extensions list

5. **Verify Installation**
   - You should see the Freepik Image Downloader icon in your Chrome toolbar
   - Pin it for easy access

### Method 2: Install from Chrome Web Store
Currently, this extension is not available on the Chrome Web Store. Follow Method 1 above.

## Usage

### Single Download
1. **Open the Extension** — Click the extension icon in your Chrome toolbar
2. **Specify Image Width** — Enter your desired image width in pixels
3. **Download** — Click the download button; your image saves to your Downloads folder

### Bulk Download
1. **Open the Extension** — Click the extension icon in your Chrome toolbar
2. **Format & Settings** — Adjust your desired width, format (WEBP/JPG), and compression level
3. **Switch to Bulk Mode** — Click the **Bulk Select Mode** button
4. **Select Images** — Click on the images you want to download on the page
5. **ZIP Option** — Toggle **Download as ZIP** if you want them bundled into one file
6. **Download All** — Click **Download Selected** in the floating bar on the page

### Dark Mode
- Click the **🌙 / ☀️** toggle in the extension popup to switch between dark and light themes
- Your preference is saved automatically across sessions

## Project Structure

```
freepik-downloader-v2/
├── manifest.json          # Extension configuration
├── background.js          # Background service worker
├── content.js             # Content script for page interaction
├── popup.html             # Popup interface
├── popup.js               # Popup logic
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## Permissions

This extension uses the following permissions:

- **activeTab**: Access to the current tab information
- **scripting**: Execute scripts in web pages
- **downloads**: Download and manage files
- **storage**: Store user preferences (including dark mode setting)
- **host_permissions**: Access all websites to detect and download images

## Troubleshooting

### Extension doesn't appear after installation
- Make sure you're in the correct folder when selecting "Load unpacked"
- Verify Developer mode is enabled
- Refresh the extensions page (Ctrl+R)

### Downloads not working
- Check your browser's download settings
- Ensure pop-ups are not blocked for Freepik
- Verify you have write permissions to your Downloads folder

### Bulk download not picking up images
- Make sure you're on a Freepik browse/search page (not a single asset page)
- Scroll down to load more images before triggering bulk download
- Try refreshing the page and re-opening the extension

### Images not downloading properly
- Make sure you're on a Freepik page
- Clear your browser cache
- Try disabling other extensions that might interfere

## Development

To modify the extension:

1. Make your changes to the relevant files
2. Reload the extension: Visit `chrome://extensions/` and click the reload button
3. Test your changes

## Changelog

### v2.0.0 — 2026
- ✨ Added **Dark Mode** with persistent preference storage
- ✨ Added **Bulk Downloader** to download multiple images at once
- ✨ Added **Format Selection** (WEBP/JPG) and **Compression Level** controls
- ✨ Added **Download as ZIP** option for bulk downloads
- 🐛 Various bug fixes and performance improvements

### v1.0.0 — 2026
- 🎉 Initial release
- Single image download with custom width support

## License

This project is provided as-is for personal use.

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the GitHub issues page
3. Ensure you have the latest version (v2.0.0)

---

**Happy downloading! 🎉**
