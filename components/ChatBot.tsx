import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/geminiService';
import { ChatMessage, AnalysisResult, Source } from '../types';
import { MessageCircle, X, Send, Loader2, ExternalLink, Copy } from 'lucide-react';

interface Props {
  contextData?: AnalysisResult;
}

const MessageContent = React.memo(({ text }: { text: string }) => {
  // Simple clean text rendering
  return <div className="whitespace-pre-wrap">{text}</div>;
});

export const ChatBot: React.FC<Props> = React.memo(({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatSessionRef.current = createChatSession(contextData);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: contextData 
        ? "I can help analyze this data further. Ask me about specific trends or comparisons."
        : "Hi. I can help analyze customer reviews or write Python scripts.",
      timestamp: new Date()
    }]);
  }, [contextData]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

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
      if (!chatSessionRef.current) {
        chatSessionRef.current = createChatSession(contextData);
      }

      const response = await chatSessionRef.current.sendMessage({ message: userMsg.text });
      const responseText = response.text || "No response.";
      
      const sources: Source[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => chunk.web ? { title: chunk.web.title, uri: chunk.web.uri } : null)
        .filter((s: any) => s) || [];

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
        sources: sources
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Connection error.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 p-4 bg-neutral-900 text-white rounded-full shadow-lg hover:bg-black transition-all z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      <div 
        className={`fixed bottom-0 right-0 sm:bottom-8 sm:right-8 w-full sm:w-[400px] h-[100dvh] sm:h-[550px] bg-white sm:rounded-xl shadow-2xl border border-neutral-100 flex flex-col transition-all duration-300 transform z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
      >
        {/* Minimal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h3 className="text-sm font-semibold text-neutral-900">Assistant</h3>
          <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-neutral-900 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-white scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div 
                className={`max-w-[85%] text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-neutral-100 text-neutral-800 px-4 py-2 rounded-2xl rounded-tr-sm' 
                    : 'text-neutral-600'
                }`}
              >
                <MessageContent text={msg.text} />
              </div>
              
              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pl-1 space-y-1">
                  {msg.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 text-[10px] text-blue-500 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {source.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
               <Loader2 className="w-4 h-4 animate-spin text-neutral-300" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white sm:rounded-b-xl border-t border-neutral-100">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-2 rounded-full">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent text-sm text-neutral-900 focus:outline-none placeholder:text-neutral-400"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="p-1.5 bg-neutral-900 text-white rounded-full hover:bg-black disabled:opacity-20 transition-colors"
            >
              <Send className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
});