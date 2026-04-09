# AI Provider Setup

Quirkly supports multiple AI backends for reply generation: Groq, XAI, and Ollama. Configure one provider at a time; the Next.js API picks the implementation based on the `AI_PROVIDER` environment variable.

## 1. Choose a Provider

Set `AI_PROVIDER` in `dashboard/.env.local`:

```
AI_PROVIDER=groq   # or xai, or ollama
```

## 2. Groq Configuration

```
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama3-8b-8192   # default if unset
```

- Create an API key at [https://console.groq.com](https://console.groq.com)
- Common models: `llama3-8b-8192` (fast), `llama3-70b-8192` (higher quality)

## 3. XAI (Grok 3) Configuration

```
XAI_API_KEY=your_xai_api_key
XAI_MODEL=grok-3   # default if unset
```

- Sign up at [https://x.ai](https://x.ai) to obtain a key

## 4. Ollama Configuration

### Local Ollama (Default)

```
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2   # default if unset
OLLAMA_API_KEY=your_ollama_api_key   # Optional, only if Ollama requires auth
```

- Install Ollama locally from [https://ollama.ai](https://ollama.ai)
- Start the Ollama service: `ollama serve`
- Pull a model: `ollama pull llama2`
- Set base URL to your Ollama instance (can be localhost or remote server)
- API key is optional and only needed if your Ollama instance requires authentication

### Cloud Ollama (ollama.com API)

```
OLLAMA_USE_CLOUD=true
OLLAMA_CLOUD_API_KEY=your_ollama_cloud_api_key   # Required for cloud API
OLLAMA_MODEL=llama2   # or any model available on ollama.com
```

- Sign up at [https://ollama.com](https://ollama.com) to get an API key
- Uses the https://ollama.com/api/chat endpoint for chat completions
- No need to run a local Ollama server

## 4. Testing Your Setup

With Next.js running (`npm run dev`), use the utility endpoint:

```bash
curl -X POST http://localhost:3000/api/reply/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <api-key>" \
  -d '{
    "tweetText": "Quick check for AI integration",
    "tone": "professional"
  }'
```

- Replace `<api-key>` with a user API key (e.g. from `create-admin.js` output)
- A successful response returns `reply`, `tone`, and `metadata.model`

## 5. Troubleshooting

- Missing API key – ensure `GROQ_API_KEY` or `XAI_API_KEY` is defined before starting Next.js
- Invalid tone – allowed values are `professional`, `casual`, `humorous`, `empathetic`, `analytical`, `enthusiastic`, `controversial`
- Rate limits – Groq/XAI errors propagate as `RATE_LIMIT_EXCEEDED`; wait before retrying

Keep secrets out of version control—`.env.local` is gitignored.
