export const EDIT_POLISH_PROMPT = `
Use the article-editing skill.

You are editing and polishing the article below.

Original brief (JSON):
{{brief_json}}

Draft article (markdown):
{{draft_markdown}}

Your tasks:

1) Clean AI patterns
- Remove or rewrite AI-sounding phrases.
- Remove inflated symbolism, vague importance claims, and generic optimism.
- Remove list-template filler and repeated points.
- Remove business-speak and generic SEO boilerplate.

2) Improve voice and teaching
- Strengthen the hook if it is weak or generic.
- Make explanations clearer and more direct.
- Add or sharpen examples where they are clearly needed.
- Use analogies only when they reduce confusion.
- Make sure a beginner in the audience can follow the logic step by step.

3) Improve rhythm and flow
- Vary sentence length naturally.
- Simplify stiff or repetitive transitions.
- Merge or split paragraphs where it improves readability.
- Reorder sections ONLY if the flow obviously improves.

4) Preserve SEO and GEO value
- Keep the primary keyword present in a natural way.
- Keep secondary and GEO keywords where they make sense.
- Make headings helpful for scanning and search, not stuffed.
- Do not delete genuine topical signals just to shorten.

5) Support future X repurposing
- Strengthen lines that could later become good X posts or thread segments.
- Keep some clean, tight one-liners that still sound honest and grounded.
- Do not turn the whole article into tweet-style writing.

Formatting constraints:

- Keep valid markdown.
- Keep a single H1 title at the top.
- Use H2/H3 headings where they help the reader.
- No emojis.
- No decorative asterisks.
- No em dashes. Use simple punctuation instead.
- No meta comments about editing, prompts, or skills.

Important:

- Preserve the core meaning and intent from the draft.
- Do not invent new facts.
- Do not weaken correct technical content.
- Do not shorten aggressively unless the draft is clearly bloated.

Return ONLY the edited article markdown. No commentary or notes.
`;