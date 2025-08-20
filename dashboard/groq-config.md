# Groq LLM Configuration Guide

## Environment Variables

Add these to your `.env.local` file:

```bash
# Groq LLM Configuration
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama3-8b-8192
```

## Available Models

- `llama3-8b-8192` - Fast, good quality (recommended)
- `llama3-70b-8192` - Higher quality, slower
- `mixtral-8x7b-32768` - Balanced performance
- `gemma2-9b-it` - Google's model, good quality

## Getting Groq API Key

1. Go to https://console.groq.com/
2. Sign up/Login
3. Navigate to API Keys
4. Create a new API key
5. Copy the key to your `.env.local` file

## Testing

The extension will now use Groq for generating replies instead of external services.
