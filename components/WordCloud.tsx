import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { WordFrequency } from '../types';

interface Props {
  words: WordFrequency[];
}

export const WordCloud: React.FC<Props> = ({ words }) => {
  const processedWords = useMemo(() => {
    if (words.length === 0) return [];
    
    // Scale for font size based on value
    const sizeScale = d3.scaleLinear()
      .domain([d3.min(words, d => d.value) || 0, d3.max(words, d => d.value) || 10])
      .range([12, 32]);

    // Scale for opacity
    const opacityScale = d3.scaleLinear()
      .domain([d3.min(words, d => d.value) || 0, d3.max(words, d => d.value) || 10])
      .range([0.6, 1]);

    return words.map(w => ({
      ...w,
      size: sizeScale(w.value),
      opacity: opacityScale(w.value)
    }));
  }, [words]);

  return (
    <div className="h-[350px] w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6 overflow-y-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Key Themes</h3>
      <div className="flex flex-wrap gap-3 content-start">
        {processedWords.map((word, idx) => (
          <span
            key={idx}
            className={`
              inline-flex items-center px-3 py-1 rounded-full font-medium transition-transform hover:scale-105 cursor-default
              ${word.type === 'complaint' 
                ? 'bg-red-50 text-red-700 border border-red-100' 
                : 'bg-green-50 text-green-700 border border-green-100'}
            `}
            style={{ 
              fontSize: `${word.size}px`,
              opacity: word.opacity
            }}
            title={`${word.value} occurrences`}
          >
            {word.text}
          </span>
        ))}
        {processedWords.length === 0 && (
          <p className="text-gray-400 text-sm">No keywords extracted yet.</p>
        )}
      </div>
    </div>
  );
};
