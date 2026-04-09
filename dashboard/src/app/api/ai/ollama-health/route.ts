import { NextResponse } from 'next/server';
import { getOllamaCandidateOrigins } from '@/lib/ai/ollamaServerUrl';
import { probeOllamaOrigins } from '@/lib/ai/ollamaProbe';

/**
 * Debug: which Ollama HTTP origin responds from THIS container (GET /api/tags per candidate).
 * Does not require auth — protect this route in production if your deployment is public.
 */
export async function GET() {
  const { tried, workingOrigin } = await probeOllamaOrigins();
  const ok = tried.some((r) => r.ok);

  return NextResponse.json(
    {
      ok,
      workingOrigin,
      candidates: getOllamaCandidateOrigins(),
      probe: tried,
      hint: ok
        ? `Set OLLAMA_INTERNAL_BASE_URL=${workingOrigin} (or OLLAMA_BASE_URL) so generation uses this origin.`
        : `Point OLLAMA_INTERNAL_BASE_URL at your Ollama service on the same Coolify/Docker network ` +
          `(e.g. http://ollama:11434 — use the real service/container name, not localhost). ` +
          `GET /api/ai/ollama-health probes only URLs from your env (OLLAMA_TRY_GATEWAYS adds more).`,
    },
    { status: ok ? 200 : 503 }
  );
}
