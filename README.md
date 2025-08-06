# ReplyAI - AI Reply Generator for X (Twitter)

ReplyAI is a production-ready Chrome extension that generates human-like AI replies to X posts with different tones. It integrates seamlessly with X's interface and sends requests to an n8n workflow for AI processing.

## ✨ Features

- 🎯 **6 Different Tones**: Professional, Casual, Humorous, Empathetic, Analytical, and Enthusiastic
- ⚡ **Instant Generation**: One-click AI reply generation with beautiful UI
- 🔒 **Privacy First**: Only sends necessary data to your n8n workflow
- 🎨 **Modern Design**: Professional UI with noise patterns and responsive design
- 🌙 **Dark Mode**: Automatic dark mode detection and support
- 📱 **Responsive**: Works perfectly on all screen sizes
- ♿ **Accessible**: Full keyboard navigation and screen reader support

## 🚀 Quick Setup

1. **Install Extension**: Load as unpacked extension in Chrome
2. **Configure n8n**: Set up webhook endpoint in extension settings
3. **Start Using**: Click tone buttons on X reply interface

## 🔧 n8n Workflow Setup

### Request Format
```json
{
  "tone": "professional",
  "originalPost": "Which language is best to start DSA?",
  "userContext": { "username": "", "displayName": "" },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "extensionVersion": "1.0.0"
}
```

### Response Format
```json
{
  "reply": "For DSA, I'd recommend starting with Python. It's beginner-friendly with clean syntax and extensive libraries.",
  "success": true,
  "tone": "professional",
  "characterCount": 108,
  "model": "claude-sonnet-4-20250514"
}
```

### Workflow Structure
1. **Webhook Trigger**: Receives POST requests from extension
2. **Validate & Prepare**: Validates input and prepares AI prompt
3. **AI Processing**: Uses Claude 4 Sonnet for natural, human-like responses
4. **Process Response**: Validates and formats the reply
5. **Success Response**: Returns JSON with generated reply

## 🎨 Design Features

- **Modern UI**: Clean, professional design with gradient buttons
- **Noise Patterns**: Subtle animated background patterns
- **Responsive Grid**: Adapts to different screen sizes
- **Smooth Animations**: Hover effects and transitions
- **Dark Mode**: Automatic theme detection
- **Accessibility**: Full keyboard and screen reader support

## 📖 Usage

1. Navigate to any X post you want to reply to
2. Click the "Reply" button
3. Click any tone button to generate an AI reply
4. The generated reply will automatically fill the textbox
5. Edit if needed and post as usual

## 🧪 Testing

Run the integration test to verify your setup:

```bash
node test-integration.js <your-webhook-url>
```

## 🔍 Troubleshooting

- **No tone buttons**: Check if extension is enabled and webhook URL is configured
- **Replies not appearing**: Verify n8n workflow is running and returning correct format
- **Extension not working**: Check browser console for errors
- **UI issues**: Ensure you're using the latest version with modern CSS

## 📁 Project Structure

```
ReplyAI/
├── manifest.json          # Extension manifest
├── content.js            # Main content script (enhanced)
├── popup.html            # Settings popup (modern UI)
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── styles.css            # Modern CSS with design system
├── icons/                # Extension icons
├── test-integration.js   # Integration test suite
├── systemPrompt.xml      # Enhanced AI system prompt
├── X_reply_generator.json # n8n workflow with notes
└── README.md             # Documentation
```

## 🎯 Production Ready Features

- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Performance**: Optimized for speed and responsiveness
- ✅ **Security**: Input validation and sanitization
- ✅ **Accessibility**: WCAG compliant design
- ✅ **Testing**: Integration test suite included
- ✅ **Documentation**: Complete setup and usage guides
- ✅ **Modern Design**: Professional UI with design system
- ✅ **Responsive**: Works on all devices and screen sizes

## 📄 License

MIT License 