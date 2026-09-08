import {
  OllamaLLMProvider,
  OpenAILLMProvider,
  MockLLMProvider,
  getLLMProvider,
  RawLLMEvaluationSchema,
} from '../src/services/ai/llmProvider';
import {
  ElevenLabsTTSProvider,
  MockTTSProvider,
  getTTSProvider,
} from '../src/services/audio/tts/ttsProvider';
import {
  DeepgramSTTProvider,
  MockSTTProvider,
  OpenAIWhisperSTTProvider,
  getSTTProvider,
} from '../src/services/audio/stt/sttProvider';
import { env } from '../src/config/env';

describe('Real Development Providers & Factories', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...env };

  afterEach(() => {
    global.fetch = originalFetch;
    Object.assign(env, originalEnv);
    jest.restoreAllMocks();
  });

  describe('OllamaLLMProvider', () => {
    it('should successfully evaluate candidate answer when Ollama returns valid JSON', async () => {
      const mockOllamaResponse = {
        model: 'qwen3:8b',
        message: {
          role: 'assistant',
          content: JSON.stringify({
            technicalDepthScore: 4.2,
            problemSolvingScore: 4.0,
            practicalExpScore: 3.8,
            communicationScore: 4.5,
            directQuotes: ['I used PostgreSQL indexes'],
            keyStrengths: ['Good database understanding'],
            gapsIdentified: ['Could discuss B-Tree internals'],
            scoringRationale: 'Strong technical explanation with practical context.',
          }),
        },
        done: true,
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOllamaResponse,
      } as any);

      const provider = new OllamaLLMProvider('http://localhost:11434', 'qwen3:8b');
      const result = await provider.evaluateAnswer({
        questionText: 'How do you optimize SQL queries?',
        skillTag: 'PostgreSQL',
        difficultyLevel: 3,
        rawTranscript: 'In my last project, I used PostgreSQL indexes to improve read queries.',
      });

      expect(result.technicalDepthScore).toBe(4.2);
      expect(result.problemSolvingScore).toBe(4.0);
      expect(result.directQuotes).toEqual(['I used PostgreSQL indexes']);
      expect(result.keyStrengths).toContain('Good database understanding');
    });

    it('should parse JSON when Ollama returns JSON embedded inside markdown codeblock', async () => {
      const embeddedContent = '```json\n' + JSON.stringify({
        technicalDepthScore: 3.5,
        problemSolvingScore: 3.5,
        practicalExpScore: 3.0,
        communicationScore: 4.0,
        directQuotes: ['Node event loop'],
        keyStrengths: ['Clear terminology'],
        gapsIdentified: [],
        scoringRationale: 'Decent conceptual answer.',
      }) + '\n```';

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { role: 'assistant', content: embeddedContent },
        }),
      } as any);

      const provider = new OllamaLLMProvider();
      const result = await provider.evaluateAnswer({
        questionText: 'Explain the event loop',
        skillTag: 'Node.js',
        difficultyLevel: 2,
        rawTranscript: 'The Node event loop handles asynchronous callbacks.',
      });

      expect(result.technicalDepthScore).toBe(3.5);
      expect(result.directQuotes).toEqual(['Node event loop']);
    });

    it('should safely fall back to MockLLMProvider when Ollama is unreachable (network error)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('fetch failed: ECONNREFUSED'));

      const provider = new OllamaLLMProvider('http://localhost:11434', 'qwen3:8b');
      const result = await provider.evaluateAnswer({
        questionText: 'Explain microservices architecture.',
        skillTag: 'Architecture',
        difficultyLevel: 3,
        rawTranscript: 'Microservices allow independent deployment of service boundaries with isolated databases.',
      });

      expect(result).toBeDefined();
      expect(result.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
      expect(result.scoringRationale).toContain('difficulty level 3');
    });

    it('should fall back to MockLLMProvider when Ollama returns HTTP 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error in Ollama engine',
      } as any);

      const provider = new OllamaLLMProvider();
      const result = await provider.evaluateAnswer({
        questionText: 'What is CORS?',
        skillTag: 'Security',
        difficultyLevel: 1,
        rawTranscript: 'CORS is Cross-Origin Resource Sharing mechanism enforced by browsers.',
      });

      expect(result).toBeDefined();
      expect(result.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should fall back to MockLLMProvider when Ollama returns invalid JSON schema', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          message: {
            role: 'assistant',
            content: JSON.stringify({
              technicalDepthScore: 'invalid-non-numeric-score',
            }),
          },
        }),
      } as any);

      const provider = new OllamaLLMProvider();
      const result = await provider.evaluateAnswer({
        questionText: 'What is caching?',
        skillTag: 'Redis',
        difficultyLevel: 2,
        rawTranscript: 'Caching stores frequently accessed data in in-memory storage like Redis.',
      });

      expect(result).toBeDefined();
      expect(result.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
    });
  });

  describe('OpenAILLMProvider', () => {
    it('should fall back to MockLLMProvider if OPENAI_API_KEY is not set', async () => {
      env.OPENAI_API_KEY = '';
      const provider = new OpenAILLMProvider();
      const result = await provider.evaluateAnswer({
        questionText: 'What is indexing?',
        skillTag: 'SQL',
        difficultyLevel: 2,
        rawTranscript: 'Indexing creates a B-Tree structure for faster lookups in tables.',
      });

      expect(result).toBeDefined();
      expect(result.technicalDepthScore).toBeGreaterThanOrEqual(1.0);
    });

    it('should successfully evaluate when OpenAI API returns valid completion', async () => {
      env.OPENAI_API_KEY = 'sk-test-mock-key';
      const mockOpenAIResponse = {
        choices: [
          {
            message: {
              content: JSON.stringify({
                technicalDepthScore: 4.5,
                problemSolvingScore: 4.5,
                practicalExpScore: 4.0,
                communicationScore: 4.5,
                directQuotes: ['B-Tree structure'],
                keyStrengths: ['Accurate data structure explanation'],
                gapsIdentified: [],
                scoringRationale: 'Excellent explanation.',
              }),
            },
          },
        ],
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockOpenAIResponse,
      } as any);

      const provider = new OpenAILLMProvider();
      const result = await provider.evaluateAnswer({
        questionText: 'What is indexing?',
        skillTag: 'SQL',
        difficultyLevel: 2,
        rawTranscript: 'Indexing creates a B-Tree structure for faster lookups.',
      });

      expect(result.technicalDepthScore).toBe(4.5);
      expect(result.directQuotes).toEqual(['B-Tree structure']);
    });
  });

  describe('ElevenLabsTTSProvider', () => {
    it('should synthesize audio using ElevenLabs API', async () => {
      const mockAudioBytes = Buffer.from('fake-mp3-audio-bytes');
      const arrayBuf = mockAudioBytes.buffer.slice(
        mockAudioBytes.byteOffset,
        mockAudioBytes.byteOffset + mockAudioBytes.byteLength
      );
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => arrayBuf,
      } as any);

      const provider = new ElevenLabsTTSProvider('mock-elevenlabs-key');
      const result = await provider.synthesize('Welcome to your technical interview');

      expect(result.provider).toBe('ElevenLabsTTS');
      expect(result.mimeType).toBe('audio/mpeg');
      expect(result.audioBase64).toBe(mockAudioBytes.toString('base64'));
    });

    it('should throw ApiError when ElevenLabs API returns an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized - Invalid API Key',
      } as any);

      const provider = new ElevenLabsTTSProvider('invalid-key');
      await expect(provider.synthesize('Hello world')).rejects.toThrow(
        'ElevenLabs TTS provider failed to synthesize audio'
      );
    });
  });

  describe('DeepgramSTTProvider', () => {
    it('should transcribe audio using Deepgram API', async () => {
      const mockDeepgramResponse = {
        results: {
          channels: [
            {
              alternatives: [
                {
                  transcript: 'Hello and welcome to the interview.',
                  confidence: 0.96,
                },
              ],
            },
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockDeepgramResponse,
      } as any);

      const provider = new DeepgramSTTProvider('mock-deepgram-key');
      const result = await provider.transcribe(Buffer.from('test-audio-bytes'), {
        mimeType: 'audio/webm',
      });

      expect(result.provider).toBe('DeepgramSTT');
      expect(result.transcript).toBe('Hello and welcome to the interview.');
      expect(result.confidence).toBe(0.96);
    });

    it('should throw ApiError when Deepgram API returns an error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      } as any);

      const provider = new DeepgramSTTProvider('invalid-key');
      await expect(
        provider.transcribe(Buffer.from('test-audio-bytes'), { mimeType: 'audio/webm' })
      ).rejects.toThrow('Deepgram STT provider failed to process audio');
    });
  });

  describe('Provider Factory Functions', () => {
    describe('getLLMProvider', () => {
      it('should return OllamaLLMProvider when LLM_PROVIDER is ollama', () => {
        env.LLM_PROVIDER = 'ollama';
        const provider = getLLMProvider();
        expect(provider).toBeInstanceOf(OllamaLLMProvider);
      });

      it('should return OpenAILLMProvider when LLM_PROVIDER is openai and key is set', () => {
        env.LLM_PROVIDER = 'openai';
        env.OPENAI_API_KEY = 'sk-mock-key';
        const provider = getLLMProvider();
        expect(provider).toBeInstanceOf(OpenAILLMProvider);
      });

      it('should return MockLLMProvider when LLM_PROVIDER is mock', () => {
        env.LLM_PROVIDER = 'mock';
        const provider = getLLMProvider();
        expect(provider).toBeInstanceOf(MockLLMProvider);
      });
    });

    describe('getTTSProvider', () => {
      it('should return ElevenLabsTTSProvider when TTS_PROVIDER is elevenlabs and key is set', () => {
        env.TTS_PROVIDER = 'elevenlabs';
        env.ELEVENLABS_API_KEY = 'mock-eleven-key';
        const provider = getTTSProvider();
        expect(provider).toBeInstanceOf(ElevenLabsTTSProvider);
      });

      it('should throw badRequest when TTS_PROVIDER is elevenlabs but key is missing', () => {
        env.TTS_PROVIDER = 'elevenlabs';
        env.ELEVENLABS_API_KEY = '';
        expect(() => getTTSProvider()).toThrow('ELEVENLABS_API_KEY');
      });

      it('should return MockTTSProvider when TTS_PROVIDER is mock', () => {
        env.TTS_PROVIDER = 'mock';
        const provider = getTTSProvider();
        expect(provider).toBeInstanceOf(MockTTSProvider);
      });
    });

    describe('getSTTProvider', () => {
      it('should return DeepgramSTTProvider when STT_PROVIDER is deepgram and key is set', () => {
        env.STT_PROVIDER = 'deepgram';
        env.DEEPGRAM_API_KEY = 'mock-deepgram-key';
        const provider = getSTTProvider();
        expect(provider).toBeInstanceOf(DeepgramSTTProvider);
      });

      it('should throw badRequest when STT_PROVIDER is deepgram but key is missing', () => {
        env.STT_PROVIDER = 'deepgram';
        env.DEEPGRAM_API_KEY = '';
        expect(() => getSTTProvider()).toThrow('DEEPGRAM_API_KEY');
      });

      it('should return MockSTTProvider when STT_PROVIDER is mock', () => {
        env.STT_PROVIDER = 'mock';
        const provider = getSTTProvider();
        expect(provider).toBeInstanceOf(MockSTTProvider);
      });
    });
  });
});
