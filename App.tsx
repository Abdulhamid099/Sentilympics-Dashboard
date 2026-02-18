import { AlertCircle, ArrowRight, BarChart3, Download, RefreshCw, Upload } from 'lucide-react';
import { useRef, useState, type ChangeEvent } from 'react';
import { ChatBot } from './components/ChatBot';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { SentimentChart } from './components/SentimentChart';
import { WordCloud } from './components/WordCloud';
import { analyzeReviews } from './services/geminiService';
import type { AnalysisResult } from './types';
import { getWaitTimeMinutes } from './utils/rateLimiter';

const DEMO_DATA: AnalysisResult = {
  sentimentTrend: [
    { date: '2023-10-01', sentiment: 65, snippet: 'Great start' },
    { date: '2023-10-05', sentiment: 45, snippet: 'Minor bugs' },
    { date: '2023-10-10', sentiment: -20, snippet: 'Crashing often' },
    { date: '2023-10-15', sentiment: 10, snippet: 'Patch released' },
    { date: '2023-10-20', sentiment: 80, snippet: 'Much better now' },
  ],
  wordCloud: [
    { text: 'fast shipping', value: 45, type: 'praise' },
    { text: 'expensive', value: 30, type: 'complaint' },
    { text: 'easy to use', value: 25, type: 'praise' },
    { text: 'customer support', value: 20, type: 'complaint' },
    { text: 'quality', value: 15, type: 'praise' },
  ],
  summary: {
    overview: 'Overall customer sentiment has shown volatility over the last month.',
    actionableAreas: [
      {
        title: 'Stabilize Application',
        description: 'Address the crash reports.',
        priority: 'High',
      },
    ],
  },
};

const RATE_LIMIT_PREFIX = 'RATE_LIMIT_EXCEEDED';

const parseAnalyzeError = (error: unknown): string => {
  if (error instanceof Error && error.message.startsWith(RATE_LIMIT_PREFIX)) {
    const [, resetTimeValue] = error.message.split('|');
    const resetTime = Number.parseInt(resetTimeValue ?? '', 10);

    if (!Number.isNaN(resetTime)) {
      return `Rate limit reached. Please wait ${getWaitTimeMinutes(resetTime)}.`;
    }
  }

  return 'Failed to analyze reviews. Please try again.';
};

const App = () => {
  const [reviews, setReviews] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasReviews = reviews.trim().length > 0;

  const handleAnalyze = async () => {
    if (!hasReviews) {
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeReviews(reviews);
      setAnalysis(result);
    } catch (caughtError) {
      setError(parseAnalyzeError(caughtError));
      console.error(caughtError);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (loadEvent) => setReviews(String(loadEvent.target?.result ?? ''));
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleExportJSON = () => {
    if (!analysis) {
      return;
    }

    const blob = new Blob([JSON.stringify(analysis, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'analysis.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-20 font-sans text-neutral-900 selection:bg-neutral-200">
      <header className="pb-6 pt-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight">Sentilympics</h1>
          </div>
          <button
            className="text-sm text-neutral-400 transition-colors hover:text-neutral-900"
            onClick={() => setAnalysis(DEMO_DATA)}
            type="button"
          >
            Load Demo
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="mb-12">
          <div className="group relative rounded-2xl bg-white p-2 shadow-sm transition-shadow duration-300 hover:shadow-md">
            <textarea
              className="h-40 w-full resize-y rounded-xl p-6 font-mono text-base leading-relaxed text-neutral-700 placeholder:text-neutral-300 focus:outline-none"
              onChange={(event) => setReviews(event.target.value)}
              placeholder="Paste reviews or upload data..."
              value={reviews}
            />

            <div className="mt-2 flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-3">
                <button
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  <Upload className="h-3 w-3" />
                  Import File
                </button>
                <input
                  accept=".csv,.txt,.json"
                  className="hidden"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  type="file"
                />
              </div>

              <button
                className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-all ${
                  isAnalyzing || !hasReviews
                    ? 'bg-neutral-100 text-neutral-400'
                    : 'bg-neutral-900 text-white hover:bg-neutral-800'
                }`}
                disabled={isAnalyzing || !hasReviews}
                onClick={handleAnalyze}
                type="button"
              >
                {isAnalyzing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Analyze
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex animate-pulse items-center justify-center gap-2 rounded-lg bg-rose-50 py-2 text-xs text-rose-500">
              <AlertCircle className="h-3 w-3" />
              {error}
            </div>
          )}
        </section>

        {analysis && (
          <div className="animate-in slide-in-from-bottom-4 fade-in space-y-12 duration-700">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
              <h2 className="text-2xl font-light tracking-tight">Insights Report</h2>
              <button
                className="p-2 text-neutral-400 hover:text-neutral-900"
                onClick={handleExportJSON}
                type="button"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
              <SentimentChart data={analysis.sentimentTrend} />
              <WordCloud words={analysis.wordCloud} />
            </div>
            <ExecutiveSummary data={analysis.summary} />
          </div>
        )}
      </main>

      <ChatBot contextData={analysis ?? undefined} />
    </div>
  );
};

export default App;
