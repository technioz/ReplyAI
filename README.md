# Quirkly - Premium AI Reply Generator for X (Twitter)

## Overview

Quirkly is a premium Chrome extension that generates intelligent, contextual replies for X (Twitter) posts using advanced AI. With multiple tone options and a sleek, professional interface, Quirkly helps you engage more effectively on social media.

## ✨ Features

### 🔐 **Secure Authentication**
- API key-based authentication system
- Secure user data storage
- Dashboard integration for key management

### 🎨 **Multiple AI Tones**
- **Professional** 💼 - Business-appropriate responses
- **Casual** 😊 - Relaxed, friendly conversations  
- **Humorous** 😄 - Witty and entertaining replies
- **Empathetic** ❤️ - Understanding and supportive responses
- **Analytical** 🧠 - Data-driven, logical responses
- **Enthusiastic** 🔥 - Energetic and passionate replies

### 🚀 **Premium Design**
- Dark theme matching modern UI standards
- Smooth animations and transitions
- Professional gradient effects
- Responsive layout

### 📊 **Usage Analytics**
- Real-time API call tracking
- Monthly usage limits
- Subscription tier management

## 🛠 Installation

1. **Download the Extension**
   - Clone this repository or download the ZIP file
   - Extract to your desired location

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" and select the extension folder

3. **Get Your API Key**
   - Visit [Quirkly Dashboard](https://quirkly.technioz.com)
   - Sign up for an account
   - Generate your API key from the dashboard

4. **Authenticate**
   - Click the Quirkly extension icon
   - Enter your API key
   - Start generating replies!

## 🔧 Configuration

### Environment Setup
The extension automatically detects whether it's running in development or production:

**Development Mode** (unpacked extension):
- Auth: `https://ai.technioz.com/webhook-test/quirkly-auth`
- Reply: `https://ai.technioz.com/webhook-test/replyai-webhook`
- Dashboard: `http://localhost:3000`

**Production Mode** (Chrome Web Store):
- Auth: `https://ai.technioz.com/webhook/quirkly-auth`
- Reply: `https://ai.technioz.com/webhook/replyai-webhook`
- Dashboard: `https://quirkly.technioz.com`

### Required Setup
1. **API Key**: Obtain from the Quirkly dashboard
2. **n8n Webhooks**: Set up both auth and reply endpoints
3. **Permissions**: The extension requires access to X/Twitter domains

### Settings
- **Enable/Disable**: Toggle extension functionality
- **Tone Selection**: Preview available AI tones
- **Usage Stats**: Monitor your API call usage

### Development Configuration
The extension uses `config.js` for environment management:
- Automatically detects development vs production
- Switches endpoints based on environment
- Provides debug information in console

## 🎯 How to Use

1. **Navigate to X (Twitter)**
2. **Find a post you want to reply to**
3. **Click the reply button** (standard X interface)
4. **Look for Quirkly buttons** above the text area
5. **Select your preferred tone** (Professional, Casual, etc.)
6. **Wait for AI generation** (usually 2-3 seconds)
7. **Review and send** the generated reply

## 🏗 Technical Architecture

### Files Structure
```
XBot/
├── extension/             # Chrome extension (source)
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── background.js
│   ├── styles.css
│   ├── config.js
│   ├── profileExtractor.js
│   ├── env-manager.js
│   ├── extension.env
│   └── icons/
├── build-extension.sh     # Package extension: ./build-extension.sh development|production
└── dashboard/             # Next.js app
```

### Authentication Flow
1. User enters API key in popup
2. Extension validates key with server
3. User data stored securely in Chrome storage
4. Content script checks authentication before showing buttons
5. All API requests include authentication headers

### API Integration
- **Endpoint**: `https://ai.technioz.com/webhook/replyai-webhook`
- **Method**: POST
- **Authentication**: Bearer token (API key)
- **Payload**: Original post content, selected tone, user data

### Request Format
```json
{
  "tone": "professional",
  "originalPost": "Which language is best to start DSA?",
  "apiKey": "user_api_key_here",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "subscriptionTier": "free"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "source": "chrome-extension"
}
```

### Response Format
```json
{
  "reply": "For DSA, I'd recommend starting with Python. It's beginner-friendly with clean syntax and extensive libraries.",
  "success": true,
  "tone": "professional",
  "user": {
    "apiCallsUsed": 46,
    "apiCallsLimit": 100
  }
}
```

## 🔒 Security & Privacy

- **No Data Logging**: We don't store your posts or generated replies
- **Secure API Keys**: Stored locally in Chrome's encrypted storage
- **HTTPS Only**: All communications use secure protocols
- **Minimal Permissions**: Only requests necessary browser permissions

## 🐛 Troubleshooting

### Common Issues

**Extension not showing buttons:**
- Verify you're authenticated with a valid API key
- Check that the extension is enabled in settings
- Refresh the X/Twitter page

**Authentication failing:**
- Ensure API key is copied correctly from dashboard
- Check your internet connection
- Verify your subscription is active

**Generated replies not appearing:**
- Try refreshing the page
- Check browser console for error messages
- Ensure you have remaining API calls in your quota

### Debug Mode
Enable Chrome Developer Tools and check the Console tab for detailed logs:
- Extension logs are prefixed with "Quirkly:"
- Network requests show API communication
- Storage tab shows saved authentication data

## 🚀 Production Deployment

### Pre-deployment Checklist
- [x] API keys configured correctly
- [x] n8n webhook endpoint accessible
- [x] All permissions properly set
- [x] Icons and branding updated
- [x] Error handling tested
- [x] Authentication flow verified
- [x] Premium design implemented
- [x] Responsive layout tested

### Chrome Web Store Submission
1. Update `extension/manifest.json` version
2. Test on multiple Chrome versions
3. Prepare store assets (screenshots, descriptions)
4. Submit for review

## 🎨 Design Features

- **Premium Dark Theme**: Matches dashboard design system
- **Gradient Effects**: Professional brand colors (#6D5EF8, #22D3EE)
- **Smooth Animations**: Hover effects, loading states, notifications
- **Plus Jakarta Sans Font**: Professional typography
- **Responsive Grid**: Adapts to different screen sizes
- **Accessibility**: Full keyboard and screen reader support

## 🛣 Roadmap

- [ ] Support for additional social platforms
- [ ] Custom tone creation
- [ ] Reply templates
- [ ] Bulk reply generation
- [ ] Advanced analytics dashboard

## 📞 Support

- **Dashboard**: [https://quirkly.technioz.com](https://quirkly.technioz.com)
- **Documentation**: Available in dashboard
- **Issues**: Report via GitHub or dashboard support

## 📄 License

Copyright © 2024 Technioz. All rights reserved.

---

**Made with ❤️ by Technioz**