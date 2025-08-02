# ReplyAI Installation Guide

## Prerequisites

- Google Chrome browser
- n8n instance (self-hosted or cloud)
- AI service API key (OpenAI, Claude, etc.)

## Step 1: Set up n8n Workflow

### Option A: Import the provided workflow

1. Open your n8n instance
2. Click "Import from file"
3. Select the `n8n-workflow-example.json` file from this project
4. Configure your AI service credentials
5. Activate the workflow
6. Copy the webhook URL

### Option B: Create workflow manually

1. Create a new workflow in n8n
2. Add a **Webhook Trigger** node:
   - Method: POST
   - Path: `xbot-webhook`
   - Response Mode: "Respond to Webhook"

3. Add a **Code** node to prepare the AI prompt:
   ```javascript
   const tone = $input.first().json.tone;
   const originalPost = $input.first().json.originalPost;
   
   const prompt = `Generate a ${tone} reply to: "${originalPost}"
   Keep it under 280 characters and make it engaging.`;
   
   return { prompt, tone, originalPost };
   ```

4. Add an **AI Service** node (OpenAI, Claude, etc.):
   - Use the prompt from the previous node
   - Set appropriate model and parameters

5. Add a **Respond to Webhook** node:
   ```json
   {
     "reply": "{{ $json.choices[0].message.content }}",
     "success": true,
     "tone": "{{ $('Code').item.json.tone }}"
   }
   ```

6. Connect all nodes and activate the workflow
7. Copy the webhook URL

## Step 2: Test Your Webhook

1. Open `test-webhook.html` in your browser
2. Enter your n8n webhook URL
3. Test with different tones and posts
4. Verify you get proper responses

## Step 3: Install Chrome Extension

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the ReplyAI folder
6. The extension should appear in your extensions list

## Step 4: Configure Extension

1. Click the XBot extension icon in your Chrome toolbar
2. Enter your n8n webhook URL
3. Toggle the extension on
4. Click "Save Settings"

## Step 5: Test on X

1. Go to any X post
2. Click "Reply"
3. You should see tone buttons below the textbox
4. Click any tone to generate a reply
5. The reply should appear in the textbox

## Troubleshooting

### Extension not loading
- Check that all files are in the correct directory
- Verify manifest.json is valid
- Check Chrome's extension page for errors

### No tone buttons appearing
- Make sure you're on twitter.com or x.com
- Check if the extension is enabled
- Verify webhook URL is configured
- Try refreshing the page

### Webhook not responding
- Check n8n workflow is active
- Verify webhook URL is correct
- Test with the test-webhook.html file
- Check n8n logs for errors

### AI not generating replies
- Verify your AI service credentials
- Check API quotas and limits
- Test the AI service directly
- Review n8n workflow logs

## Security Notes

- Keep your AI API keys secure
- Consider adding authentication to your webhook
- Monitor your n8n logs for suspicious activity
- Use HTTPS for your n8n instance in production

## Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the main README.md
3. Test your webhook with the provided test file
4. Check browser console for errors 