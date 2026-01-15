import React, { useState } from 'react';
import { BarChart3, RefreshCw, Zap, FileJson, FileSpreadsheet } from 'lucide-react';
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
      setError("Failed to analyze reviews. Please check your API key and try again.");
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
    a.download = `sentilympics_analysis_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!analysis) return;
    
    // Helper to escape CSV fields
    const escape = (text: string | number) => {
      const str = String(text);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let csvContent = "EXECUTIVE SUMMARY\n";
    csvContent += `Overview,${escape(analysis.summary.overview)}\n\n`;
    
    csvContent += "ACTIONABLE AREAS\n";
    csvContent += "Title,Priority,Description\n";
    analysis.summary.actionableAreas.forEach(area => {
      csvContent += `${escape(area.title)},${escape(area.priority)},${escape(area.description)}\n`;
    });
    csvContent += "\n";

    csvContent += "SENTIMENT TREND DATA\n";
    csvContent += "Date,Sentiment,Snippet\n";
    analysis.sentimentTrend.forEach(item => {
      csvContent += `${escape(item.date)},${escape(item.sentiment)},${escape(item.snippet)}\n`;
    });
    csvContent += "\n";

    csvContent += "WORD CLOUD DATA\n";
    csvContent += "Term,Type,Frequency\n";
    analysis.wordCloud.forEach(item => {
      csvContent += `${escape(item.text)},${escape(item.type)},${escape(item.value)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentilympics_analysis_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Sentilympics Dashboard</h1>
          </div>
          <div className="text-sm text-gray-500 hidden sm:block">
            Powered by Gemini 3 Pro (Thinking Mode)
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Input Section */}
        <section className="mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Raw Reviews Input</h2>
                <p className="text-sm text-gray-500 mt-1">Paste a batch of unstructured customer feedback below.</p>
              </div>
              <button 
                onClick={loadDemo}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Load Demo Data
              </button>
            </div>
            
            <textarea
              className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono text-sm resize-y"
              placeholder="Paste reviews here (e.g., 'Love the new feature! - Oct 12' ... 'The app keeps crashing. - Oct 14')"
              value={reviews}
              onChange={(e) => setReviews(e.target.value)}
            />
            
            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                Supports massive text blocks. Analysis uses extended thinking budget (32k).
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !reviews.trim()}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium shadow-md transition-all
                  ${isAnalyzing || !reviews.trim() 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-95'}
                `}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Deep Thinking...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-current" />
                    Analyze Insights
                  </>
                )}
              </button>
            </div>
            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Results Dashboard */}
        {analysis && (
          <div className="space-y-6 animate-fade-in">
            {/* Results Header with Export Buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold text-gray-800">Analysis Results</h2>
              <div className="flex gap-3">
                <button 
                  onClick={handleExportJSON}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                  title="Export full analysis as JSON"
                >
                  <FileJson className="w-4 h-4" />
                  Export JSON
                </button>
                <button 
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                  title="Export analysis as CSV"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Top Row: Chart & Word Cloud */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SentimentChart data={analysis.sentimentTrend} />
              <WordCloud words={analysis.wordCloud} />
            </div>

            {/* Bottom Row: Executive Summary */}
            <ExecutiveSummary data={analysis.summary} />
          </div>
        )}

        {!analysis && !isAnalyzing && (
          <div className="text-center py-20 opacity-50">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-medium text-gray-400">Ready to analyze</h3>
            <p className="text-gray-400">Paste your reviews above to generate the report.</p>
          </div>
        )}
      </main>

      <ChatBot contextData={analysis || undefined} />
    </div>
  );
};

export default App;