import { NextResponse } from 'next/server';
import { getDiscoveredHostGatewayOrigin, getOllamaCandidateOrigins } from '@/lib/ai/ollamaServerUrl';
import { getOllamaProbeOrigins } from '@/lib/ai/ollamaProbe';
import { probeOllamaOrigins } from '@/lib/ai/ollamaProbe';

/**
 * Debug: which Ollama HTTP origin responds from THIS container (GET /api/tags per candidate).
 * Does not require auth — protect this route in production if your deployment is public.
 */
export async function GET() {
  const { tried, workingOrigin } = await probeOllamaOrigins();
  const ok = tried.some((r) => r.ok);
  const discoveredHost = getDiscoveredHostGatewayOrigin();

  return NextResponse.json(
    {
      ok,
      workingOrigin,
      discoveredHostGatewayOrigin: discoveredHost,
      candidates: getOllamaCandidateOrigins(),
      probedOrigins: getOllamaProbeOrigins(),
      probe: tried,
      hint: ok
        ? `Use OLLAMA_INTERNAL_BASE_URL=${workingOrigin} (or OLLAMA_BASE_URL) so chat always hits this origin.`
        : `Host shell: curl http://localhost:11434 works, but the app runs in a container where localhost is not the host. ` +
          `Set OLLAMA_DISCOVER_HOST_GATEWAY=1 (Linux: uses default gateway from /proc/net/route, often ${discoveredHost || 'e.g. http://172.17.0.1:11434'}) ` +
          `or OLLAMA_AUTO_BRIDGE_FALLBACK=1, or OLLAMA_TRY_GATEWAYS with your host bridge IP.`,
    },
    { status: ok ? 200 : 503 }
  );
}
