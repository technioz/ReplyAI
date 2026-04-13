// src/agents/articleAgent.ts
import fs from "node:fs";
import path from "node:path";

import { BRIEF_PROMPT, DRAFT_PROMPT, EDIT_POLISH_PROMPT } from "../prompts/articlePrompts";

export type Brief = {
  topic: string;
  audience: string;
  search_intent: "informational" | "commercial" | "transactional" | "navigational";
  primary_keyword: string;
  secondary_keywords: string[];
  geo_keywords: string[];
  reader_level: "beginner" | "intermediate" | "advanced";
  article_type: "tutorial" | "explainer" | "comparison" | "opinion" | "guide" | "listicle";
  core_questions: string[];
  must_include: string[];
  must_avoid: string[];
  tone: string[];
  target_length: "short" | "medium" | "long" | "very long";
  cta_type: "none" | "soft" | "direct";
  output_format: "markdown";
};

export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmClient = (messages: LlmMessage[], options?: { temperature?: number }) => Promise<string>;

// Adjust this to match your env
const SYSTEM_PROMPT = `
You are an article-generation agent.

Follow any loaded skills exactly.
Write for humans first.
Be clear, specific, natural, and useful.
Do not sound robotic, generic, padded, or corporate.
Return only the format requested for each step.
`;

// ---- utilities ----

function loadSkill(skillName: string): string {
  const skillPath = path.join(process.cwd(), "skills", skillName, "SKILL.md");
  return fs.readFileSync(skillPath, "utf8");
}

function safeJsonParse<T>(input: string): T {
  return JSON.parse(input) as T;
}

function validateBrief(brief: Brief) {
  if (!brief.topic) throw new Error("Brief missing topic");
  if (!brief.audience) throw new Error("Brief missing audience");
  if (!brief.primary_keyword) throw new Error("Brief missing primary_keyword");
  if (!brief.core_questions || brief.core_questions.length < 3) {
    throw new Error("Brief needs at least 3 core_questions");
  }
}

function validateArticle(markdown: string, primaryKeyword?: string) {
  const trimmed = markdown.trim();

  if (!trimmed.startsWith("# ")) {
    throw new Error("Article must start with an H1 (# Title)");
  }

  if (primaryKeyword && !trimmed.toLowerCase().includes(primaryKeyword.toLowerCase())) {
    throw new Error("Primary keyword not found in article");
  }

  if (trimmed.includes("—")) {
    throw new Error("Article contains em dashes, which are not allowed");
  }

  if (trimmed.includes("``` ") || trimmed.includes("```")) {
    // not a real validation, just here as a placeholder if you want to inspect code blocks
  }
}

function buildMessages(params: {
  userPrompt: string;
  skills?: string[];
}): LlmMessage[] {
  const messages: LlmMessage[] = [];

  messages.push({ role: "system", content: SYSTEM_PROMPT });

  for (const skillName of params.skills || []) {
    const skillText = loadSkill(skillName);
    messages.push({
      role: "system",
      content: `Skill instructions for this call: ${skillName}\n\n${skillText}`,
    });
  }

  messages.push({ role: "user", content: params.userPrompt });

  return messages;
}

// ---- main chain ----

export async function generateArticle(
  userRequest: string,
  llm: LlmClient
): Promise<{ brief: Brief; draft: string; final: string }> {
  // 1) Brief
  const briefMessages = buildMessages({
    userPrompt: BRIEF_PROMPT + `\n\nUser request:\n${userRequest}`,
  });

  const briefRaw = await llm(briefMessages, { temperature: 0.2 });
  const brief = safeJsonParse<Brief>(briefRaw);
  validateBrief(brief);

  const briefJson = JSON.stringify(brief, null, 2);

  // 2) Draft (uses article-writing skill)
  const draftPrompt = DRAFT_PROMPT.replace("{{brief_json}}", briefJson);

  const draftMessages = buildMessages({
    userPrompt: draftPrompt,
    skills: ["article-writing"],
  });

  const draft = await llm(draftMessages, { temperature: 0.6 });
  validateArticle(draft, brief.primary_keyword);

  // 3) Edit + polish (uses article-editing skill)
  const editPrompt = EDIT_POLISH_PROMPT
    .replace("{{brief_json}}", briefJson)
    .replace("{{draft_markdown}}", draft);

  const editMessages = buildMessages({
    userPrompt: editPrompt,
    skills: ["article-editing"],
  });

  const finalArticle = await llm(editMessages, { temperature: 0.4 });
  validateArticle(finalArticle, brief.primary_keyword);

  return {
    brief,
    draft,
    final: finalArticle,
  };
}