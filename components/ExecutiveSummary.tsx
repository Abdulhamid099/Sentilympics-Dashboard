import { memo } from 'react';
import type { AnalysisResult, ActionableArea } from '../types';

interface Props {
  data: AnalysisResult['summary'];
}

const PRIORITY_COLOR_CLASS: Record<ActionableArea['priority'], string> = {
  High: 'bg-rose-500',
  Medium: 'bg-amber-400',
  Low: 'bg-blue-400',
};

const ExecutiveSummaryComponent = ({ data }: Props) => (
  <div className="mt-8 w-full">
    <h3 className="mb-6 text-lg font-medium text-neutral-900">Executive Summary</h3>

    <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
      <div className="md:col-span-4">
        <p className="text-sm leading-relaxed text-neutral-600">{data.overview}</p>
      </div>

      <div className="md:col-span-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.actionableAreas.map((area) => (
            <div className="group" key={`${area.title}-${area.priority}`}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    PRIORITY_COLOR_CLASS[area.priority]
                  }`}
                />
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  {area.priority} Priority
                </span>
              </div>
              <h4 className="mb-1 text-sm font-semibold text-neutral-900 transition-colors group-hover:text-blue-600">
                {area.title}
              </h4>
              <p className="text-xs leading-normal text-neutral-500">{area.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const ExecutiveSummary = memo(ExecutiveSummaryComponent);
