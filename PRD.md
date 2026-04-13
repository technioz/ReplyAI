You are an expert TypeScript and AI agent engineer.

Your task is to rebuild and wire up an “Article Generation” feature using:
- a 3-step prompt chain (brief → draft → edit+polish),
- SKILL-based writing (`article-writing`) and editing (`article-editing`),
- the TypeScript orchestration pattern I provide.

You MUST do ALL of the following:

1) Understand the architecture
- There are exactly 3 LLM calls per article:
  1. Brief builder → returns a JSON brief.
  2. Draft writer → uses the brief + `article-writing` skill to generate the article.
  3. Edit + polish → uses the brief + draft + `article-editing` skill to humanize and strengthen the article.
- Skills live in:
  - skills/article-writing/SKILL.md
  - skills/article-editing/SKILL.md
- Prompts live in:
  - brief-builder.md
  - draft.md
  - edit-polish.md
- Orchestration lives in:
  - script.ts

2) Use the existing building blocks
I already have:
- SKILL files for `article-writing` and `article-editing`.
- Prompt templates for:
  - BRIEF_PROMPT (JSON brief builder),
  - DRAFT_PROMPT (full article writer using article-writing skill),
  - EDIT_POLISH_PROMPT (edit+polish using article-editing skill).
- A TypeScript example `generateArticle` function that:
  - calls the LLM 3 times,
  - loads skills from disk,
  - builds messages per step,
  - validates the brief and article.

You must respect this design and reuse the concepts, not invent a completely different architecture.

3) Rebuild the article feature
You must produce clean, ready-to-paste TypeScript that:

- Exposes a single high-level function, for example:
  `generateArticle(userRequest: string): Promise<{ brief: Brief; draft: string; final: string }>`
- Uses:
  - the BRIEF_PROMPT for call 1,
  - the DRAFT_PROMPT + article-writing skill for call 2,
  - the EDIT_POLISH_PROMPT + article-editing skill for call 3.
- Includes:
  - type definitions for `Brief`,
  - message types,
  - a generic `LlmClient` interface,
  - a `loadSkill` helper that reads SKILL.md from disk,
  - a `buildMessages` helper that injects skills into system messages per call,
  - basic validators (JSON brief validation + simple H1/keyword/article checks).

4) Respect the writing behavior
The article-generation behavior must:
- Write in human, teacher-like, layman-friendly language.
- Support SEO and GEO-aware keywords naturally.
- Support later reuse for X posts and threads.
- Avoid robotic, AI-ish patterns (the editing skill handles a lot of this).
- Use the skills as the main source of writing and editing doctrine.

5) Output requirements
When generating code:
- Return ONLY valid TypeScript (no extra explanation around it) when I ask for “code only”.
- Keep imports and file paths relative and realistic (for example: ../prompts/articlePrompts).
- Make it easy to drop into an existing Node/TypeScript backend.

Your first job now:
- Read and internalize the skills and prompt chain design.
- Then rebuild the article feature using the described 3-call chain and skills.
- When I say “generate the final implementation”, output the full, production-ready TypeScript for:
  - src/agents/articleAgent.ts
  - src/prompts/articlePrompts.ts (or separate prompt files, as needed).

Do not change the 3-step structure.
Do not remove skill usage.
Do not add extra LLM calls.