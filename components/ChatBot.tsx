import React, { useState, useRef, useEffect } from 'react';
import { createChatSession } from '../services/geminiService';
import { ChatMessage, AnalysisResult, Source } from '../types';
import { MessageCircle, X, Send, Bot, User, Loader2, ExternalLink, Terminal, Copy } from 'lucide-react';

interface Props {
  contextData?: AnalysisResult;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg overflow-hidden my-3 border border-gray-700 shadow-md">
      <div className="bg-gray-800 px-4 py-1.5 flex justify-between items-center text-xs text-gray-300">
        <span className="flex items-center gap-1 font-mono">
          <Terminal className="w-3 h-3" />
          {language || 'code'}
        </span>
        <button 
          onClick={handleCopy}
          className="hover:text-white flex items-center gap-1 transition-colors"
        >
          {copied ? "Copied!" : <><Copy className="w-3 h-3" /> Copy</>}
        </button>
      </div>
      <div className="bg-[#1e1e1e] p-4 overflow-x-auto">
        <pre className="font-mono text-sm text-gray-100 whitespace-pre">
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  );
};

const MessageContent = ({ text }: { text: string }) => {
  // Simple parser for markdown code blocks
  const parts = text.split(/```(\w+)?\s([\s\S]*?)```/g);

  if (parts.length === 1) {
    return <div className="whitespace-pre-wrap">{text}</div>;
  }

  return (
    <div className="space-y-1">
      {parts.map((part, i) => {
        // Text block
        if (i % 3 === 0) {
          if (!part.trim()) return null;
          return <div key={i} className="whitespace-pre-wrap">{part}</div>;
        }
        // Language identifier (skip, consumed by next block)
        if (i % 3 === 1) return null;
        
        // Code block
        if (i % 3 === 2) {
          const lang = parts[i - 1] || 'text';
          return <CodeBlock key={i} language={lang} code={part} />;
        }
      })}
    </div>
  );
};

export const ChatBot: React.FC<Props> = ({ contextData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize chat session when context changes or component mounts
  useEffect(() => {
    chatSessionRef.current = createChatSession(contextData);
    setMessages([{
      id: 'welcome',
      role: 'model',
      text: contextData 
        ? "I've reviewed the analysis. I can compare these metrics with competitors (using Google Search) or generate Python code to help you analyze this data further. What do you need?"
        : "Hello! I can help answer questions about customer experience strategies or write Python analysis scripts.",
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
      const responseText = response.text || "I didn't get a response.";
      
      // Extract sources from grounding metadata
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
      console.error("Chat error", error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-indigo-600 text-white rounded-full shadow-xl hover:bg-indigo-700 transition-all z-50 ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Panel */}
      <div 
        className={`fixed bottom-6 right-6 w-[450px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-300 transform z-50 ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
        style={{ height: '600px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-indigo-600 rounded-t-2xl text-white">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            <h3 className="font-semibold">CX Assistant & Analyst</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-hide">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[90%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none shadow-sm'
                }`}
              >
                <MessageContent text={msg.text} />
                
                {/* Source Display */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" />
                      Sources
                    </p>
                    <div className="space-y-1">
                      {msg.sources.map((source, idx) => (
                        <a 
                          key={idx} 
                          href={source.uri} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="block text-xs text-indigo-600 hover:text-indigo-800 hover:underline truncate"
                          title={source.title}
                        >
                          {idx + 1}. {source.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="text-xs text-gray-500">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t bg-white rounded-b-2xl">
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask (e.g., 'Write Python code to plot this')"
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !inputText.trim()}
              className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};