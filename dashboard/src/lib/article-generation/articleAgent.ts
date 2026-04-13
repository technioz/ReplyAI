import fs from 'node:fs';
import path from 'node:path';
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
}): { role: 'system' | 'user' | 'assistant'; content: string }[] {
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];

  messages.push({ role: 'system', content: SYSTEM_PROMPT });

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

export interface GenerateArticleOptions {
  topic?: string;
  tone: string;
  length: string;
  includeSEO: boolean;
  model: string;
  context?: string;
  apiKey: string;
  maxTokens?: number;
}

export interface GenerateArticleResult {
  brief: Brief;
  draft: string;
  final: string;
}

export async function generateArticle(options: GenerateArticleOptions): Promise<GenerateArticleResult> {
  const { topic, tone, length, includeSEO, model, context, apiKey, maxTokens = 8192 } = options;

  const { callOllamaCloudChat } = await import('../ai/openaiCompatibleChat');
  type MsgType = { role: 'system' | 'user' | 'assistant'; content: string };

  const llmClient = async (messages: MsgType[], opts?: { temperature?: number }): Promise<string> => {
    const result = await callOllamaCloudChat(model, apiKey, messages, {
      max_tokens: maxTokens,
      temperature: opts?.temperature ?? 0.6,
      top_p: 0.95,
      stream: false,
    });
    return result;
  };

  const userRequest = buildUserRequest(topic, tone, length, includeSEO);

  // Step 1: Brief builder — context is injected here
  console.log('[ArticleAgent] Step 1/3: Building brief...');
  const briefMessages = buildMessages({
    userPrompt: BRIEF_PROMPT + `\n\nUser request:\n${userRequest}`,
    context: context || undefined,
  });

  const briefRaw = await llmClient(briefMessages, { temperature: 0.2 });
  const briefJson = extractJsonFromResponse(briefRaw);
  const brief = safeJsonParse<Brief>(briefJson);
  validateBrief(brief);

  console.log(`[ArticleAgent] Brief created: topic="${brief.topic}", keyword="${brief.primary_keyword}"`);

  const briefString = JSON.stringify(brief, null, 2);

  // Step 2: Draft writer — uses article-writing skill, context also injected here
  console.log('[ArticleAgent] Step 2/3: Writing draft...');
  const draftPrompt = DRAFT_PROMPT.replace('{{brief_json}}', briefString);

  const draftMessages = buildMessages({
    userPrompt: draftPrompt,
    skills: ['article-writing'],
    context: context || undefined,
  });

  const draft = await llmClient(draftMessages, { temperature: 0.6 });
  validateArticle(draft, brief.primary_keyword, { requirePrimaryKeyword: includeSEO });

  console.log(`[ArticleAgent] Draft written: ${draft.split(/\s+/).filter(Boolean).length} words`);

  // Step 3: Edit + polish — uses article-editing skill, NO context
  console.log('[ArticleAgent] Step 3/3: Editing and polishing...');
  const editPrompt = EDIT_POLISH_PROMPT
    .replace('{{brief_json}}', briefString)
    .replace('{{draft_markdown}}', draft);

  const editMessages = buildMessages({
    userPrompt: editPrompt,
    skills: ['article-editing'],
  });

  const finalArticle = await llmClient(editMessages, { temperature: 0.4 });
  validateArticle(finalArticle, brief.primary_keyword, { requirePrimaryKeyword: includeSEO });

  console.log(`[ArticleAgent] Final article: ${finalArticle.split(/\s+/).filter(Boolean).length} words`);

  return {
    brief,
    draft,
    final: finalArticle,
  };
}