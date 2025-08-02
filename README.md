# ReplyAI - AI Reply Generator for X (Twitter)

ReplyAI is a Chrome extension that generates AI-powered replies to X posts with different tones. It integrates seamlessly with X's interface and sends requests to an n8n workflow for AI processing.

## Features

- 🎯 6 Different Tones: Professional, Casual, Humorous, Empathetic, Analytical, and Enthusiastic
- ⚡ Instant Generation: One-click AI reply generation
- 🔒 Privacy First: Only sends necessary data to your n8n workflow
- 🎨 Seamless Integration: Works directly within X's reply interface
- 📱 Responsive Design: Works on desktop and mobile X interfaces

## Installation

### 1. Install the Chrome Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the ReplyAI folder
5. The extension will appear in your extensions list

### 2. Set up n8n Workflow

You'll need to create an n8n workflow to handle the AI processing. Here's what the workflow should do:

#### Workflow Structure

1. Webhook Trigger: Receives POST requests from the extension
2. AI Processing Node: Processes the request and generates replies
3. Response Node: Returns the generated reply

#### Expected Request Format

The extension sends POST requests with this JSON structure:

```json
{
  "tone": "professional",
  "originalPost": "Which language is best to start DSA?",
  "userContext": {
    "username": "",
    "displayName": "",
    "followers": "",
    "following": "",
    "currentUrl": "https://twitter.com/...",
    "pageTitle": "X"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "extensionVersion": "1.0.0"
}
```

#### Expected Response Format

Your n8n workflow should return a JSON response like this:

```json
{
  "reply": "For DSA, I'd recommend starting with Python. It's beginner-friendly with clean syntax and extensive libraries. Once comfortable, you can explore C++ for deeper understanding of memory management.",
  "success": true,
  "tone": "professional"
}
```

#### Sample n8n Workflow

Here's a basic n8n workflow structure you can use:

1. Webhook Node:
   - Method: POST
   - Path: `/xbot-webhook`
   - Authentication: Optional (recommended for production)

2. AI Service Node (e.g., OpenAI, Claude, etc.):
   - Use the `tone` and `originalPost` from the webhook
   - Generate a reply based on the specified tone
   - Keep replies under 280 characters for X

3. Respond to Webhook Node:
   - Return the generated reply in the expected format

#### Example AI Prompt Template

```
You are an AI assistant helping users generate replies to X (Twitter) posts. 

Original Post: {{$json.originalPost}}

Generate a reply in a {{$json.tone}} tone. The reply should:
- Be engaging and relevant to the original post
- Match the specified tone ({{$json.tone}})
- Be under 280 characters
- Be natural and conversational
- Add value to the conversation

Tone Guidelines:
- Professional: Formal, business-like, authoritative
- Casual: Friendly, relaxed, conversational
- Humorous: Funny, witty, light-hearted
- Empathetic: Understanding, supportive, caring
- Analytical: Logical, data-driven, thoughtful
- Enthusiastic: Excited, positive, energetic

Reply:
```

## Configuration

### 1. Get Your n8n Webhook URL

1. Set up your n8n workflow as described above
2. Deploy the workflow
3. Copy the webhook URL (e.g., `https://your-n8n-instance.com/webhook/xbot`)

### 2. Configure the Extension

1. Click the XBot extension icon in your Chrome toolbar
2. Enter your n8n webhook URL
3. Toggle the extension on/off as needed
4. Click "Save Settings"

## Usage

1. Navigate to any X post you want to reply to
2. Click the "Reply" button
3. You'll see tone buttons appear below the reply textbox
4. Click any tone button to generate an AI reply
5. The generated reply will automatically fill the textbox
6. Edit the reply if needed and post as usual

## Supported Tones

- Professional: Formal, business-like responses
- Casual: Friendly, relaxed conversations
- Humorous: Funny and witty replies
- Empathetic: Understanding and supportive
- Analytical: Logical and data-driven
- Enthusiastic: Excited and positive

## Security Considerations

- The extension only sends the original post content and tone preference to your n8n workflow
- No personal data or credentials are transmitted
- Consider adding authentication to your n8n webhook for production use
- Monitor your n8n workflow logs for any suspicious activity

## Troubleshooting

### Extension Not Working

1. Check if the extension is enabled in Chrome
2. Verify your n8n webhook URL is correct
3. Ensure your n8n workflow is running and accessible
4. Check the browser console for any error messages

### No Tone Buttons Appearing

1. Make sure you're on a valid X page (twitter.com or x.com)
2. Try refreshing the page
3. Check if the extension is enabled in settings
4. Verify the webhook URL is configured

### AI Replies Not Generating

1. Check your n8n workflow logs
2. Verify the webhook URL is accessible
3. Test the webhook manually with a tool like Postman
4. Ensure your AI service is working properly

## Development

### Project Structure

```
ReplyAI/
├── manifest.json          # Extension manifest
├── content.js            # Main content script
├── popup.html            # Settings popup
├── popup.js              # Popup functionality
├── background.js         # Background service worker
├── styles.css            # Extension styles
├── welcome.html          # Welcome page
├── icons/                # Extension icons
└── README.md             # This file
```

### Customization

You can customize the extension by:

1. Adding New Tones: Edit `content.js` and `styles.css`
2. Changing Colors: Modify the CSS variables in `styles.css`
3. Adding Features: Extend the `XBot` class in `content.js`
4. Modifying UI: Update the HTML and CSS files

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the n8n workflow setup
3. Open an issue on GitHub
4. Check the browser console for error messages

## Changelog

### v1.0.0
- Initial release
- 6 tone options
- n8n webhook integration
- Chrome extension with popup settings
- Welcome page for new users 