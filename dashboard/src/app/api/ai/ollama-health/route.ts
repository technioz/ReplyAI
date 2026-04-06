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
        ? `Use OLLAMA_INTERNAL_BASE_URL=${workingOrigin} (or OLLAMA_BASE_URL) so chat always hits this origin.`
        : 'None of the candidates responded. Add the Ollama container hostname on the shared Docker network, or set OLLAMA_TRY_GATEWAYS / OLLAMA_AUTO_BRIDGE_FALLBACK=1.',
    },
    { status: ok ? 200 : 503 }
  );
}
