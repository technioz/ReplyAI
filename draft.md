export const DRAFT_PROMPT = `
Use the article-writing skill.

You are writing a full article based on the structured brief below.

The brief (JSON):

{{brief_json}}

Your job:

- Write a complete article in clean markdown.
- Follow the topic, audience, search intent, and reader level.
- Use the primary keyword naturally in the title, intro, and relevant sections.
- Use secondary and GEO keywords only where they fit naturally.
- Teach like a patient, competent teacher.
- Use simple language first, then detail.
- Use examples and short analogies when they help understanding.
- Make the hook strong and concrete.
- Avoid AI-sounding filler, corporate slang, and generic patterns.
- Make sure each section answers a real reader question.
- End with a clear next step, checklist, or practical move, not a summary.

Formatting rules:

- Start with a single H1 title line: "# ...".
- Use H2 and H3 headings only when they improve readability.
- Keep paragraphs short but meaningful.
- Use bullet lists for steps, options, or grouped points.
- Use numbered lists only when order matters.
- Use tables only if they truly help compare options or settings.
- Use fenced code blocks with language tags for commands, code, or configuration when relevant.
- Do not use emojis.
- Do not use decorative asterisks.
- Do not use em dashes.

Return ONLY the article markdown. Do not include the brief or any explanation.
`;