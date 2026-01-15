import React, { useState } from 'react';
import { BarChart3, RefreshCw, Zap, ArrowRight, Download } from 'lucide-react';
import { analyzeReviews } from './services/geminiService';
import { SentimentChart } from './components/SentimentChart';
import { WordCloud } from './components/WordCloud';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { ChatBot } from './components/ChatBot';
import { AnalysisResult } from './types';

// Placeholder data for initial state
const DEMO_DATA: AnalysisResult = {
  sentimentTrend: [
    { date: '2023-10-01', sentiment: 65, snippet: "Great start" },
    { date: '2023-10-05', sentiment: 45, snippet: "Minor bugs" },
    { date: '2023-10-10', sentiment: -20, snippet: "Crashing often" },
    { date: '2023-10-15', sentiment: 10, snippet: "Patch released" },
    { date: '2023-10-20', sentiment: 80, snippet: "Much better now" },
  ],
  wordCloud: [
    { text: "fast shipping", value: 45, type: "praise" },
    { text: "expensive", value: 30, type: "complaint" },
    { text: "easy to use", value: 25, type: "praise" },
    { text: "customer support", value: 20, type: "complaint" },
    { text: "quality", value: 15, type: "praise" },
  ],
  summary: {
    overview: "Overall customer sentiment has shown volatility over the last month. While users appreciate the product's ease of use and shipping speed, significant concerns regarding stability and pricing persist.",
    actionableAreas: [
      { title: "Stabilize Application", description: "Address the crash reports from early October immediately.", priority: "High" },
      { title: "Review Pricing Strategy", description: "Many users mention 'expensive'. Consider a lower tier or discount codes.", priority: "Medium" },
      { title: "Support Training", description: "Support response times are a recurring pain point.", priority: "Medium" },
    ]
  }
};

const App: React.FC = () => {
  const [reviews, setReviews] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!reviews.trim()) return;
    
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeReviews(reviews);
      setAnalysis(result);
    } catch (err: any) {
      setError("Failed to analyze reviews. Please check your API key.");
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const loadDemo = () => {
    setReviews("Paste your own reviews here...\n\n(Demo data loaded below)");
    setAnalysis(DEMO_DATA);
  };

  const handleExportJSON = () => {
    if (!analysis) return;
    const dataStr = JSON.stringify(analysis, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-20 font-sans selection:bg-neutral-200">
      {/* Minimal Header */}
      <header className="pt-8 pb-6">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neutral-900 rounded-full flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Sentilympics</h1>
          </div>
          <button 
            onClick={loadDemo} 
            className="text-sm text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Load Demo
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6">
        
        {/* Input Section - Clean Paper Look */}
        <section className="mb-12">
          <div className="bg-white rounded-2xl shadow-sm p-2 transition-shadow hover:shadow-md duration-300">
            <textarea
              className="w-full h-40 p-6 rounded-xl text-neutral-700 placeholder:text-neutral-300 focus:outline-none resize-y text-base"
              placeholder="Paste your customer reviews here to begin analysis..."
              value={reviews}
              onChange={(e) => setReviews(e.target.value)}
            />
            <div className="flex justify-between items-center px-4 pb-2">
              <div className="text-xs text-neutral-300 font-medium px-2">
                Gemini 3 Pro
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !reviews.trim()}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm transition-all
                  ${isAnalyzing || !reviews.trim() 
                    ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed' 
                    : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-[1.02]'}
                `}
              >
                {isAnalyzing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Analyze <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-4 text-center text-sm text-red-500">
              {error}
            </div>
          )}
        </section>

        {/* Results Dashboard */}
        {analysis && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            
            {/* Header & Actions */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <h2 className="text-2xl font-light tracking-tight">Insights Report</h2>
              <button 
                onClick={handleExportJSON}
                className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                title="Download JSON"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>

            {/* Visuals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <SentimentChart data={analysis.sentimentTrend} />
              <WordCloud words={analysis.wordCloud} />
            </div>

            {/* Summary */}
            <ExecutiveSummary data={analysis.summary} />
          </div>
        )}

        {!analysis && !isAnalyzing && (
          <div className="text-center py-20">
            <p className="text-neutral-300 text-sm font-light">Waiting for input data...</p>
          </div>
        )}
      </main>

      <ChatBot contextData={analysis || undefined} />
    </div>
  );
};

export default App;