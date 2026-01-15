import React from 'react';
import { AnalysisResult } from '../types';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface Props {
  data: AnalysisResult['summary'];
}

export const ExecutiveSummary: React.FC<Props> = ({ data }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <Info className="w-6 h-6 text-indigo-500" />
        Executive Summary
      </h3>
      
      <p className="text-gray-600 leading-relaxed mb-8 border-l-4 border-indigo-500 pl-4 italic">
        {data.overview}
      </p>

      <h4 className="text-lg font-semibold text-gray-800 mb-4">Top 3 Actionable Areas</h4>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data.actionableAreas.map((area, idx) => (
          <div key={idx} className="flex flex-col p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getPriorityColor(area.priority)}`}>
                {area.priority} Priority
              </span>
            </div>
            <h5 className="font-bold text-gray-900 mb-2">{area.title}</h5>
            <p className="text-sm text-gray-600 leading-snug">{area.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
