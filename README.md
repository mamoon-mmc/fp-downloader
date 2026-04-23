# Freepik Image Downloader

A Chrome extension that allows you to download Freepik images at specified widths with just one click.

## Features

- 🖼️ Download images directly from Freepik
- 📐 Specify custom image widths
- ⚡ One-click downloading
- 🛡️ Secure and easy to use

## Installation

### Method 1: Install from GitHub (Recommended for Development)

1. **Clone or Download the Repository**
   ```bash
   git clone https://github.com/mamoon-mmc/fp-downloader
   cd freepik-downloader
   ```

2. **Open Chrome Extensions Page**
   - Go to `chrome://extensions/` in your Chrome browser
   - Or navigate to: **Menu** → **More Tools** → **Extensions**

3. **Enable Developer Mode**
   - Toggle the **Developer mode** switch in the top-right corner

4. **Load the Extension**
   - Click **Load unpacked**
   - Select the `freepik-downloader` folder from your computer
   - The extension will now appear in your extensions list

5. **Verify Installation**
   - You should see the Freepik Image Downloader icon in your Chrome toolbar
   - Pin it for easy access

### Method 2: Install from Chrome Web Store
Currently, this extension is not available on the Chrome Web Store. Follow Method 1 above.

## Usage

1. **Open the Extension**
   - Click the extension icon in your Chrome toolbar
   - A popup will appear with download options

2. **Specify Image Width**
   - Enter your desired image width in pixels
   - The extension will adjust the download accordingly

3. **Download**
   - Click the download button
   - Your image will be saved to your default Downloads folder

## Project Structure

```
freepik-downloader/
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
- **storage**: Store user preferences
- **host_permissions**: Access all websites to detect and download images

## Troubleshooting

### Extension doesn't appear after installation
- Make sure you're in the correct folder when selecting "Load unpacked"
- Verify Developer mode is enabled
- Refresh the extensions page (Ctrl+R or Cmd+R)

### Downloads not working
- Check your browser's download settings
- Ensure pop-ups are not blocked for Freepik
- Verify you have write permissions to your Downloads folder

### Images not downloading properly
- Make sure you're on a Freepik page
- Clear your browser cache
- Try disabling other extensions that might interfere

## Development

To modify the extension:

1. Make your changes to the relevant files
2. Reload the extension: Visit `chrome://extensions/` and click the reload button
3. Test your changes

## Version

- **Current Version**: 1.0.0
- **Last Updated**: 2026

## License

This project is provided as-is for personal use.

## Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the GitHub issues page
3. Ensure you have the latest version

---

**Happy downloading! 🎉**
