# AI Model Selection Guide (2025 - UPDATED)

## TL;DR - Best Setup for Critical Thinking

```bash
AI_PROVIDER=xai
XAI_MODEL=grok-4-fast-reasoning
```

**Why?** Best reasoning + fast (227-344 T/S) + cheapest ($0.20/$0.50 per 1M tokens).

**Alternative (Groq):**
```bash
AI_PROVIDER=groq
GROQ_MODEL=llama-3.3-70b-versatile
```

---

## Currently Available Models (2025)

### Groq Models (LPU-Accelerated - FAST)

#### 1. **llama-3.3-70b-versatile** ⭐ (Groq Default)

- **Speed**: 276-394 tokens/second
- **Context**: 128K tokens
- **Cost**: $0.59/$0.79 per 1M tokens
- **Reasoning**: Good (general purpose)
- **Response Time**: ~0.4 seconds

**When to Use:**
- Need balanced speed + reasoning
- General social media replies
- Good enough for most use cases

#### 2. **llama-3.3-70b-specdec** (Ultra-Fast)

- **Speed**: **1,665 tokens/second** (6x faster!)
- **Context**: 128K tokens
- **Cost**: $0.59/$0.99 per 1M tokens
- **Reasoning**: Same as versatile
- **Response Time**: ~0.07 seconds (BLAZING)
- **Note**: Uses speculative decoding

**When to Use:**
- Need instant responses (<100ms)
- High-volume bulk operations
- Speed is top priority
- Reasoning still matters (better than 8b-instant)

#### 3. **llama-3.1-8b-instant** (Budget)

- **Speed**: 6000 tokens/second (SUPER FAST)
- **Context**: 30K tokens
- **Cost**: $0.05/$0.08 per 1M tokens (cheapest)
- **Reasoning**: **Weak** (limited knowledge)
- **Response Time**: ~0.02 seconds

**When to Use:**
- Budget-conscious
- Simple agree/disagree replies
- Don't need critical thinking
- **NOT recommended for building authority**

---

### XAI Models (GPU-Accelerated)

#### 1. **grok-4-fast-reasoning** ⭐⭐⭐ (RECOMMENDED)

- **Speed**: 227-344 tokens/second
- **Latency**: 1.1s end-to-end for complex queries
- **Context**: **2M tokens** (MASSIVE)
- **Cost**: **$0.20/$0.50 per 1M tokens** (CHEAPEST!)
- **Reasoning**: **Excellent** (built for reasoning)
- **Response Time**: ~1.5 seconds total

**Why This is Best:**
- ✅ Built specifically for critical thinking
- ✅ 10x faster than old Grok 4
- ✅ Cheapest option with best reasoning
- ✅ Huge 2M context window
- ✅ Uses 40% fewer thinking tokens than Grok 4
- ✅ Perfect for challenging posts and suggesting alternatives

**When to Use:**
- **Building personal brand** (your use case!)
- Need independent evaluation
- Want creative, contrarian responses
- Challenging conventional wisdom
- Suggesting better alternatives

#### 2. **grok-4** (NOT Recommended)

- **Speed**: ~40 tokens/second (SLOW)
- **Context**: 256K tokens
- **Cost**: Higher than grok-4-fast
- **Reasoning**: Excellent (overkill)
- **Response Time**: 5-10 seconds

**Why NOT Use:**
- ❌ 5-10 second response time (too slow)
- ❌ Overkill for quick X replies
- ❌ More expensive
- ❌ grok-4-fast-reasoning is better for everything

---

## Speed Comparison

| Model | Speed (T/S) | Reply Time | Reasoning | Cost (per 1M) |
|-------|-------------|------------|-----------|---------------|
| llama-3.3-70b-specdec | 1,665 | 0.07s | ⭐⭐⭐⭐ | $0.59/$0.99 |
| llama-3.1-8b-instant | 6,000 | 0.02s | ⭐⭐ | $0.05/$0.08 |
| llama-3.3-70b-versatile | 276-394 | 0.4s | ⭐⭐⭐⭐ | $0.59/$0.79 |
| **grok-4-fast-reasoning** | 227-344 | 1.5s | ⭐⭐⭐⭐⭐ | **$0.20/$0.50** |
| grok-4 | 40 | 5-10s | ⭐⭐⭐⭐⭐ | $? (expensive) |

---

## Why Grok-4-Fast-Reasoning is Perfect for You

### Your Use Case: Building Authority on X
You need replies that:
1. ✅ **Think critically** - Don't blindly agree
2. ✅ **Challenge posts** - Offer contrarian views
3. ✅ **Suggest alternatives** - Share better approaches
4. ✅ **Show expertise** - Speak from experience
5. ✅ **Build personal brand** - Authentic, not robotic

