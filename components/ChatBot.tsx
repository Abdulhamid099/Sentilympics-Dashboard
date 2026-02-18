import { AlertCircle, ExternalLink, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';
import { createChatSession } from '../services/geminiService';
import type { AnalysisResult, ChatMessage, Source } from '../types';
import { checkRateLimit, getWaitTimeMinutes } from '../utils/rateLimiter';

interface Props {
  contextData?: AnalysisResult;
}

interface GroundingChunk {
  web?: {
    title: string;
    uri: string;
  };
}

interface ChatResponse {
  text?: string;
  candidates?: Array<{
    groundingMetadata?: {
      groundingChunks?: GroundingChunk[];
    };
  }>;
}

const welcomeMessage = (hasContext: boolean): ChatMessage => ({
  id: 'welcome',
  role: 'model',
  text: hasContext
    ? 'Analyst ready. How can I help with these results?'
    : 'Hello. I can help analyze CX data or trends.',
  timestamp: new Date(),
});

const ChatBotComponent = ({ contextData }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatSessionRef = useRef<ReturnType<typeof createChatSession> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession(contextData);
    setMessages([welcomeMessage(Boolean(contextData))]);
  }, [contextData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !chatSessionRef.current) {
      return;
    }

    setError(null);

    const limit = checkRateLimit('chat', 15, 5 * 60 * 1000);
    if (!limit.allowed) {
      setError(`Rate limit reached. Try again in ${getWaitTimeMinutes(limit.resetTime)}.`);
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date(),
    };

    setMessages((previous) => [...previous, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = (await chatSessionRef.current.sendMessage({
        message: userMessage.text,
      })) as ChatResponse;

      const sources: Source[] =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks
          ?.map((chunk) => chunk.web)
          .filter((web): web is NonNullable<GroundingChunk['web']> => Boolean(web))
          .map(({ title, uri }) => ({ title, uri })) ?? [];

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-model`,
          role: 'model',
          text: response.text ?? "I couldn't generate a response.",
          timestamp: new Date(),
          sources,
        },
      ]);
    } catch (caughtError) {
      console.error(caughtError);
      setError('Communication lost. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className={`fixed bottom-8 right-8 z-50 rounded-full bg-neutral-900 p-4 text-white shadow-lg transition-all ${
          isOpen ? 'hidden' : 'flex'
        }`}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <div
        className={`fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full translate-y-10 flex-col border border-neutral-100 bg-white opacity-0 shadow-2xl transition-all duration-300 sm:bottom-8 sm:right-8 sm:h-[550px] sm:w-[400px] sm:rounded-xl ${
          isOpen ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 p-4">
          <h3 className="text-sm font-semibold">AI Analyst</h3>
          <button
            className="text-neutral-400 hover:text-neutral-900"
            onClick={() => setIsOpen(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="scrollbar-hide flex-1 space-y-6 overflow-y-auto p-4">
          {messages.map((message) => (
            <div
              className={`flex flex-col ${
                message.role === 'user' ? 'items-end' : 'items-start'
              }`}
              key={message.id}
            >
              <div
                className={`max-w-[85%] text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-2xl bg-neutral-100 px-4 py-2'
                    : 'text-neutral-600'
                }`}
              >
                {message.text}
              </div>
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 space-y-1 pl-1">
                  {message.sources.map((source, index) => (
                    <a
                      className="flex items-center gap-1 text-[10px] text-blue-500"
                      href={source.uri}
                      key={`${source.uri}-${index}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-neutral-300" />}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-neutral-100 bg-white p-4">
          {error && (
            <div className="mb-2 flex items-center gap-1 rounded bg-rose-50 p-2 text-[10px] text-rose-500">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 rounded-full bg-neutral-50 px-3 py-2">
            <input
              className="flex-1 bg-transparent text-sm focus:outline-none"
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  void handleSend();
                }
              }}
              placeholder="Ask about trends..."
              type="text"
              value={inputText}
            />
            <button
              className="rounded-full bg-neutral-900 p-1.5 text-white disabled:opacity-20"
              disabled={isLoading || !inputText.trim()}
              onClick={() => void handleSend()}
              type="button"
            >
              <Send className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const ChatBot = memo(ChatBotComponent);
