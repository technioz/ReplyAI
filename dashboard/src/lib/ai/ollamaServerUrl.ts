/**
 * Server-side Ollama base URL (HTTP origin only, no path).
 *
 * In Docker/Coolify, localhost / 127.0.0.1 point at THIS container, not the host
 * or the Ollama container. Use the Ollama service hostname on the shared network,
 * e.g. http://ollama:11434
 *
 * OLLAMA_INTERNAL_BASE_URL overrides OLLAMA_BASE_URL so you can keep the latter
 * for documentation while the app uses an internal hostname in production.
 */
export function getOllamaServerOrigin(): string {
  const raw =
    process.env.OLLAMA_INTERNAL_BASE_URL?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    'http://localhost:11434';
  return raw.replace(/\/$/, '');
}

/** OpenAI-compatible API root, e.g. http://ollama:11434/v1 */
export function getOllamaV1BaseUrl(): string {
  return `${getOllamaServerOrigin()}/v1`;
}
