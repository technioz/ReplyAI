import { vi } from 'vitest';

// Mock environment variables for tests
process.env.OLLAMA_MODEL = 'gemma3:4b';
process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

// Global fetch mock setup (can be overridden per test)
global.fetch = vi.fn();
