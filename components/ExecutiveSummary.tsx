import React from 'react';
import { AnalysisResult } from '../types';

interface Props {
  data: AnalysisResult['summary'];
}

const ExecutiveSummaryComponent: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full mt-8">
      <h3 className="text-lg font-medium text-neutral-900 mb-6">Executive Summary</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
        {/* Overview Column */}
        <div className="md:col-span-4">
          <p className="text-neutral-600 leading-relaxed text-sm">
            {data.overview}
          </p>
        </div>

        {/* Actionable Areas Column */}
        <div className="md:col-span-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.actionableAreas.map((area, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    area.priority === 'High' ? 'bg-rose-500' : 
                    area.priority === 'Medium' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <span className="text-[10px] uppercase tracking-wider text-neutral-400 font-medium">
                    {area.priority} Priority
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {area.title}
                </h4>
                <p className="text-xs text-neutral-500 leading-normal">
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ExecutiveSummary = React.memo(ExecutiveSummaryComponent);