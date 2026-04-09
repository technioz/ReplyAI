# Testing

This project uses [Vitest](https://vitest.dev/) for testing.

## Test Commands

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run only unit tests (skip integration tests)
npx vitest run src/lib/ai/OllamaService.test.ts
```

## Test Structure

- **Unit Tests**: `*.test.ts` - Fast, isolated tests with mocked dependencies
- **Integration Tests**: `*.integration.test.ts` - Tests that make actual API calls

## Test Files

- `src/lib/ai/OllamaService.test.ts` - Unit tests for Ollama Cloud API integration
  - Tests cloud/local mode initialization
  - Tests API endpoint routing
  - Tests error handling
  - Tests response parsing

- `src/lib/ai/OllamaService.integration.test.ts` - Integration tests
  - Makes actual API calls to Ollama Cloud
  - Requires valid `OLLAMA_CLOUD_API_KEY` in environment
  - Set `SKIP_INTEGRATION_TESTS=true` to skip these in CI

## Environment Variables for Testing

```bash
# For unit tests (uses mocks)
OLLAMA_MODEL=gemma3:4b
OLLAMA_BASE_URL=http://localhost:11434

# For integration tests (requires actual API key)
OLLAMA_USE_CLOUD=true
OLLAMA_CLOUD_API_KEY=your-api-key
SKIP_INTEGRATION_TESTS=true  # Skip integration tests in CI
```

## Writing Tests

### Unit Tests

Use mocked `fetch` for external API calls:

```typescript
import { vi } from 'vitest';
import { OllamaService } from './OllamaService';

const mockFetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ message: { content: 'Test reply' } }),
});
global.fetch = mockFetch;
```

### Integration Tests

Make actual API calls (controlled with environment):

```typescript
describe('Integration Tests', () => {
  beforeAll(() => {
    if (process.env.SKIP_INTEGRATION_TESTS) {
      return;
    }
    // Set up environment
  });
  
  it('should call real API', async () => {
    const service = new OllamaService();
    const result = await service.generateReply('Test', 'enthusiastic', {});
    expect(result.reply).toBeDefined();
  });
});
```

## Coverage

Coverage reports are generated in the `coverage/` directory when running `npm run test:coverage`.
