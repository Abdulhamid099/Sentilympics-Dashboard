import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ReviewPoint } from '../types';

interface Props {
  data: ReviewPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-sm px-3 py-2 border border-neutral-100 shadow-sm rounded text-xs">
        <div className="font-semibold text-neutral-900 mb-1">{label}</div>
        <div className="text-neutral-500">Sentiment: <span className="text-neutral-900">{payload[0].value}</span></div>
        <div className="text-neutral-400 mt-1 max-w-[150px] truncate">"{payload[0].payload.snippet}"</div>
      </div>
    );
  }
  return null;
};

const SentimentChartComponent: React.FC<Props> = ({ data }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }, [data, sortOrder]);

  return (
    <div className="w-full flex flex-col">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">Sentiment Trend</h3>
          <p className="text-xs text-neutral-400 mt-1">Net sentiment score over time</p>
        </div>
        <button 
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
        >
          {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
        </button>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 10, fill: '#a3a3a3' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              dy={10}
            />
            <YAxis 
              domain={[-100, 100]} 
              tick={{ fontSize: 10, fill: '#a3a3a3' }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e5e5' }} />
            <ReferenceLine y={0} stroke="#e5e5e5" />
            <Line 
              type="monotone" 
              dataKey="sentiment" 
              stroke="#171717" 
              strokeWidth={2} 
              dot={false}
              activeDot={{ r: 4, fill: '#171717', strokeWidth: 0 }} 
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SentimentChart = React.memo(SentimentChartComponent);