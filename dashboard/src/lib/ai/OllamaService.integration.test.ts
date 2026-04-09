import { describe, it, expect, beforeAll } from 'vitest';
import { OllamaService } from './OllamaService';

/**
 * Integration tests for Ollama Cloud API
 * These tests make actual API calls and require a valid API key
 * Set SKIP_INTEGRATION_TESTS=true to skip these tests
 */
const shouldSkip = process.env.SKIP_INTEGRATION_TESTS === 'true';

// Use the describe.skipIf pattern to skip tests conditionally
const describeIf = shouldSkip ? describe.skip : describe;

describeIf('OllamaService Integration Tests', () => {
  const apiKey = process.env.OLLAMA_CLOUD_API_KEY || '98c91a2fd69a461d8f9381a70318a1f4.OflC-IutDFXHD2Il-_NxenzC';

  beforeAll(() => {
    // Set environment for cloud mode
    process.env.OLLAMA_USE_CLOUD = 'true';
    process.env.OLLAMA_CLOUD_API_KEY = apiKey;
    process.env.OLLAMA_MODEL = 'gemma3:4b';
  });

  it('should successfully call Ollama Cloud API', async () => {
    const service = new OllamaService();

    const result = await service.generateReply(
      'Just finished a 10-mile run and feeling amazing! Running has changed my life.',
      'enthusiastic',
      {}
    );

    // Verify response structure
    expect(result).toHaveProperty('reply');
    expect(result).toHaveProperty('processingTime');
    expect(typeof result.reply).toBe('string');
    expect(result.reply.length).toBeGreaterThan(0);

    // Verify processing time
    expect(result.processingTime).not.toBeNull();
    expect(result.processingTime).toHaveProperty('promptTokens');
    expect(result.processingTime).toHaveProperty('completionTokens');
    expect(result.processingTime).toHaveProperty('totalTokens');

    console.log('Generated reply:', result.reply);
    console.log('Processing time:', result.processingTime);
  }, 30000); // 30 second timeout for API call

  it('should generate appropriate replies for different tones', async () => {
    const service = new OllamaService();
    const post = 'Just launched my new startup today!';

    const tones = ['professional', 'casual', 'enthusiastic'];

    for (const tone of tones) {
      const result = await service.generateReply(post, tone, {});
      expect(result.reply).toBeTruthy();
      expect(result.reply.length).toBeLessThan(280); // X character limit
      console.log(`[${tone}] ${result.reply}`);
    }
  }, 60000); // 60 second timeout for multiple calls

  it('should handle errors gracefully with invalid API key', async () => {
    // Temporarily use invalid key
    process.env.OLLAMA_CLOUD_API_KEY = 'invalid-key';

    const service = new OllamaService();

    await expect(service.generateReply('Test post', 'enthusiastic', {}))
      .rejects.toThrow();

    // Restore key
    process.env.OLLAMA_CLOUD_API_KEY = apiKey;
  });
});

/**
 * These tests always run to verify the service structure
 */
describe('OllamaService Structure Tests', () => {
  it('should expose the correct methods', () => {
    const service = new OllamaService();
    expect(service.generateReply).toBeDefined();
    expect(typeof service.generateReply).toBe('function');
  });
});
