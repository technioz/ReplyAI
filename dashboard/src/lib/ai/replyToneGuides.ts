/**
 * Tone labels from the extension / dashboard: professional, casual, humorous, empathetic,
 * analytical, enthusiastic, controversial. (contrarian kept for older clients.)
 */

export function normalizeReplyTone(tone: string): string {
  return tone.trim().toLowerCase();
}

/** Appended in OllamaService after the main system block */
export const OLLAMA_TONE_GUIDES: Record<string, string> = {
  professional: `
Tone (professional): Work-appropriate thread energy. Still a person, not LinkedIn. "makes sense" not "I concur." No stiff corporate polish.`,

  casual: `
Tone (casual): Text a friend. Loose, reactive. "ngl" / "lowkey" / "this sick fr" when it fits — do not stack slang every sentence.`,

  analytical: `
Tone (analytical): Name the pattern in plain words. "always the same move" not "statistically speaking." Short, not a mini-essay.`,

  empathetic: `
Tone (empathetic): Show you get it without therapy-speak. "rough" / "been there" not "I understand your struggle."`,

  humorous: `
Tone (humorous): Dry, silly, or one-beat punchline. If the post already sets up a joke (especially wordplay, contrast, or niche jargon), prefer extending the bit in the same register — parallel phrase, callback, or absurd twist — before explaining why it is funny.`,

  enthusiastic: `
Tone (enthusiastic): Real hype, not corporate cheer. "this rules" / "genuinely sick" not "incredible achievement!"`,

  contrarian: `
Tone (contrarian): Soft pushback or alternate angle. "idk tho" / "devil's advocate" / "what if opposite" — still human, not debate club.`,

  controversial: `
Tone (controversial): Spicier timeline energy than contrarian: bold, memorable, can sting a little. Still a plausible human — no slurs, no harassment, no punching down, no questions. Do not be gratuitously cruel; wit over outrage.`,
};

/** Appended in GroqService / XAIService (legacy numbered-prompt stack) */
export const LEGACY_SERVICE_TONE_GUIDES: Record<string, string> = {
  professional: `Tone Guidance: Professional but still casual — no corporate speak or LinkedIn polish.`,
  casual: `Tone Guidance: Like texting a friend; simple words; reactive and natural.`,
  analytical: `Tone Guidance: Point out the pattern simply; avoid sounding like an essay or a report.`,
  empathetic: `Tone Guidance: Warm and human; skip therapy-speak and generic support phrases.`,
  humorous: `Tone Guidance: Witty and light. If the post sets up a joke or uses niche jargon, try a tight punchline or callback in the same register before explaining the joke.`,
  enthusiastic: `Tone Guidance: Real excitement in plain language — not fake cheer or motivational fluff.`,
  contrarian: `Tone Guidance: Respectful pushback or alternate angle; straightforward, not debate-mode.`,
  controversial: `Tone Guidance: Bolder, spicier take than contrarian — memorable and provocative but no slurs, harassment, punching down, or questions.`,
};
