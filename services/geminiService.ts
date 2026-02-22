import { GoogleGenAI, type Schema, Type } from '@google/genai';
import type { AnalysisResult } from '../types';
import { checkRateLimit } from '../utils/rateLimiter';

const ANALYZE_REQUEST_LIMIT = 5;
const ANALYZE_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_REVIEW_CHARS = 50_000;

const geminiApiKey = process.env.API_KEY;
const openAIApiKey = process.env.OPENAI_API_KEY;
const hasGemini = Boolean(geminiApiKey);
const hasOpenAI = Boolean(openAIApiKey);

const ai = hasGemini ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentimentTrend: {
      type: Type.ARRAY,
      description:
        'A list of data points extracted or inferred from the reviews representing sentiment over time.',
      items: {
        type: Type.OBJECT,
        properties: {
          date: {
            type: Type.STRING,
            description: 'ISO Date string (YYYY-MM-DD)',
          },
          sentiment: {
            type: Type.NUMBER,
            description: 'Sentiment score from -100 (Negative) to 100 (Positive)',
          },
          snippet: {
            type: Type.STRING,
            description: 'A very short excerpt (max 5 words) justifying the score',
          },
        },
        required: ['date', 'sentiment', 'snippet'],
      },
    },
    wordCloud: {
      type: Type.ARRAY,
      description: 'List of most frequent keywords or phrases categorized as complaint or praise.',
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          value: {
            type: Type.NUMBER,
            description: 'Frequency count (1-50)',
          },
          type: { type: Type.STRING, enum: ['complaint', 'praise'] },
        },
        required: ['text', 'value', 'type'],
      },
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        overview: {
          type: Type.STRING,
          description: 'A concise executive summary paragraph.',
        },
        actionableAreas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            },
            required: ['title', 'description', 'priority'],
          },
        },
      },
      required: ['overview', 'actionableAreas'],
    },
  },
  required: ['sentimentTrend', 'wordCloud', 'summary'],
};

const openAIAnalysisSchema = {
  type: 'object',
  properties: {
    sentimentTrend: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string' },
          sentiment: { type: 'number' },
          snippet: { type: 'string' },
        },
        required: ['date', 'sentiment', 'snippet'],
        additionalProperties: false,
      },
    },
    wordCloud: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          value: { type: 'number' },
          type: { type: 'string', enum: ['complaint', 'praise'] },
        },
        required: ['text', 'value', 'type'],
        additionalProperties: false,
      },
    },
    summary: {
      type: 'object',
      properties: {
        overview: { type: 'string' },
        actionableAreas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              priority: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            },
            required: ['title', 'description', 'priority'],
            additionalProperties: false,
          },
        },
      },
      required: ['overview', 'actionableAreas'],
      additionalProperties: false,
    },
  },
  required: ['sentimentTrend', 'wordCloud', 'summary'],
  additionalProperties: false,
} as const;

const buildAnalysisPrompt = (rawText: string) => `Analyze the following customer reviews.
If dates are missing, infer a realistic timeline for the trend chart.
Identify key sentiment trends, frequent complaints/praises, and actionable insights.

Reviews:
${rawText.slice(0, MAX_REVIEW_CHARS)}`;

const getGeminiClient = () => {
  if (!ai) {
    throw new Error('Gemini API Key is missing.');
  }

  return ai;
};

const parseOpenAIJson = (content: string): AnalysisResult => {
  const parsed = JSON.parse(content.trim()) as AnalysisResult;
  return parsed;
};

const callOpenAIAnalysis = async (rawText: string): Promise<AnalysisResult> => {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert customer experience analyst. Return only valid JSON matching the requested schema.',
        },
        {
          role: 'user',
          content: buildAnalysisPrompt(rawText),
        },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'analysis_result',
          strict: true,
          schema: openAIAnalysisSchema,
        },
      },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  return parseOpenAIJson(content);
};

const callGeminiAnalysis = async (rawText: string): Promise<AnalysisResult> => {
  const gemini = getGeminiClient();
  const response = await gemini.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: buildAnalysisPrompt(rawText),
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema,
      thinkingConfig: {
        thinkingBudget: 32768,
      },
    },
  });

  const jsonText = response.text;
  if (!jsonText) {
    throw new Error('No response from AI');
  }

  return JSON.parse(jsonText.trim()) as AnalysisResult;
};

export const analyzeReviews = async (rawText: string): Promise<AnalysisResult> => {
  if (!hasOpenAI && !hasGemini) {
    throw new Error('No AI API key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.');
  }

  const limit = checkRateLimit(
    'analysis',
    ANALYZE_REQUEST_LIMIT,
    ANALYZE_REQUEST_WINDOW_MS,
  );

  if (!limit.allowed) {
    throw new Error(`RATE_LIMIT_EXCEEDED|${limit.resetTime}`);
  }

  try {
    if (hasOpenAI) {
      return await callOpenAIAnalysis(rawText);
    }

    return await callGeminiAnalysis(rawText);
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
};

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          title: string;
          uri: string;
        };
      }>;
    };
  }>;
}

interface ChatSession {
  sendMessage: (request: ChatRequest) => Promise<ChatResponse>;
}

const defaultInstruction =
  'You are a helpful customer experience analyst assistant. Give concise, practical guidance.';

const buildContextInstruction = (contextData?: AnalysisResult) => {
  if (!contextData) {
    return defaultInstruction;
  }

  const summary = JSON.stringify(contextData.summary);
  const complaints = contextData.wordCloud
    .filter((word) => word.type === 'complaint')
    .map((word) => word.text)
    .join(', ');

  return `You are an expert analyst for a dashboard. The user has just analyzed reviews.
Summary: ${summary}. Top complaints: ${complaints}.
Provide concise, professional answers about CX strategy.`;
};

const createOpenAIChatSession = (contextData?: AnalysisResult): ChatSession => {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key is missing.');
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: buildContextInstruction(contextData),
    },
  ];

  return {
    sendMessage: async ({ message }: ChatRequest) => {
      messages.push({ role: 'user', content: message });

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OPENAI_CHAT_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
          messages,
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenAI chat failed (${response.status}): ${errorBody}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };

      const text = data.choices?.[0]?.message?.content?.trim();
      if (!text) {
        throw new Error('No response from OpenAI chat model');
      }

      messages.push({ role: 'assistant', content: text });
      return { text };
    },
  };
};

const createGeminiChatSession = (contextData?: AnalysisResult) => {
  const gemini = getGeminiClient();

  if (!contextData) {
    return gemini.chats.create({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: defaultInstruction,
        tools: [{ googleSearch: {} }],
      },
    });
  }

  const summary = JSON.stringify(contextData.summary);
  const complaints = contextData.wordCloud
    .filter((word) => word.type === 'complaint')
    .map((word) => word.text)
    .join(', ');

  return gemini.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are an expert analyst for a dashboard. The user has just analyzed reviews.
Summary: ${summary}. Top complaints: ${complaints}.
Use Google Search to find industry benchmarks or competitor comparisons.
Provide concise, professional answers about CX strategy.`,
      tools: [{ googleSearch: {} }],
    },
  });
};

export const createChatSession = (contextData?: AnalysisResult): ChatSession => {
  if (hasOpenAI) {
    return createOpenAIChatSession(contextData);
  }

  if (hasGemini) {
    return createGeminiChatSession(contextData) as ChatSession;
  }

  return {
    sendMessage: async () => ({
      text: 'AI is not configured. Add OPENAI_API_KEY or GEMINI_API_KEY in .env.local and restart the app.',
    }),
  };
};

