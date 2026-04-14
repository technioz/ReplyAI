import fs from 'node:fs';
import path from 'node:path';
import type { ChatMessage } from '../ai/openaiCompatibleChat';
import type { ArticleLlmCallOptions } from './articleLlmClient';
import { BRIEF_PROMPT, DRAFT_PROMPT, EDIT_POLISH_PROMPT } from './articlePrompts';
import { Brief } from './types';

const SYSTEM_PROMPT = `
You are an article-generation agent.

Follow any loaded skills exactly.
Write for humans first.
Be clear, specific, natural, and useful.
Do not sound robotic, generic, padded, or corporate.
Return only the format requested for each step.
`;

const HUMANIZER_SYSTEM_PROMPT = `
You are a human editor who rewrites AI-generated text so it sounds like a real person wrote it.

You can spot AI writing instantly. The telltale signs: inflated symbolism, promotional language, -ing tail phrases, vague attributions, AI vocabulary words (additionally, delve, leverage, robust, tapestry, pivotal, holistic, etc.), negative parallelisms, rule of three, copula avoidance ("serves as" instead of "is"), em dash overuse, bold-label lists, title-case headings, generic upbeat endings, and filler phrases.

You do not just remove bad patterns. You add what AI writing lacks: varied sentence rhythm, opinions, first-person voice, concrete specifics, acknowledgment of uncertainty, and natural flow.

You are ruthless. If a sentence sounds like AI wrote it, you rewrite it. If a paragraph says nothing a human would say, you cut it or replace it with something real.

You follow the loaded humanizer skill exactly.
`;

function getSkillsBaseDir(): string {
  const envPath = process.env.SKILLS_DIR;
  if (envPath) return envPath;
  return path.join(process.cwd(), '..', 'skills');
}

function loadSkill(skillName: string): string {
  const baseDir = getSkillsBaseDir();
  const possiblePaths = [
    path.join(baseDir, skillName, 'SKILL.md'),
    path.join(baseDir, skillName, 'skill.md'),
  ];

  for (const skillPath of possiblePaths) {
    try {
      if (fs.existsSync(skillPath)) {
        return fs.readFileSync(skillPath, 'utf8');
      }
    } catch {
      // try next path
    }
  }

  console.warn(`[ArticleAgent] Skill file not found for: ${skillName}, searched: ${possiblePaths.join(', ')}`);
  return '';
}

function safeJsonParse<T>(input: string): T {
  return JSON.parse(input) as T;
}

