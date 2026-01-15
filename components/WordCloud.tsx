import React, { useMemo } from 'react';
import * as d3 from 'd3';
import { WordFrequency } from '../types';

interface Props {
  words: WordFrequency[];
}

const WordCloudComponent: React.FC<Props> = ({ words }) => {
  const processedWords = useMemo(() => {
    if (words.length === 0) return [];
    
    // Scale for font size based on value
    const sizeScale = d3.scaleLinear()
      .domain([d3.min(words, d => d.value) || 0, d3.max(words, d => d.value) || 10])
      .range([14, 42]);

    // Scale for opacity
    const opacityScale = d3.scaleLinear()
      .domain([d3.min(words, d => d.value) || 0, d3.max(words, d => d.value) || 10])
      .range([0.4, 1]);

    return words.map(w => ({
      ...w,
      size: sizeScale(w.value),
      opacity: opacityScale(w.value)
    }));
  }, [words]);

  return (
    <div className="w-full flex flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-neutral-900">Key Themes</h3>
        <p className="text-xs text-neutral-400 mt-1">Frequency of praises and complaints</p>
      </div>
      
      <div className="flex flex-wrap gap-x-4 gap-y-2 content-start min-h-[300px] items-baseline">
        {processedWords.map((word, idx) => (
          <span
            key={idx}
            className={`
              leading-none transition-opacity hover:opacity-100 cursor-default
              ${word.type === 'complaint' ? 'text-rose-500' : 'text-emerald-600'}
            `}
            style={{ 
              fontSize: `${word.size}px`,
              opacity: word.opacity,
              fontWeight: word.value > 30 ? 600 : 400
            }}
            title={`${word.value} occurrences`}
          >
            {word.text}
          </span>
        ))}
        {processedWords.length === 0 && (
          <p className="text-neutral-300 text-sm">No keywords data.</p>
        )}
      </div>
    </div>
  );
};

export const WordCloud = React.memo(WordCloudComponent);