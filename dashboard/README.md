# Quirkly Chrome Extension

A Chrome extension that integrates with Quirkly AI to generate intelligent replies for X (Twitter).

## Features

- **API Key Validation**: Securely validate your Quirkly API key
- **Reply Generation**: Generate AI-powered replies with different tones
- **Twitter Integration**: Add Quirkly buttons directly to tweets
- **Clipboard Integration**: Automatically copy generated replies
- **Multiple Tones**: Professional, casual, humorous, empathetic, analytical, enthusiastic

## Installation

### 1. Load Extension in Chrome

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dashboard` folder containing these files

### 2. Get Your API Key

1. Go to [Quirkly Dashboard](http://localhost:3000/dashboard)
2. Generate a new API key
3. Copy the API key (it will only be shown once!)

### 3. Configure Extension

1. Click the Quirkly extension icon in your toolbar
2. Enter your API key
3. Click "Validate"
4. Start generating replies!

## Usage

### Popup Interface

- **API Key**: Enter and validate your Quirkly API key
- **Tone Selection**: Choose the tone for your reply
- **Prompt Input**: Describe what you want to reply to
- **Generate**: Create AI-powered replies

### Twitter Integration

- **Quirkly Button**: Appears on every tweet
- **One-Click Reply**: Click to generate a reply to any tweet
- **Auto-Copy**: Generated replies are automatically copied to clipboard
- **Smart Integration**: Opens Twitter's reply compose box

## File Structure

```
dashboard/
├── manifest.json          # Extension configuration
├── background.js          # Background script for API requests
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── content.js            # Twitter page integration
└── icons/                # Extension icons (create this folder)
    ├── icon16.png        # 16x16 icon
    ├── icon32.png        # 32x32 icon
    ├── icon48.png        # 48x48 icon
    └── icon128.png       # 128x128 icon
```

## API Endpoints

The extension communicates with your local Quirkly dashboard:

- **Validation**: `http://127.0.0.1:3000/api/auth/validate`
- **Reply Generation**: `http://127.0.0.1:3000/api/reply/generate`
- **Test**: `http://127.0.0.1:3000/api/test`

## Troubleshooting

### "Unable to connect to authentication server"

1. **Check Dashboard**: Ensure your Quirkly dashboard is running on port 3000
2. **API Key**: Verify your API key is correct
3. **Network**: Check if localhost/127.0.0.1 is accessible
4. **Extension**: Reload the extension after making changes

### Extension Not Working on Twitter

1. **Permissions**: Check if the extension has access to Twitter
2. **Reload**: Refresh the Twitter page
3. **Console**: Check browser console for errors

### API Key Validation Fails

1. **Dashboard Status**: Ensure dashboard is running and accessible
2. **API Key Format**: Verify the key starts with `qk_`
3. **Database**: Check if MongoDB is running
4. **Logs**: Check dashboard console for errors

## Development

### Making Changes

1. **Edit Files**: Modify the JavaScript, HTML, or CSS files
2. **Reload Extension**: Go to `chrome://extensions/` and click reload
3. **Test**: Refresh Twitter page and test functionality

### Debugging

1. **Popup Console**: Right-click extension icon → Inspect
2. **Content Script**: Check Twitter page console
3. **Background Script**: Go to `chrome://extensions/` → Service Worker

## Security

- API keys are stored locally in Chrome storage
- No data is sent to external servers (only your local dashboard)
- All communication uses HTTPS when available
- Background script handles all API requests securely

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Verify your dashboard is running correctly
3. Check browser console for error messages
4. Ensure all files are in the correct locations

## License

This extension is part of the Quirkly project and follows the same licensing terms.
