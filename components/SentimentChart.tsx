import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { ReviewPoint } from '../types';
import { ArrowUpDown } from 'lucide-react';

interface Props {
  data: ReviewPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg text-sm">
        <p className="font-semibold text-gray-700">{label}</p>
        <p className="text-indigo-600 font-medium">Score: {payload[0].value}</p>
        <p className="text-gray-500 italic mt-1 max-w-xs">"{payload[0].payload.snippet}"</p>
      </div>
    );
  }
  return null;
};

export const SentimentChart: React.FC<Props> = ({ data }) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const sortedData = [...data].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const toggleSort = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="h-[350px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col">
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-lg font-semibold text-gray-800">Sentiment Trend</h3>
        <button 
          onClick={toggleSort}
          className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-gray-200 transition-all hover:shadow-sm"
          title={sortOrder === 'asc' ? "Switch to Newest First" : "Switch to Oldest First"}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          {sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}
        </button>
      </div>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sortedData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            />
            <YAxis 
              domain={[-100, 100]} 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="sentiment" 
              stroke="#4f46e5" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
              activeDot={{ r: 6 }} 
              animationDuration={500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};