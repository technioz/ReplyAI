/**
 * Server-side Ollama base URL (HTTP origin only, no path).
 *
 * In Docker/Coolify, localhost / 127.0.0.1 point at THIS container, not Ollama.
 * If `curl http://localhost:11434` works on the **host shell** but not from the app,
 * Ollama is bound to the host — use the container→host gateway (see OLLAMA_DISCOVER_HOST_GATEWAY).
 */

import fs from 'fs';

function normalizeOrigin(raw: string): string {
  return raw.trim().replace(/\/$/, '');
}

export function getOllamaHostPort(): string {
  return (process.env.OLLAMA_PORT || '11434').trim();
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

/** Linux: default-route gateway from /proc/net/route (often Docker bridge → host). */
function readLinuxDefaultGatewayIp(): string | null {
  if (process.platform !== 'linux') return null;
  try {
    const raw = fs.readFileSync('/proc/net/route', 'utf8');
    for (const line of raw.trim().split('\n').slice(1)) {
      const p = line.trim().split(/\s+/);
      if (p.length < 3) continue;
      if (p[1] === '00000000' && p[2] !== '00000000') {
        return gatewayHexToIPv4(p[2]);
      }
    }
  } catch {
    return null;
  }
  return null;
}

function gatewayHexToIPv4(hex: string): string | null {
  if (!hex || hex === '00000000') return null;
  const v = parseInt(hex, 16);
  if (!Number.isFinite(v)) return null;
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff].join('.');
}

/**
 * Origin pointing at Ollama on the **host** when the container’s default gateway is the host
 * (typical when Ollama publishes -p 11434:11434 and host curl localhost works).
 */
export function getDiscoveredHostGatewayOrigin(): string | null {
  const ip = readLinuxDefaultGatewayIp();
  if (!ip) return null;
  return `http://${ip}:${getOllamaHostPort()}`;
}

/**
 * Origins to try for Ollama HTTP (in order).
 * - Primary from INTERNAL_BASE_URL / BASE_URL
 * - OLLAMA_TRY_GATEWAYS (comma-separated)
 * - OLLAMA_DISCOVER_HOST_GATEWAY=1: append http://<default-route-gateway>:OLLAMA_PORT (Linux /proc/net/route)
 * - OLLAMA_AUTO_BRIDGE_FALLBACK=1 and primary is localhost: same discovery + common bridge IPs + host.docker.internal
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

  const port = getOllamaHostPort();

  if (process.env.OLLAMA_DISCOVER_HOST_GATEWAY === '1') {
    const o = getDiscoveredHostGatewayOrigin();
    if (o) push(o);
  }

  if (process.env.OLLAMA_AUTO_BRIDGE_FALLBACK === '1' && looksLikeLoopback) {
    const o = getDiscoveredHostGatewayOrigin();
    if (o) push(o);
    push(`http://172.17.0.1:${port}`);
    push(`http://172.18.0.1:${port}`);
    push(`http://host.docker.internal:${port}`);
  }

  return out;
}

export function getOllamaCandidateV1Bases(): string[] {
  return getOllamaCandidateOrigins().map((o) => `${o}/v1`);
}