function validateBrief(brief: Brief): void {
  if (!brief.topic) throw new Error('Brief missing topic');
  if (!brief.audience) throw new Error('Brief missing audience');
  if (!brief.primary_keyword) throw new Error('Brief missing primary_keyword');
  if (!brief.core_questions || brief.core_questions.length < 3) {
    throw new Error('Brief needs at least 3 core_questions');
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Avoid false positives like "go" matching inside "good". */
function textIncludesTokenInsensitive(text: string, token: string): boolean {
  if (!token) return true;
  const lower = text.toLowerCase();
  const t = token.toLowerCase();
  if (t.length >= 5) return lower.includes(t);
  try {
    const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(t)}(?![a-z0-9])`, 'i');
    return re.test(text);
  } catch {
    return lower.includes(t);
  }
}

/**
 * True if the article clearly reflects the primary SEO keyword.
 * Models often split compounds (CI/CD vs "CI CD"), hyphenate differently, or weave
 * words without the exact phrase — strict substring checks fail too often.
 */
function articleMatchesPrimaryKeyword(markdown: string, primaryKeyword: string): boolean {
  const lower = markdown.toLowerCase();
  const kwNorm = primaryKeyword.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!kwNorm) return true;

  if (lower.includes(kwNorm)) return true;

  const hyphenAsSpace = kwNorm.replace(/-/g, ' ');
  if (hyphenAsSpace !== kwNorm && lower.includes(hyphenAsSpace)) return true;

  const tokens = kwNorm.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
  if (tokens.length <= 1) {
    const single = tokens[0] ?? kwNorm;
    return textIncludesTokenInsensitive(markdown, single);
  }

  const required = tokens.filter((t) => t.length >= 2);
  if (required.length === 0) {
    return lower.includes(kwNorm);
  }
  return required.every((t) => textIncludesTokenInsensitive(markdown, t));
}

function validateArticle(
  markdown: string,
  primaryKeyword: string | undefined,
  options: { requirePrimaryKeyword: boolean }
): void {
  const trimmed = markdown.trim();

  if (!trimmed.startsWith('# ')) {
    throw new Error('Article must start with an H1 (# Title)');
  }

  if (!options.requirePrimaryKeyword || !primaryKeyword?.trim()) {
    return;
  }

  if (!articleMatchesPrimaryKeyword(trimmed, primaryKeyword)) {
    throw new Error(
      `Primary keyword not found in article (brief.primary_keyword: "${primaryKeyword.trim()}"). ` +
        'Include that phrase or its clear constituent words in the title or body.'
    );
  }
}

function buildMessages(params: {
  userPrompt: string;
  skills?: string[];
  context?: string;
  systemPrompt?: string;
}): ChatMessage[] {
  const messages: ChatMessage[] = [];

  messages.push({ role: 'system', content: params.systemPrompt || SYSTEM_PROMPT });

  for (const skillName of params.skills || []) {
    const skillText = loadSkill(skillName);
    if (skillText) {
      messages.push({
        role: 'system',
        content: `Skill instructions for this call: ${skillName}\n\n${skillText}`,
      });
    }
  }

  if (params.context) {
    messages.push({
      role: 'system',
      content: `========================================\nRESEARCH CONTEXT (from web search)\n========================================\n${params.context}\n\nUse this context to make the article specific, factual, and grounded. Do NOT repeat the context verbatim. Weave relevant facts, data points, and examples naturally into the content. If the context contradicts your knowledge, trust the context. Cite specific numbers and examples from this context where relevant.`,
    });
  }

  messages.push({ role: 'user', content: params.userPrompt });

  return messages;
}

function extractJsonFromResponse(raw: string): string {
  const trimmed = raw.trim();

  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return trimmed;
}

function buildUserRequest(
  topic: string | undefined,
  tone: string,
  length: string,
  includeSEO: boolean
): string {
  let request = '';
  if (topic) {
    request += `Write an article about: ${topic}\n`;
  } else {
    request += `Write an article based on your expertise in DevOps, AI automation, and shipping real systems. Pick a topic you have strong opinions about.\n`;
  }
  request += `Tone: ${tone}\n`;
  request += `Length: ${length}\n`;
  request += `SEO: ${includeSEO ? 'enabled' : 'disabled'}\n`;
  return request;
}

function buildWriterVoiceBlock(profile: import('./types').WriterProfile | undefined): string {
  if (!profile) return '';

  const parts: string[] = [];

  parts.push('========================================');
  parts.push('WRITER VOICE PROFILE');
  parts.push('========================================');

  if (profile.displayName || profile.handle) {
    parts.push(`Writer: ${profile.displayName || ''}${profile.handle ? ` (@${profile.handle})` : ''}`);
  }

  if (profile.bio) {
    parts.push(`Bio: ${profile.bio}`);
  }

  if (profile.toneAnalysis) {
    const t = profile.toneAnalysis;
    if (t.primaryTone) parts.push(`Primary tone: ${t.primaryTone}`);
    if (t.secondaryTones?.length) parts.push(`Secondary tones: ${t.secondaryTones.join(', ')}`);
    if (t.vocabulary?.length) parts.push(`Vocabulary markers: ${t.vocabulary.join(', ')}`);
  }

  if (profile.expertise) {
    const e = profile.expertise;
    if (e.domains?.length) parts.push(`Expertise domains: ${e.domains.join(', ')}`);
    if (e.keywords?.length) parts.push(`Expertise keywords: ${e.keywords.join(', ')}`);
    if (e.topics?.length) parts.push(`Expertise topics: ${e.topics.join(', ')}`);
  }

  if (profile.writingSamples?.length) {
    parts.push('');
    parts.push('ACTUAL WRITING SAMPLES (write like this):');
    for (const sample of profile.writingSamples.slice(0, 5)) {
      parts.push(`> ${sample}`);
    }
  }

  parts.push('');
  parts.push('INSTRUCTION: Draft the article with deep, valuable content first. Then the humanization step will match this voice. But even in the draft, write with the personality shown above. Explain things like a person would explain to a friend. Do not hold back. Do not be vague. Say what you mean.');

  return parts.join('\n');
}

export interface GenerateArticleOptions {
  topic?: string;
  tone: string;
  length: string;
  includeSEO: boolean;
  /** Resolved model id (from adapter); used for logging alignment with the LLM. */
  model: string;
  context?: string;
  writerProfile?: import('./types').WriterProfile;
  /**
   * Provider-specific chat completion (Ollama Cloud, xAI, or Groq), built in the adapter from AI_PROVIDER.
   */
  completeChat: (messages: ChatMessage[], opts?: ArticleLlmCallOptions) => Promise<string>;
}

export interface GenerateArticleResult {
  brief: Brief;
  draft: string;
  final: string;
}

export async function generateArticle(options: GenerateArticleOptions): Promise<GenerateArticleResult> {
  const { topic, tone, length, includeSEO, model, context, writerProfile, completeChat } = options;

  const callLlm = (messages: ChatMessage[], opts?: ArticleLlmCallOptions) => completeChat(messages, opts);

  console.log(`[ArticleAgent] 3-step pipeline (model id: ${model})`);

  const userRequest = buildUserRequest(topic, tone, length, includeSEO);
  const writerVoiceBlock = buildWriterVoiceBlock(writerProfile);

  // Step 1: Brief builder — context is injected here
  console.log('[ArticleAgent] Step 1/3: Building brief...');
  const briefMessages = buildMessages({
    userPrompt: BRIEF_PROMPT + `\n\nUser request:\n${userRequest}`,
    context: context || undefined,
  });

  const briefRaw = await callLlm(briefMessages, {
    temperature: 0.2,
    contextLogLabel: 'Article 1/3 — Brief builder (JSON brief + research context)',
  });
  const briefJson = extractJsonFromResponse(briefRaw);
  const brief = safeJsonParse<Brief>(briefJson);
  validateBrief(brief);

  console.log(`[ArticleAgent] Brief created: topic="${brief.topic}", keyword="${brief.primary_keyword}"`);

  const briefString = JSON.stringify(brief, null, 2);

  // Step 2: Draft writer — uses article-writing skill, context + writer voice
  console.log('[ArticleAgent] Step 2/3: Writing draft...');
  let draftPrompt = DRAFT_PROMPT.replace('{{brief_json}}', briefString);
  if (writerVoiceBlock) {
    draftPrompt += `\n\n${writerVoiceBlock}`;
  }

  const draftMessages = buildMessages({
    userPrompt: draftPrompt,
    skills: ['article-writing'],
    context: context || undefined,
  });

  const draft = await callLlm(draftMessages, {
    temperature: 0.6,
    contextLogLabel: 'Article 2/3 — Draft (brief + article-writing skill + research + voice)',
  });
  validateArticle(draft, brief.primary_keyword, { requirePrimaryKeyword: includeSEO });

  console.log(`[ArticleAgent] Draft written: ${draft.split(/\s+/).filter(Boolean).length} words`);

  // Step 3: Humanize — uses humanizer skill, writer voice for reference, NO context
  console.log('[ArticleAgent] Step 3/3: Humanizing article...');
  let editPrompt = EDIT_POLISH_PROMPT
    .replace('{{brief_json}}', briefString)
    .replace('{{draft_markdown}}', draft);
  if (writerVoiceBlock) {
    editPrompt += `\n\n${writerVoiceBlock}`;
  }

  const editMessages = buildMessages({
    userPrompt: editPrompt,
    skills: ['humanizer'],
    systemPrompt: HUMANIZER_SYSTEM_PROMPT,
  });

  const finalArticle = await callLlm(editMessages, {
    temperature: 0.85,
    contextLogLabel: 'Article 3/3 — Humanize (brief + draft + humanizer skill + voice)',
    ollamaOptions: {
      repeat_penalty: 1.5,
      top_k: 40,
      min_p: 0.05,
    },
  });
  validateArticle(finalArticle, brief.primary_keyword, { requirePrimaryKeyword: includeSEO });

  console.log(`[ArticleAgent] Final article: ${finalArticle.split(/\s+/).filter(Boolean).length} words`);

  return {
    brief,
    draft,
    final: finalArticle,
  };
}