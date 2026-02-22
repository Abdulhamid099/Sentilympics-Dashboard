import OpenAI from 'openai';
import type { AnalysisResult } from '../types';
import { checkRateLimit } from '../utils/rateLimiter';

const ANALYZE_REQUEST_LIMIT = 5;
const ANALYZE_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_REVIEW_CHARS = 50_000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const buildAnalysisPrompt = (rawText: string) => `Analyze the following customer reviews.
If dates are missing, infer a realistic timeline for the trend chart.
Identify key sentiment trends, frequent complaints/praises, and actionable insights.

Reviews:
${rawText.slice(0, MAX_REVIEW_CHARS)}

Provide the analysis in the specified JSON format.`;

export const analyzeReviewsGPT = async (rawText: string): Promise<AnalysisResult> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API Key is missing.');
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
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert customer sentiment analyst. Analyze reviews and provide structured output.',
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
          schema: {
            type: 'object',
            properties: {
              sentimentTrend: {
                type: 'array',
                description: 'A list of data points extracted or inferred from the reviews representing sentiment over time.',
                items: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string',
                      description: 'ISO Date string (YYYY-MM-DD)',
                    },
                    sentiment: {
                      type: 'number',
                      description: 'Sentiment score from -100 (Negative) to 100 (Positive)',
                    },
                    snippet: {
                      type: 'string',
                      description: 'A very short excerpt (max 5 words) justifying the score',
                    },
                  },
                  required: ['date', 'sentiment', 'snippet'],
                },
              },
              wordCloud: {
                type: 'array',
                description: 'List of most frequent keywords or phrases categorized as complaint or praise.',
                items: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    value: {
                      type: 'number',
                      description: 'Frequency count (1-50)',
                    },
                    type: { type: 'string', enum: ['complaint', 'praise'] },
                  },
                  required: ['text', 'value', 'type'],
                },
              },
              summary: {
                type: 'object',
                properties: {
                  overview: {
                    type: 'string',
                    description: 'A concise executive summary paragraph.',
                  },
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
                    },
                  },
                },
                required: ['overview', 'actionableAreas'],
              },
            },
            required: ['sentimentTrend', 'wordCloud', 'summary'],
          },
        },
      },
    });

    const jsonText = response.choices[0]?.message?.content;
    if (!jsonText) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(jsonText) as AnalysisResult;
  } catch (error) {
    console.error('Analysis failed:', error);
    throw error;
  }
};

export const createChatSessionGPT = (contextData?: AnalysisResult) => {
  const defaultInstruction =
    'You are a helpful customer experience analyst assistant. Provide professional, concise answers.';

  let systemMessage = defaultInstruction;

  if (contextData) {
    const summary = JSON.stringify(contextData.summary);
    const complaints = contextData.wordCloud
      .filter((word) => word.type === 'complaint')
      .map((word) => word.text)
      .join(', ');

    systemMessage = `You are an expert analyst for a dashboard. The user has just analyzed reviews.
Summary: ${summary}. Top complaints: ${complaints}.
Provide concise, professional answers about CX strategy.`;
  }

  return {
    sendMessage: async ({ message }: { message: string }) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: message },
        ],
      });

      return {
        text: response.choices[0]?.message?.content ?? "I couldn't generate a response.",
      };
    },
  };
};