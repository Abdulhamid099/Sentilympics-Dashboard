import { memo, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReviewPoint } from '../types';

interface Props {
  data: ReviewPoint[];
}

type SortOrder = 'asc' | 'desc';

interface TooltipPayloadItem {
  value: number;
  payload: {
    snippet: string;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = memo(({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded border border-neutral-100 bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
      <div className="mb-1 font-semibold text-neutral-900">{label}</div>
      <div className="text-neutral-500">
        Sentiment: <span className="text-neutral-900">{payload[0].value}</span>
      </div>
      <div className="mt-1 max-w-[150px] truncate text-neutral-400">"{payload[0].payload.snippet}"</div>
    </div>
  );
});
CustomTooltip.displayName = 'CustomTooltip';

const SentimentChartComponent = ({ data }: Props) => {
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const sortedData = useMemo(() => {
    return [...data].sort((first, second) => {
      const firstDate = new Date(first.date).getTime();
      const secondDate = new Date(second.date).getTime();

      return sortOrder === 'asc' ? firstDate - secondDate : secondDate - firstDate;
    });
  }, [data, sortOrder]);

  return (
    <div className="flex w-full flex-col">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h3 className="text-lg font-medium text-neutral-900">Sentiment Trend</h3>
          <p className="mt-1 text-xs text-neutral-400">Net sentiment score over time</p>
        </div>
        <button
          className="text-xs text-neutral-400 transition-colors hover:text-neutral-900"
          onClick={() => setSortOrder((value) => (value === 'asc' ? 'desc' : 'asc'))}
          type="button"
        >
          {sortOrder === 'asc' ? 'Oldest → Newest' : 'Newest → Oldest'}
        </button>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer height="100%" width="100%">
          <LineChart data={sortedData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#f5f5f5" strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="date"
              dy={10}
              tick={{ fontSize: 10, fill: '#a3a3a3' }}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                })
              }
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              domain={[-100, 100]}
              tick={{ fontSize: 10, fill: '#a3a3a3' }}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e5e5e5' }} />
            <ReferenceLine stroke="#e5e5e5" y={0} />
            <Line
              activeDot={{ r: 4, fill: '#171717', strokeWidth: 0 }}
              animationDuration={300}
              dataKey="sentiment"
              dot={false}
              stroke="#171717"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export const SentimentChart = memo(SentimentChartComponent);
