import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/geminiService';
import { ChatMessage, AnalysisResult, Source } from '../types';
import { MessageCircle, X, Send, Loader2, ExternalLink, AlertCircle } from 'lucide-react';
import { checkRateLimit, getWaitTimeMinutes } from '../utils/rateLimiter';

interface Props {
  contextData?: AnalysisResult;
}

export const ChatBot: React.FC<Props> = React.memo(({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      chatSessionRef.current = createChatSession(contextData);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: contextData 
          ? "Analyst ready. How can I help with these results?"
          : "Hello. I can help analyze CX data or trends.",
        timestamp: new Date()
      }]);
      setError(null);
    } catch (err) {
      chatSessionRef.current = null;
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: 'Set GEMINI_API_KEY in .env.local to enable chat.',
        timestamp: new Date()
      }]);
      setError('AI chat is unavailable until GEMINI_API_KEY is configured.');
    }
  }, [contextData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || !chatSessionRef.current) return;
    setError(null);

    // Rate limit: 15 messages per 5 minutes
    const limit = checkRateLimit('chat', 15, 5 * 60 * 1000);
    if (!limit.allowed) {
      setError(`Rate limit reached. Try again in ${getWaitTimeMinutes(limit.resetTime)}.`);
      return;
    }

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
        .filter((s: any) => s) || [];

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.text || "I couldn't generate a response.",
        timestamp: new Date(),
        sources
      }]);
    } catch (err) {
      setError("Communication lost. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 p-4 bg-neutral-900 text-white rounded-full shadow-lg transition-all z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      <div 
        className={`fixed bottom-0 right-0 sm:bottom-8 sm:right-8 w-full sm:w-[400px] h-[100dvh] sm:h-[550px] bg-white sm:rounded-xl shadow-2xl border border-neutral-100 flex flex-col transition-all duration-300 z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold">AI Analyst</h3>
          <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-900"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] text-sm leading-relaxed ${msg.role === 'user' ? 'bg-neutral-100 px-4 py-2 rounded-2xl' : 'text-neutral-600'}`}>
                {msg.text}
              </div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pl-1 space-y-1">
                  {msg.sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" className="flex items-center gap-1 text-[10px] text-blue-500"><ExternalLink className="w-3 h-3" />{s.title}</a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white border-t border-neutral-100">
          {error && (
            <div className="mb-2 p-2 bg-rose-50 text-rose-500 text-[10px] rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {error}
            </div>
          )}
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-full">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about trends..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="p-1.5 bg-neutral-900 text-white rounded-full disabled:opacity-20"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});