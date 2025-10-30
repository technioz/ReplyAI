# Post Generation Prompt System - Complete Redesign

## Problems with Current System (IDENTIFIED):

1. ❌ Corporate tone: "You are an expert content generator"
2. ❌ Generic "write like human" without showing HOW
3. ❌ NO hook formulas
4. ❌ NO thread structure (HOOK → VALUE → CTA)
5. ❌ NO retention mechanics
6. ❌ Doesn't use humanBehaviour.md examples
7. ❌ No deep reasoning layer
8. ❌ Topic diversity mentioned but not enforced
9. ❌ Using deprecated models

## New System Architecture:

### PHASE 1: DEEP REASONING (Before Writing)
- Topic selection with diversity enforcement
- Hook strategy selection (5 formulas)
- Retention planning
- Value delivery planning

### PHASE 2: THREAD STRUCTURE
- HOOK (50% of success) - 5 proven formulas
- VALUE (40%) - Retention mechanics
- CTA (10%) - Soft engagement

### PHASE 3: HUMAN WRITING STYLE
- Real examples from humanBehaviour.md
- Intentional imperfection patterns
- Rhythm variation techniques
- Forbidden elements list

### PHASE 4: TOPIC DIVERSITY
- Explicit rotation through 8+ domains
- Industry variety
- Outcome types

## Hook Formulas (Research-Based):

From web research (2025 X engagement patterns):

1. **Curiosity Gap**: "Most [audience] don't know [surprising fact]..."
2. **Contrarian**: "Everyone says [common advice]. Nah..."
3. **Story Opening**: "[Time/situation]. [Crisis]. Here's what happened..."
4. **Bold Claim + Proof**: "[Metric improvement] for [client type] in [timeframe]..."
5. **Pattern Recognition**: "I've built this [X times]. Every time, [pattern]..."

## Retention Mechanics:

- Visual breaks every 3-4 tweets (completion rate +45%)
- Curiosity maintenance throughout
- Specific numbers and proof points
- Fragment emphasis
- Promise/payoff structure

## Implementation Plan:

1. ✅ Update AI models (done: llama-3.3-70b, grok-4-fast-reasoning)
2. ⏳ Rewrite buildSystemPrompt() with full structure above
3. ⏳ Add post-type-specific guidance
4. ⏳ Test with diverse topics

## Key Changes:

**Identity**:
- OLD: "You are an expert content generator"
- NEW: "You're Gaurav Bhatia - backend engineer with 5+ years..."

**Instructions**:
- OLD: Generic "write like human"
- NEW: 5 hook formulas, 10 human writing patterns with examples, retention mechanics

**Topic Diversity**:
- OLD: Listed but not enforced
- NEW: Explicit rotation instructions with 40+ specific angles

**RAG Usage**:
- Prominently placed at top
- Actually referenced in reasoning phase

This complete redesign will transform post generation from "robotic and narrow" to "engaging, diverse, and authentically human."
