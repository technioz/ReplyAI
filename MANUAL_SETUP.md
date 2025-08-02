# ReplyAI n8n Workflow - Manual Setup Guide

If you're having trouble importing the workflow JSON, follow this manual setup guide to build the workflow from scratch.

## Step 1: Create New Workflow

1. **Open your n8n instance**
2. **Click "New Workflow"**
3. **Name it "ReplyAI Workflow"**

## Step 2: Add Webhook Trigger

1. **Click the "+" button to add a node**
2. **Search for "Webhook"**
3. **Select "Webhook" node**
4. **Configure the node:**
   - **HTTP Method**: POST
   - **Path**: `replyai-webhook`
   - **Response Mode**: "Respond to Webhook"
5. **Save the node**

## Step 3: Add Code Node (Validate & Prepare)

1. **Click the "+" button after the Webhook node**
2. **Search for "Code"**
3. **Select "Code" node**
4. **Name it "Validate & Prepare"**
5. **Paste this code:**

```javascript
// Validate and prepare the incoming request
const body = $input.first().json;

// Validate required fields
if (!body.tone || !body.originalPost) {
  throw new Error('Missing required fields: tone and originalPost');
}

// Validate tone is one of the allowed values
const allowedTones = ['professional', 'casual', 'humorous', 'empathetic', 'analytical', 'enthusiastic'];
if (!allowedTones.includes(body.tone)) {
  throw new Error(`Invalid tone: ${body.tone}. Allowed tones: ${allowedTones.join(', ')}`);
}

// Sanitize and prepare the data
const tone = body.tone;
const originalPost = body.originalPost.trim();
const userContext = body.userContext || {};
const timestamp = body.timestamp || new Date().toISOString();

// Create tone-specific guidelines
const toneGuidelines = {
  professional: 'Formal, business-like, authoritative, and respectful. Use proper grammar and professional language.',
  casual: 'Friendly, relaxed, conversational, and approachable. Use everyday language and be warm.',
  humorous: 'Funny, witty, light-hearted, and entertaining. Include clever jokes or puns when appropriate.',
  empathetic: 'Understanding, supportive, caring, and compassionate. Show genuine concern and emotional intelligence.',
  analytical: 'Logical, data-driven, thoughtful, and objective. Provide insights and analysis.',
  enthusiastic: 'Excited, positive, energetic, and motivating. Use exclamation marks and positive language.'
};

// Create the AI prompt
const prompt = `You are ReplyAI, an expert at generating engaging replies to X (Twitter) posts.

ORIGINAL POST: "${originalPost}"

TONE: ${tone}
TONE GUIDELINES: ${toneGuidelines[tone]}

TASK: Generate a reply that:
- Matches the specified ${tone} tone
- Is relevant and engaging to the original post
- Stays under 280 characters (X's character limit)
- Sounds natural and conversational
- Adds value to the conversation
- Is appropriate for social media

IMPORTANT RULES:
- Keep the reply under 280 characters
- Make it engaging and relevant
- Don't be overly promotional or spammy
- Be authentic and genuine
- Consider the context and tone of the original post

REPLY:`;

// Return prepared data
return {
  prompt: prompt,
  tone: tone,
  originalPost: originalPost,
  userContext: userContext,
  timestamp: timestamp,
  requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
};
```

6. **Save the node**

## Step 4: Add OpenAI Node

1. **Click the "+" button after the Code node**
2. **Search for "OpenAI"**
3. **Select "OpenAI" node**
4. **Name it "AI Generation"**
5. **Configure the node:**
   - **Authentication**: Select your OpenAI credential
   - **Operation**: Completion
   - **Model**: gpt-3.5-turbo
   - **Messages**: Add a new message
     - **Role**: user
     - **Content**: `={{ $json.prompt }}`
   - **Max Tokens**: 150
   - **Temperature**: 0.7
6. **Save the node**

## Step 5: Add Another Code Node (Process Response)

1. **Click the "+" button after the OpenAI node**
2. **Search for "Code"**
3. **Select "Code" node**
4. **Name it "Process Response"**
5. **Paste this code:**

```javascript
// Process AI response and prepare final output
const aiResponse = $input.first().json;
const requestData = $('Validate & Prepare').item.json;

// Extract the generated reply
let reply = '';
if (aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
  reply = aiResponse.choices[0].message.content.trim();
} else {
  throw new Error('Invalid AI response format');
}

// Validate reply length
if (reply.length > 280) {
  // Truncate if too long
  reply = reply.substring(0, 277) + '...';
}

// Validate reply is not empty
if (!reply || reply.length < 5) {
  throw new Error('Generated reply is too short or empty');
}

// Prepare success response
const response = {
  reply: reply,
  success: true,
  tone: requestData.tone,
  originalPost: requestData.originalPost,
  timestamp: new Date().toISOString(),
  requestId: requestData.requestId,
  characterCount: reply.length,
  model: 'gpt-3.5-turbo'
};

// Log for monitoring
console.log(`ReplyAI: Generated ${requestData.tone} reply for post: "${requestData.originalPost.substring(0, 50)}..."`);
console.log(`ReplyAI: Reply: "${reply}"`);

return response;
```

6. **Save the node**

## Step 6: Add Respond to Webhook Node

1. **Click the "+" button after the Code node**
2. **Search for "Respond to Webhook"**
3. **Select "Respond to Webhook" node**
4. **Name it "Success Response"**
5. **Configure the node:**
   - **Respond With**: JSON
   - **Response Body**: `={{ $json }}`
6. **Save the node**

## Step 7: Connect All Nodes

1. **Connect Webhook Trigger → Validate & Prepare**
2. **Connect Validate & Prepare → AI Generation**
3. **Connect AI Generation → Process Response**
4. **Connect Process Response → Success Response**

## Step 8: Configure OpenAI Credentials

1. **Go to Settings → Credentials**
2. **Click "Add Credential"**
3. **Select "OpenAI"**
4. **Enter your OpenAI API key**
5. **Name it "OpenAI Account"**
6. **Save the credential**
7. **Go back to the AI Generation node**
8. **Select your OpenAI credential in the Authentication field**

## Step 9: Activate the Workflow

1. **Click the "Activate" toggle in the top right**
2. **The workflow is now live**

## Step 10: Get Your Webhook URL

1. **Click on the "Webhook Trigger" node**
2. **Copy the webhook URL** (e.g., `https://your-n8n-instance.com/webhook/replyai-webhook`)
3. **This is the URL you'll use in the Chrome extension**

## Testing the Workflow

### Using the Test Page
1. **Open `test-webhook.html` in your browser**
2. **Enter your webhook URL**
3. **Test with different tones and posts**

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

## Troubleshooting

### Common Issues

1. **"Could not find property option"**
   - This usually means the n8n version is incompatible
   - Use the manual setup instead of importing JSON

2. **OpenAI node not working**
   - Check your API key is correct
   - Verify you have sufficient credits
   - Check the model name is correct

3. **Webhook not responding**
   - Make sure the workflow is activated
   - Check the webhook path is correct
   - Verify all nodes are connected properly

4. **Code node errors**
   - Check the JavaScript syntax
   - Verify all variables are defined
   - Check the node references are correct

### Debug Mode
- **Enable debug logging** in n8n settings
- **Check execution logs** for each node
- **Test individual nodes** if needed

## Next Steps

1. **Test the workflow** with the provided test tools
2. **Configure the Chrome extension** with your webhook URL
3. **Monitor the workflow** for any issues
4. **Scale as needed** for production use

This manual setup should work with any version of n8n and avoid the import compatibility issues you encountered. 