### Why grok-4-fast-reasoning Delivers:
- **Built for reasoning** - Literally designed for critical thinking
- **Fast enough** - 1.5s total (vs 5-10s for old Grok)
- **Cheapest** - $0.20/$0.50 vs Groq's $0.59/$0.79
- **Best value** - Excellent reasoning + speed + cost
- **Huge context** - 2M tokens (can analyze long threads)

### Groq vs Grok for Your Needs:

| Factor | Groq (llama-3.3) | Grok-4-Fast |
|--------|------------------|-------------|
| Critical Thinking | Good | **Excellent** |
| Speed | Faster (276-394 T/S) | Fast enough (227-344 T/S) |
| Cost | $0.59/$0.79 | **$0.20/$0.50** (66% cheaper!) |
| Context | 128K | **2M** (15x more) |
| Challenging posts | Can do | **Built for it** |
| Personal brand | Works | **Perfect** |

---

## Decision Tree

```
Building authority & need critical thinking?
  └─ YES → grok-4-fast-reasoning ⭐⭐⭐

Need fastest possible speed?
  ├─ With reasoning → llama-3.3-70b-specdec (1,665 T/S)
  └─ Without reasoning → llama-3.1-8b-instant (6,000 T/S)

Balanced speed + reasoning on budget?
  └─ llama-3.3-70b-versatile

Never use:
  └─ grok-4 (too slow, overkill)
```

---

## Setup Instructions

### Option 1: Use Grok (Recommended for You)

```bash
# In dashboard/.env.local
AI_PROVIDER=xai
XAI_API_KEY=your-xai-key-here
XAI_MODEL=grok-4-fast-reasoning
```

### Option 2: Use Groq (Faster but less reasoning)

```bash
# In dashboard/.env.local
AI_PROVIDER=groq
GROQ_API_KEY=your-groq-key-here
GROQ_MODEL=llama-3.3-70b-versatile
```

### Option 3: Use Groq for blazing speed

```bash
GROQ_MODEL=llama-3.3-70b-specdec  # 1,665 T/S!
```

---

## Testing Your Model

```bash
curl -X POST http://localhost:3000/api/reply/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "tweetText": "Microservices are the only way to scale",
    "tone": "contrarian"
  }'
```

**Expected with grok-4-fast-reasoning:**
- Should challenge the post
- Suggest monolith/modular monolith as alternatives
- Share specific experience
- NOT just agree
- ~1-2 second response time

---

## Cost Analysis (Per 1000 Replies)

Assuming 30 tokens output per reply:

| Model | Cost per 1K replies | Monthly (30K replies) |
|-------|---------------------|----------------------|
| grok-4-fast-reasoning | **$0.015** | **$0.45** |
| llama-3.3-70b-versatile | $0.024 | $0.72 |
| llama-3.1-8b-instant | $0.002 | $0.06 |

**Winner:** grok-4-fast-reasoning - Best value for quality

---

## Why DeepSeek R1 / Mixtral are Gone

These models have been **deprecated** by Groq:
- ❌ deepseek-r1-distill-llama-70b - No longer available
- ❌ mixtral-8x7b-32768 - Deprecated August 8, 2025

**Replacement:** Use llama-3.3-70b-versatile or grok-4-fast-reasoning instead.

---

## Troubleshooting

### "Model not found" error
- Check model name: `grok-4-fast-reasoning` (with hyphens)
- Verify API key is valid
- Try llama-3.3-70b-versatile as fallback

### Responses too slow
- If using grok-4 → Switch to grok-4-fast-reasoning
- If using Grok → Try llama-3.3-70b-specdec (1,665 T/S)

### Not enough critical thinking
- Switch from Groq to Grok (grok-4-fast-reasoning)
- Check your prompts include "THINK FIRST" layer
- Avoid llama-3.1-8b-instant (too simple)

### Grok still slow
- Ensure you're using grok-4-fast-reasoning NOT grok-4
- Check logs: `console.log` should show correct model
- Verify AI_PROVIDER=xai and XAI_MODEL set correctly

---

## Final Recommendation

**For your use case (building authority on X with critical thinking):**

```bash
AI_PROVIDER=xai
XAI_MODEL=grok-4-fast-reasoning
```

This gives you:
- ✅ Best reasoning capabilities
- ✅ Fast enough (1-2s vs 5-10s)
- ✅ Cheapest cost ($0.20/$0.50)
- ✅ Challenges posts intelligently
- ✅ Suggests better alternatives
- ✅ Speaks from experience
- ✅ Builds authentic personal brand

---

**Last Updated**: October 30, 2025
**Verified Available Models**: llama-3.3-70b-versatile, llama-3.3-70b-specdec, llama-3.1-8b-instant, grok-4-fast-reasoning
**Deprecated Models**: deepseek-r1, mixtral-8x7b, gemma2-9b-it
