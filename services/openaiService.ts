import OpenAI from 'openai';
import type { AnalysisResult } from '../types';
import { checkRateLimit } from '../utils/rateLimiter';

const ANALYZE_REQUEST_LIMIT = 5;
const ANALYZE_REQUEST_WINDOW_MS = 10 * 60 * 1000;
const MAX_REVIEW_CHARS = 50_000;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
});

const buildAnalysisPrompt = (rawText: string) =>
  `Analyze the following customer reviews in depth.
- If dates are missing, infer a realistic timeline for the sentiment trend chart.
- Identify clear sentiment trends, recurring complaints and praises, and concrete actionable insights.
- For wordCloud use meaningful phrases (e.g. "fast shipping", "poor support") with frequency 1-50.
- For summary give a concise executive overview and 1-5 actionable areas with title, description, and priority (High/Medium/Low).

Respond with ONLY a single JSON object (no markdown, no explanation) with this exact structure:
{
  "sentimentTrend": [ { "date": "YYYY-MM-DD", "sentiment": number from -100 to 100, "snippet": "short excerpt max 5 words" } ],
  "wordCloud": [ { "text": "phrase", "value": 1-50, "type": "complaint" or "praise" } ],
  "summary": { "overview": "string", "actionableAreas": [ { "title": "string", "description": "string", "priority": "High" or "Medium" or "Low" } ] }
}

Reviews:
${rawText.slice(0, MAX_REVIEW_CHARS)}`;

export const analyzeReviewsWithGPT = async (rawText: string): Promise<AnalysisResult> => {
  if (!process.env.OPENAI_API_KEY?.trim()) {
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

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert customer experience analyst. You produce precise, insightful sentiment analysis: clear trends over time, high-value keywords (complaints vs praise), and actionable recommendations with priorities. Output only valid JSON with no markdown or extra text.`,
      },
      {
        role: 'user',
        content: buildAnalysisPrompt(rawText),
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw?.trim()) {
    throw new Error('No response from OpenAI');
  }

  return JSON.parse(raw.trim()) as AnalysisResult;
};
