import * as d3 from 'd3';
import { memo, useMemo } from 'react';
import type { WordFrequency } from '../types';

interface Props {
  words: WordFrequency[];
}

const WordCloudComponent = ({ words }: Props) => {
  const processedWords = useMemo(() => {
    if (!words.length) {
      return [];
    }

    const minValue = d3.min(words, (word) => word.value) ?? 0;
    const maxValue = d3.max(words, (word) => word.value) ?? 10;

    const sizeScale = d3.scaleLinear().domain([minValue, maxValue]).range([14, 42]);
    const opacityScale = d3.scaleLinear().domain([minValue, maxValue]).range([0.4, 1]);

    return words.map((word) => ({
      ...word,
      size: sizeScale(word.value),
      opacity: opacityScale(word.value),
    }));
  }, [words]);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-neutral-900">Key Themes</h3>
        <p className="mt-1 text-xs text-neutral-400">Frequency of praises and complaints</p>
      </div>

      <div className="flex min-h-[300px] flex-wrap content-start items-baseline gap-x-4 gap-y-2">
        {processedWords.map((word) => (
          <span
            className={`cursor-default leading-none transition-opacity hover:opacity-100 ${
              word.type === 'complaint' ? 'text-rose-500' : 'text-emerald-600'
            }`}
            key={`${word.text}-${word.type}`}
            style={{
              fontSize: `${word.size}px`,
              opacity: word.opacity,
              fontWeight: word.value > 30 ? 600 : 400,
            }}
            title={`${word.value} occurrences`}
          >
            {word.text}
          </span>
        ))}

        {processedWords.length === 0 && (
          <p className="text-sm text-neutral-300">No keywords data.</p>
        )}
      </div>
    </div>
  );
};

export const WordCloud = memo(WordCloudComponent);
