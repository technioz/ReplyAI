# AI Model Selection Guide

## TL;DR - Recommended Setup

```bash
AI_PROVIDER=groq
GROQ_MODEL=deepseek-r1-distill-llama-70b
```

**Why?** Best balance of speed (280 T/S) + critical thinking + reasoning.

---

## Available Models

### Groq Models (FAST - Recommended)

Groq uses LPU (Language Processing Unit) hardware - custom chips for LLMs that are WAY faster than GPUs.

#### 1. **deepseek-r1-distill-llama-70b** ⭐ RECOMMENDED

- **Speed**: ~280 tokens/second
- **TPM**: 60K tokens per minute
- **Strength**: **Critical thinking & reasoning**
- **Use Case**: X replies that need independent evaluation
- **Cost**: ~$0.35/$1.40 per 1M tokens

**Why This One?**
- Chain-of-thought reasoning built-in
- Distilled from DeepSeek R1 (reasoning specialist)
- Evaluates posts critically before responding
- Suggests better alternatives naturally
- Still fast enough for real-time replies

#### 2. **llama-3.3-70b-versatile** (Balanced)

- **Speed**: ~280 tokens/second
- **TPM**: 300K (highest)
- **Strength**: General purpose, balanced
- **Use Case**: High volume usage, good enough reasoning
- **Cost**: ~$0.59/$0.79 per 1M tokens

**When to Use:**
- Need high TPM limits
- General social media replies
- Less critical thinking needed

#### 3. **llama-3.1-8b-instant** (Ultra-Fast)

- **Speed**: ~6000 tokens/second (BLAZING)
- **TPM**: 30K
- **Strength**: Speed
- **Use Case**: Bulk operations, simple replies
- **Cost**: ~$0.05/$0.08 per 1M tokens (cheap)

**When to Use:**
- Need instant responses (<100ms)
- Simple agree/disagree replies
- Budget-conscious
- Less reasoning required

#### 4. **mixtral-8x7b-32768** (Mixture of Experts)

- **Speed**: ~500 tokens/second
- **TPM**: 20K
- **Strength**: Complex reasoning, long context
- **Use Case**: Complex multi-step thinking
- **Cost**: ~$0.24/$0.24 per 1M tokens

**When to Use:**
- Need to analyze long threads
- Multiple perspectives needed
- Complex technical evaluation

---

## XAI Models (SLOW - Not Recommended for Replies)

### **grok-4** (Powerful but Slow)

- **Speed**: ~30-50 tokens/second (VERY SLOW)
- **Response Time**: 5-10 seconds per reply
- **Strength**: Advanced reasoning, huge context window
- **Model Size**: ~314B+ parameters (massive)

**Why So Slow?**
1. **No specialized hardware** - XAI uses GPUs, not LPUs like Groq
2. **Massive model** - Grok-4 is GPT-4 scale (10x bigger than Llama 70B)
3. **Deep reasoning** - Built for complex thinking, not speed
4. **Network latency** - XAI infrastructure not optimized for low latency

**When to Use Grok:**
- Long-form content generation (blog posts, threads)
- Complex analysis requiring deep reasoning
- When speed doesn't matter
- NOT for quick X replies

---

## Speed Comparison

| Model | Speed (T/S) | Reply Time | Reasoning Quality |
|-------|-------------|------------|-------------------|
| llama-3.1-8b-instant | 6000 | 0.1s | ⭐⭐ |
| deepseek-r1-distill-70b | 280 | 0.4s | ⭐⭐⭐⭐⭐ |
| llama-3.3-70b-versatile | 280 | 0.4s | ⭐⭐⭐⭐ |
| mixtral-8x7b-32768 | 500 | 0.3s | ⭐⭐⭐⭐ |
| grok-4 (XAI) | 40 | 5-8s | ⭐⭐⭐⭐⭐ |

---

## How to Switch Models

### Option 1: Environment Variable (Recommended)

```bash
# In dashboard/.env.local
GROQ_MODEL=deepseek-r1-distill-llama-70b
```

### Option 2: Default in Code

Edit `dashboard/src/lib/ai/GroqService.ts`:
```typescript
const model = process.env.GROQ_MODEL || 'your-preferred-model';
```

---

## Model Selection Decision Tree

```
Need critical thinking & reasoning?
  ├─ YES → deepseek-r1-distill-llama-70b ⭐
  └─ NO → Continue...

Need blazing speed (< 100ms)?
  ├─ YES → llama-3.1-8b-instant
  └─ NO → Continue...

Need high volume (300K+ TPM)?
  ├─ YES → llama-3.3-70b-versatile
  └─ NO → Continue...

Need long context (32K+)?
  ├─ YES → mixtral-8x7b-32768
  └─ NO → deepseek-r1-distill-llama-70b (default)

Deep reasoning, speed doesn't matter?
  └─ grok-4 (but expect 5-10s delays)
```

---

## Cost Analysis (Per 1M Tokens)

| Model | Input Cost | Output Cost | Best For |
|-------|-----------|-------------|----------|
| llama-3.1-8b-instant | $0.05 | $0.08 | Budget |
| mixtral-8x7b-32768 | $0.24 | $0.24 | Balanced |
| deepseek-r1-distill-70b | $0.35 | $1.40 | Reasoning ⭐ |
| llama-3.3-70b-versatile | $0.59 | $0.79 | Volume |

**For X replies (avg 50-100 chars):**
- ~30 tokens output per reply
- Cost per 1000 replies: $0.04 - $0.60

---

## Testing Your Model

Test the model with:
```bash
curl -X POST http://localhost:3000/api/reply/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "tweetText": "Microservices are the only way to scale",
    "tone": "contrarian"
  }'
```

**Expected Behavior with DeepSeek R1:**
- Should challenge the post
- Suggest simpler alternatives (monolith, modular monolith)
- Share experience-based perspective
- NOT just agree

---

## Why DeepSeek R1 Distill is Perfect for This Project

1. **Built for Reasoning** - Trained specifically for critical thinking
2. **Fast Enough** - 280 T/S means ~0.4s replies (acceptable)
3. **Evaluates Critically** - Won't blindly agree with posts
4. **Suggests Alternatives** - Naturally offers better approaches
5. **Experience-Based** - Speaks from engineering perspective
6. **Cost-Effective** - $0.35 input, worth it for quality

---

## Troubleshooting

### "Model not found" error
- Check model name spelling
- Verify Groq API key is valid
- Try `llama-3.3-70b-versatile` as fallback

### Responses still too slow
- Switch to `llama-3.1-8b-instant`
- Check network latency
- Verify you're using Groq, not XAI

### Not enough reasoning
- Use `deepseek-r1-distill-llama-70b`
- Or try `mixtral-8x7b-32768`
- Avoid `llama-3.1-8b-instant` (too simple)

---

**Last Updated**: 2025-10-30
**Recommended Model**: `deepseek-r1-distill-llama-70b`
