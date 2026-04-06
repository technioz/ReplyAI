import { getOllamaCandidateOrigins } from './ollamaServerUrl';

export type OllamaProbeRow = {
  origin: string;
  ok: boolean;
  status?: number;
  error?: string;
};

/**
 * GET {origin}/api/tags — native Ollama endpoint (not /v1).
 * Use from /api/ai/ollama-health to see which origin is reachable from this container.
 */
export async function probeOllamaOrigins(timeoutMs = 4000): Promise<{
  tried: OllamaProbeRow[];
  workingOrigin: string | null;
}> {
  const origins = getOllamaCandidateOrigins();
  const tried: OllamaProbeRow[] = [];

  for (const origin of origins) {
    const u = `${origin}/api/tags`;
    try {
      const r = await fetch(u, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      tried.push({ origin, ok: r.ok, status: r.status });
    } catch (e) {
      tried.push({
        origin,
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const working = tried.find((r) => r.ok);
  return { tried, workingOrigin: working?.origin ?? null };
}
