/**
 * Server-side Ollama base URL (HTTP origin only, no path).
 *
 * In Docker/Coolify, localhost / 127.0.0.1 point at THIS container, not Ollama.
 * Use the Ollama service hostname on the same Docker network, e.g. http://ollama:11434
 *
 * OLLAMA_INTERNAL_BASE_URL overrides OLLAMA_BASE_URL for server-side calls.
 */

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

export function getOllamaServerOrigin(): string {
  const raw =
    process.env.OLLAMA_INTERNAL_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    'http://localhost:11434';
  return normalizeOrigin(raw);
}

/** OpenAI-compatible API root, e.g. http://ollama:11434/v1 */
export function getOllamaV1BaseUrl(): string {
  return `${getOllamaServerOrigin()}/v1`;
}

/**
 * Origins to try for Ollama HTTP (in order).
 * - Primary from INTERNAL_BASE_URL / BASE_URL
 * - Plus OLLAMA_TRY_GATEWAYS (comma-separated), e.g. http://172.17.0.1:11434
 * - If OLLAMA_AUTO_BRIDGE_FALLBACK=1 and primary is localhost/127.0.0.1, append common Docker→host gateways
 */
export function getOllamaCandidateOrigins(): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (o: string) => {
    const n = normalizeOrigin(o);
    if (!n || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };

  push(getOllamaServerOrigin());

  const extras =
    process.env.OLLAMA_TRY_GATEWAYS?.split(/[,|]+/).map((s) => s.trim()).filter(Boolean) ?? [];
  for (const e of extras) push(e);

  const primary = getOllamaServerOrigin();
  const looksLikeLoopback =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(primary) ||
    primary === 'http://127.0.0.1:11434';

  if (process.env.OLLAMA_AUTO_BRIDGE_FALLBACK === '1' && looksLikeLoopback) {
    push('http://172.17.0.1:11434');
    push('http://172.18.0.1:11434');
    push('http://host.docker.internal:11434');
  }

  return out;
}

export function getOllamaCandidateV1Bases(): string[] {
  return getOllamaCandidateOrigins().map((o) => `${o}/v1`);
}
