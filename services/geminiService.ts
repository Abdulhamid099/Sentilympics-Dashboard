import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult } from "../types";
import { checkRateLimit } from "../utils/rateLimiter";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    sentimentTrend: {
      type: Type.ARRAY,
      description: "A list of data points extracted or inferred from the reviews representing sentiment over time.",
      items: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING, description: "ISO Date string (YYYY-MM-DD)" },
          sentiment: { type: Type.NUMBER, description: "Sentiment score from -100 (Negative) to 100 (Positive)" },
          snippet: { type: Type.STRING, description: "A very short excerpt (max 5 words) justifying the score" }
        },
        required: ["date", "sentiment", "snippet"]
      }
    },
    wordCloud: {
      type: Type.ARRAY,
      description: "List of most frequent keywords or phrases categorized as complaint or praise.",
      items: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          value: { type: Type.NUMBER, description: "Frequency count (1-50)" },
          type: { type: Type.STRING, enum: ["complaint", "praise"] }
        },
        required: ["text", "value", "type"]
      }
    },
    summary: {
      type: Type.OBJECT,
      properties: {
        overview: { type: Type.STRING, description: "A concise executive summary paragraph." },
        actionableAreas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] }
            },
            required: ["title", "description", "priority"]
          }
        }
      },
      required: ["overview", "actionableAreas"]
    }
  },
  required: ["sentimentTrend", "wordCloud", "summary"]
};

export const analyzeReviews = async (rawText: string): Promise<AnalysisResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  // Rate limit: 5 analyses per 10 minutes
  const limit = checkRateLimit('analysis', 5, 10 * 60 * 1000);
  if (!limit.allowed) {
    throw new Error(`RATE_LIMIT_EXCEEDED|${limit.resetTime}`);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Analyze the following customer reviews. If dates are missing, infer a realistic timeline for the trend chart. Identify key sentiment trends, frequent complaints/praises, and actionable insights.
      
      Reviews:
      ${rawText.slice(0, 50000)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        thinkingConfig: {
          thinkingBudget: 32768,
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No response from AI");
    
    return JSON.parse(jsonText.trim()) as AnalysisResult;
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const createChatSession = (contextData?: AnalysisResult) => {
  let systemInstruction = "You are a helpful customer experience analyst assistant. You have access to Google Search to provide real-time information.";
  
  if (contextData) {
    const summary = JSON.stringify(contextData.summary);
    const complaints = contextData.wordCloud.filter(w => w.type === 'complaint').map(w => w.text).join(', ');
    systemInstruction = `You are an expert analyst for a dashboard. The user has just analyzed reviews. 
    Summary: ${summary}. Top complaints: ${complaints}.
    
    Use Google Search to find industry benchmarks or competitor comparisons.
    Provide concise, professional answers about CX strategy.`;
  }

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction,
      tools: [{ googleSearch: {} }],
    }
  });
};