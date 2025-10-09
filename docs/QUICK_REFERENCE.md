# Quick Reference - AI Configuration

## 🎯 Current Configuration

| Parameter | Value | Reason |
|-----------|-------|--------|
| Model | `grok-4` | Most advanced, best for creative content |
| Temperature | `0.9` | High creativity (X.AI recommends 0.7-1.0) |
| Max Tokens | `150` | Complete thoughts, Twitter-optimized |
| Top P | `0.95` | Optimal nucleus sampling |

## 📊 Model Selection Guide

```
┌─────────────────────────────────────────────────┐
│                 MODEL DECISION TREE             │
├─────────────────────────────────────────────────┤
│                                                 │
│  Need BEST quality?           → grok-4         │
│  Need cost efficiency?        → grok-4-fast    │
│  Need enterprise features?    → grok-3         │
│  Need coding assistance?      → grok-code      │
│                                                 │
└─────────────────────────────────────────────────┘
```

## 🔧 Quick Commands

### Test Production API
```bash
curl -X POST https://quirkly.technioz.com/api/reply/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"tweetText":"Test tweet","tone":"professional","userContext":{}}'
```

### Check Environment
```bash
curl https://quirkly.technioz.com/api/test-env
```

### Update Model (Local)
```bash
# Edit .env.local
XAI_MODEL=grok-4  # or grok-4-fast-reasoning
```

### Update Model (Production)
1. Visit: https://vercel.com/techniozs-projects/quirkly/settings/environment-variables
2. Edit `XAI_MODEL`
3. Set to `grok-4`
4. Save & redeploy

## 📈 Expected Response Quality

### With grok-4 (temp=0.9)
```
Input:  "Just launched our new AI tool!"
Output: "Congrats on the launch! 🚀 AI-powered tools are like 
         that extra shot of espresso for teams—boosting 
         efficiency without the jitters. What's the killer 
         feature that sets it apart?"

✅ Creative analogies
✅ Natural emojis
✅ Engaging questions
✅ Conversational tone
```

### With grok-4-fast-reasoning (temp=0.9)
```
Input:  "Working from home is both a blessing and a curse"
Output: "Totally feel that – skipping the commute saves my 
         sanity, but now my cat's convinced I'm her personal 
         chef. What's the curse side hitting you hardest?"

✅ Relatable content
✅ Personal touch
✅ Good engagement
✅ Cost-efficient
```

## 💰 Cost Optimization

```typescript
// Tiered approach
const model = user.subscription === 'premium' 
  ? 'grok-4'                    // Best quality
  : 'grok-4-fast-reasoning';    // Cost-efficient

// Or volume-based
const model = requestCount < 1000 
  ? 'grok-4'                    // Low volume, use best
  : 'grok-4-fast-reasoning';    // High volume, optimize cost
```

## 🎚️ Temperature Guide

| Temp | Use Case | Example Output |
|------|----------|----------------|
| 0.7 | Conservative, consistent | More predictable responses |
| 0.9 | Optimal for social | Creative, varied, human-like |
| 1.0 | Maximum creativity | Very diverse, experimental |

## ⚠️ Common Issues

### Issue: Repetitive responses
Solution: ✅ Already fixed with temp=0.9

### Issue: Responses too long
Solution: ✅ Limited to 150 tokens

### Issue: Not human-like enough
Solution: ✅ Using grok-4 with optimized prompts

### Issue: Cost too high
Solution: Switch to grok-4-fast-reasoning

## 📚 Documentation Links

- Full Config Guide: [AI_MODEL_CONFIGURATION.md](./AI_MODEL_CONFIGURATION.md)
- X.AI Docs: https://docs.x.ai/docs/overview
- Pricing: https://x.ai/api

## 🔄 Version Info

- Current: v2.0.0 (grok-4, temp=0.9, optimized)
- Previous: v1.0.0 (grok-4-fast, temp=0.85)
- Last Updated: October 9, 2025

