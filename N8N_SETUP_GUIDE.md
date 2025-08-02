# ReplyAI Production n8n Workflow Setup Guide

This guide will help you set up a production-ready n8n workflow for ReplyAI that handles webhook requests, processes them with AI, and returns responses to the Chrome extension.

## Prerequisites

- n8n instance (self-hosted or cloud)
- OpenAI API key (or other AI service)
- Basic understanding of n8n workflows

## Step 1: Import the Production Workflow

1. **Open your n8n instance**
2. **Click "Import from file"**
3. **Select `n8n-workflow-production.json`**
4. **The workflow will be imported with all nodes configured**

## Step 2: Configure OpenAI Credentials

1. **Go to Settings → Credentials**
2. **Click "Add Credential"**
3. **Select "OpenAI"**
4. **Enter your OpenAI API key**
5. **Name it "OpenAI Account"**
6. **Save the credential**

## Step 3: Update the AI Generation Node

1. **Open the imported workflow**
2. **Click on the "AI Generation" node**
3. **In the "Authentication" field, select your OpenAI credential**
4. **Verify the model is set to "gpt-3.5-turbo"**
5. **Save the node**

## Step 4: Activate the Workflow

1. **Click the "Activate" toggle in the top right**
2. **The workflow is now live and ready to receive requests**

## Step 5: Get Your Webhook URL

1. **Click on the "Webhook Trigger" node**
2. **Copy the webhook URL** (e.g., `https://your-n8n-instance.com/webhook/replyai-webhook`)
3. **This is the URL you'll use in the Chrome extension**

## Workflow Overview

### Node 1: Webhook Trigger
- **Purpose**: Receives POST requests from the Chrome extension
- **Path**: `/replyai-webhook`
- **Method**: POST
- **No authentication required** (for simplicity)

### Node 2: Validate & Prepare
- **Purpose**: Validates incoming data and prepares AI prompt
- **Validates**:
  - Required fields (tone, originalPost)
  - Valid tone values
  - Data sanitization
- **Creates**:
  - Tone-specific guidelines
  - Structured AI prompt
  - Request ID for tracking

### Node 3: AI Generation
- **Purpose**: Generates AI reply using OpenAI
- **Model**: GPT-3.5-turbo
- **Parameters**:
  - Max tokens: 150
  - Temperature: 0.7 (balanced creativity)
  - Top P: 0.9
  - Frequency penalty: 0.1
  - Presence penalty: 0.1

### Node 4: Process Response
- **Purpose**: Processes AI response and validates output
- **Validates**:
  - Response format
  - Character limit (280 chars)
  - Minimum length
- **Adds**:
  - Metadata (timestamp, request ID, character count)
  - Logging for monitoring

### Node 5: Success Check
- **Purpose**: Routes to success or error response
- **Checks**: If processing was successful

### Node 6: Success Response
- **Purpose**: Returns successful response to extension
- **Headers**: CORS enabled for browser compatibility

### Node 7: Error Handler
- **Purpose**: Handles and formats errors
- **Logs**: Errors for debugging
- **Returns**: Structured error response

### Node 8: Error Response
- **Purpose**: Returns error response to extension
- **Headers**: CORS enabled

## Request Format

The workflow expects POST requests with this JSON structure:

```json
{
  "tone": "professional",
  "originalPost": "Which language is best to start DSA?",
  "userContext": {
    "username": "",
    "displayName": "",
    "currentUrl": "https://twitter.com/...",
    "pageTitle": "X"
  },
  "timestamp": "2025-01-27T10:30:00.000Z",
  "extensionVersion": "1.0.0"
}
```

## Response Format

### Success Response:
```json
{
  "reply": "For DSA, I'd recommend starting with Python. It's beginner-friendly with clean syntax and extensive libraries.",
  "success": true,
  "tone": "professional",
  "originalPost": "Which language is best to start DSA?",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "requestId": "req_1706365800000_abc123",
  "characterCount": 108,
  "model": "gpt-3.5-turbo"
}
```

### Error Response:
```json
{
  "success": false,
  "error": "Missing required fields: tone and originalPost",
  "errorType": "ValidationError",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "requestId": "req_1706365800000_abc123",
  "tone": "unknown",
  "originalPost": ""
}
```

## Testing the Workflow

### Using the Test Page
1. **Open `test-webhook.html` in your browser**
2. **Enter your webhook URL**
3. **Test with different tones and posts**
4. **Verify responses are correct**

### Using curl
```bash
curl -X POST https://your-n8n-instance.com/webhook/replyai-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "tone": "professional",
    "originalPost": "Which language is best to start DSA?",
    "userContext": {},
    "timestamp": "2025-01-27T10:30:00.000Z",
    "extensionVersion": "1.0.0"
  }'
```

## Production Considerations

### Security
- **Add authentication** to the webhook for production use
- **Rate limiting** to prevent abuse
- **Input validation** (already implemented)
- **API key security** (store securely)

### Monitoring
- **Check n8n logs** regularly
- **Monitor API usage** and costs
- **Set up alerts** for errors
- **Track response times**

### Performance
- **Response time**: Typically 2-5 seconds
- **Concurrent requests**: Depends on your n8n instance
- **API limits**: Monitor OpenAI rate limits

### Scaling
- **Multiple n8n instances** for high load
- **Load balancing** for webhook endpoints
- **Caching** for similar requests (optional)

## Troubleshooting

### Common Issues

1. **Webhook not responding**
   - Check if workflow is activated
   - Verify webhook URL is correct
   - Check n8n logs for errors

2. **AI not generating replies**
   - Verify OpenAI credentials
   - Check API key has sufficient credits
   - Monitor OpenAI rate limits

3. **CORS errors**
   - Headers are already configured
   - Check if your n8n instance supports CORS

4. **Invalid responses**
   - Check the validation logic
   - Verify request format
   - Review error logs

### Debug Mode
- **Enable debug logging** in n8n settings
- **Check execution logs** for each node
- **Test individual nodes** if needed

## Customization Options

### Different AI Models
- **GPT-4**: Change model in AI Generation node
- **Claude**: Replace OpenAI node with Anthropic node
- **Local models**: Use HTTP Request node to call local AI

### Additional Features
- **Content filtering**: Add validation for inappropriate content
- **Language detection**: Auto-detect post language
- **Sentiment analysis**: Analyze post sentiment
- **User preferences**: Store user tone preferences

### Enhanced Error Handling
- **Retry logic**: Add retry for failed AI calls
- **Fallback responses**: Provide default replies on errors
- **Detailed logging**: Enhanced monitoring and analytics

## Support

If you encounter issues:
1. **Check the troubleshooting section**
2. **Review n8n documentation**
3. **Test with the provided test page**
4. **Check browser console for errors**
5. **Monitor n8n execution logs** 