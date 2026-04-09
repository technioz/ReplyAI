import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaService } from './OllamaService';
import type { Mock } from 'vitest';

describe('OllamaService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Local Ollama', () => {
    it('should initialize with local Ollama when OLLAMA_USE_CLOUD is not set', () => {
      delete process.env.OLLAMA_USE_CLOUD;
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

      const service = new OllamaService();

      expect(service).toBeDefined();
    });

    it('should initialize with local Ollama when OLLAMA_USE_CLOUD is false', () => {
      process.env.OLLAMA_USE_CLOUD = 'false';
      process.env.OLLAMA_BASE_URL = 'http://localhost:11434';

      const service = new OllamaService();

      expect(service).toBeDefined();
    });
  });

  describe('Cloud Ollama', () => {
    beforeEach(() => {
      process.env.OLLAMA_USE_CLOUD = 'true';
      process.env.OLLAMA_CLOUD_API_KEY = 'test-api-key';
    });

    it('should initialize with cloud Ollama when OLLAMA_USE_CLOUD is true', () => {
      const service = new OllamaService();

      expect(service).toBeDefined();
    });

    it('should call cloud API endpoint when useCloud is true', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Test reply from cloud' },
          done: true,
          eval_count: 10,
          prompt_eval_count: 20,
        }),
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();
      const result = await service.generateReply('Test post', 'enthusiastic', {});

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ollama.com/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
          }),
        })
      );
      expect(result.reply).toBe('Test reply from cloud');
    });

    it('should include Authorization header with API key', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Reply' },
          done: true,
        }),
      });
      global.fetch = mockFetch as Mock;

      process.env.OLLAMA_CLOUD_API_KEY = '98c91a2fd69a461d8f9381a70318a1f4.OflC-IutDFXHD2Il-_NxenzC';
      const service = new OllamaService();
      await service.generateReply('Test post', 'enthusiastic', {});

      const callArgs = mockFetch.mock.calls[0];
      const headers = callArgs[1].headers;
      expect(headers['Authorization']).toBe(
        'Bearer 98c91a2fd69a461d8f9381a70318a1f4.OflC-IutDFXHD2Il-_NxenzC'
      );
    });

    it('should warn when API key is not set for cloud', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      delete process.env.OLLAMA_CLOUD_API_KEY;

      new OllamaService();

      expect(consoleSpy).toHaveBeenCalledWith(
        'OLLAMA_CLOUD_API_KEY is not set. Cloud Ollama API requires an API key.'
      );
    });

    it('should throw error when cloud API returns error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ error: 'Unauthorized' }),
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();

      await expect(service.generateReply('Test', 'enthusiastic', {}))
        .rejects.toThrow('Ollama Cloud API error: Unauthorized');
    });

    it('should throw error when response is invalid', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'response' }),
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();

      await expect(service.generateReply('Test', 'enthusiastic', {}))
        .rejects.toThrow('Invalid response from Ollama Cloud API');
    });

    it('should include processing time in response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Test reply' },
          done: true,
          eval_count: 15,
          prompt_eval_count: 25,
        }),
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();
      const result = await service.generateReply('Test', 'enthusiastic', {});

      expect(result.processingTime).toEqual({
        promptTokens: 25,
        completionTokens: 15,
        totalTokens: 40,
      });
    });
  });

  describe('API Response Parsing', () => {
    it('should correctly parse cloud API response structure', async () => {
      process.env.OLLAMA_USE_CLOUD = 'true';
      process.env.OLLAMA_CLOUD_API_KEY = 'test-key';

      const mockResponse = {
        model: 'gemma3:4b',
        created_at: '2024-01-09T04:19:00.708121402Z',
        message: {
          role: 'assistant',
          content: 'That is incredible! Running truly is transformative.'
        },
        done: true,
        done_reason: 'stop',
        total_duration: 404372036,
        prompt_eval_count: 81,
        eval_count: 16
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();
      const result = await service.generateReply('Running post', 'enthusiastic', {});

      expect(result.reply).toBe('That is incredible! Running truly is transformative.');
    });
  });

  describe('Environment Configuration', () => {
    it('should use default model when OLLAMA_MODEL is not set', () => {
      delete process.env.OLLAMA_MODEL;
      process.env.OLLAMA_USE_CLOUD = 'true';
      process.env.OLLAMA_CLOUD_API_KEY = 'test-key';

      const service = new OllamaService();

      expect(service).toBeDefined();
    });

    it('should use custom model from environment', async () => {
      process.env.OLLAMA_USE_CLOUD = 'true';
      process.env.OLLAMA_CLOUD_API_KEY = 'test-key';
      process.env.OLLAMA_MODEL = 'custom-model';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Reply' },
          done: true,
        }),
      });
      global.fetch = mockFetch as Mock;

      const service = new OllamaService();
      await service.generateReply('Test', 'enthusiastic', {});

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.model).toBe('custom-model');
    });
  });
});
