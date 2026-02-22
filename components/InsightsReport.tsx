import { Download } from 'lucide-react';
import { memo } from 'react';
import { ExecutiveSummary } from './ExecutiveSummary';
import { SentimentChart } from './SentimentChart';
import { WordCloud } from './WordCloud';
import type { AnalysisResult } from '../types';

interface Props {
  analysis: AnalysisResult;
  onExportJSON: () => void;
}

const InsightsReportComponent = ({ analysis, onExportJSON }: Props) => (
  <div className="animate-in slide-in-from-bottom-4 fade-in space-y-12 duration-700">
    <div className="flex items-center justify-between border-b border-neutral-100 pb-4">
      <h2 className="text-2xl font-light tracking-tight">Insights Report</h2>
      <button
        className="p-2 text-neutral-400 hover:text-neutral-900"
        onClick={onExportJSON}
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
);

export const InsightsReport = memo(InsightsReportComponent);
