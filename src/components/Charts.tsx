import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DistributionItem, StackedSeriesRow } from '../types/participant';

export const UT_CHART_PALETTE = [
  '#0066A4', // UT Blue
  '#17365D', // Deep Navy
  '#F39C35', // Accent Orange
  '#27AE60', // Success Green
  '#2E86C1', // Sky Blue
  '#1F618D', // Steel Blue
  '#D68910', // Warm Amber
  '#148F77', // Teal
  '#5499C7', // Soft Blue
  '#7D3C98', // Muted Plum
  '#2874A6', // Ocean
  '#5D6D7E', // Slate
];

function truncateLabel(text: string, maxLen = 26): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + '…';
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
    payload?: DistributionItem & Record<string, unknown>;
  }>;
  label?: string;
}

const DistributionTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-[#17365D] max-w-xs">
      <div className="font-semibold mb-1 leading-snug">{item.name}</div>
      {item.extraLabel && (
        <div className="text-[11px] text-slate-500 mb-1">Provinsi: {item.extraLabel}</div>
      )}
      <div className="flex items-center justify-between gap-4 tabular-nums">
        <span className="text-slate-600">Jumlah Peserta:</span>
        <span className="font-semibold font-mono-tabular">
          {Number(item.count).toLocaleString('id-ID')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-4 tabular-nums">
        <span className="text-slate-600">Persentase:</span>
        <span className="font-semibold font-mono-tabular text-[#0066A4]">
          {Number(item.percentage).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

interface HorizontalBarChartPanelProps {
  data: DistributionItem[];
  activeValues?: string[];
  onItemClick?: (name: string) => void;
  barColor?: string;
  maxHeightClass?: string;
  yAxisWidth?: number;
}

export const HorizontalBarChartPanel: React.FC<HorizontalBarChartPanelProps> = ({
  data,
  activeValues = [],
  onItemClick,
  barColor = '#0066A4',
  maxHeightClass = 'max-h-[360px]',
  yAxisWidth = 175,
}) => {
  const chartData = data.map((d) => ({
    ...d,
    labelText: `${d.count.toLocaleString('id-ID')} (${d.percentage.toFixed(1)}%)`,
  }));

  const height = Math.max(220, chartData.length * 36 + 24);
  const hasSelection = activeValues.length > 0;

  return (
    <div className={`w-full overflow-y-auto pr-1 ${maxHeightClass}`}>
      <div style={{ height: `${height}px`, minWidth: '320px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 92, left: 4, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
              tickFormatter={(val) => Number(val).toLocaleString('id-ID')}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={yAxisWidth}
              tick={{ fontSize: 11, fill: '#17365D' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => truncateLabel(String(val), 25)}
            />
            <Tooltip content={<DistributionTooltip />} cursor={{ fill: '#EAF3F9', opacity: 0.6 }} />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              barSize={20}
              className={onItemClick ? 'cursor-pointer' : ''}
              onClick={(entry) => {
                if (onItemClick && entry?.name) {
                  onItemClick(String(entry.name));
                }
              }}
            >
              {chartData.map((entry) => {
                const isSelected = activeValues.includes(entry.name);
                const fill = isSelected
                  ? '#F39C35'
                  : hasSelection
                  ? '#94B8D4'
                  : barColor;
                return <Cell key={entry.name} fill={fill} />;
              })}
              <LabelList
                dataKey="labelText"
                position="right"
                style={{
                  fontSize: '11px',
                  fill: '#17365D',
                  fontFamily: 'var(--font-mono)',
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

interface DonutChartPanelProps {
  data: DistributionItem[];
  activeValues?: string[];
  onItemClick?: (name: string) => void;
  totalCount: number;
  centerLabel?: string;
  customColors?: Record<string, string>;
}

export const DonutChartPanel: React.FC<DonutChartPanelProps> = ({
  data,
  activeValues = [],
  onItemClick,
  totalCount,
  centerLabel = 'Peserta',
  customColors,
}) => {
  const hasSelection = activeValues.length > 0;

  const getColor = (name: string, index: number): string => {
    if (customColors && customColors[name]) return customColors[name];
    return UT_CHART_PALETTE[index % UT_CHART_PALETTE.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
      <div className="md:col-span-5 relative h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={56}
              outerRadius={84}
              paddingAngle={data.length > 1 ? 2 : 0}
              onClick={(entry) => {
                if (onItemClick && entry?.name) {
                  onItemClick(String(entry.name));
                }
              }}
              className={onItemClick ? 'cursor-pointer focus:outline-none' : 'focus:outline-none'}
            >
              {data.map((entry, idx) => {
                const isSelected = activeValues.includes(entry.name);
                const baseColor = getColor(entry.name, idx);
                return (
                  <Cell
                    key={entry.name}
                    fill={baseColor}
                    fillOpacity={hasSelection && !isSelected ? 0.3 : 1}
                    stroke={isSelected ? '#17365D' : '#FFFFFF'}
                    strokeWidth={isSelected ? 2 : 1.5}
                  />
                );
              })}
            </Pie>
            <Tooltip content={<DistributionTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-bold text-[#17365D] tabular-nums leading-tight">
            {totalCount.toLocaleString('id-ID')}
          </span>
          <span className="text-[11px] text-slate-500">{centerLabel}</span>
        </div>
      </div>

      <div className="md:col-span-7 max-h-[220px] overflow-y-auto pr-1 space-y-1">
        {data.map((item, idx) => {
          const isSelected = activeValues.includes(item.name);
          const color = getColor(item.name, idx);
          return (
            <button
              key={item.name}
              type="button"
              onClick={() => onItemClick?.(item.name)}
              disabled={!onItemClick}
              className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors ${
                onItemClick ? 'hover:bg-[#EAF3F9]/70 cursor-pointer' : 'cursor-default'
              } ${
                isSelected
                  ? 'bg-[#EAF3F9] ring-1 ring-[#0066A4] font-semibold text-[#17365D]'
                  : hasSelection
                  ? 'opacity-50 text-slate-600'
                  : 'text-[#17365D]'
              }`}
            >
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="truncate" title={item.name}>
                  {item.name}
                </span>
              </span>
              <span className="font-mono-tabular text-[11px] text-slate-600 shrink-0">
                {item.count.toLocaleString('id-ID')} ({item.percentage.toFixed(1)}%)
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface StackedTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
}

const StackedTooltip: React.FC<StackedTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;
  const total = payload.reduce((sum, p) => sum + (Number(p.value) || 0), 0);

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs text-[#17365D] max-w-xs">
      <div className="font-semibold mb-1.5 leading-snug border-b border-slate-100 pb-1">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const val = Number(entry.value) || 0;
          const pct = total > 0 ? (val / total) * 100 : 0;
          return (
            <div key={entry.name} className="flex items-center justify-between gap-4 tabular-nums">
              <span className="flex items-center gap-1.5 text-slate-600 truncate">
                <span
                  className="w-2 h-2 rounded-sm shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate">{entry.name}</span>
              </span>
              <span className="font-mono-tabular font-medium shrink-0">
                {val.toLocaleString('id-ID')} ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 pt-1 border-t border-slate-100 flex items-center justify-between font-semibold tabular-nums">
        <span>Total</span>
        <span className="font-mono-tabular">{total.toLocaleString('id-ID')}</span>
      </div>
    </div>
  );
};

interface StackedBarChartPanelProps {
  data: StackedSeriesRow[];
  seriesKeys: string[];
  layout?: 'horizontal' | 'vertical';
  maxHeightClass?: string;
  yAxisWidth?: number;
  seriesColors?: Record<string, string>;
}

export const StackedBarChartPanel: React.FC<StackedBarChartPanelProps> = ({
  data,
  seriesKeys,
  layout = 'horizontal',
  maxHeightClass = 'max-h-[380px]',
  yAxisWidth = 175,
  seriesColors,
}) => {
  const getColor = (key: string, idx: number) =>
    seriesColors?.[key] ?? UT_CHART_PALETTE[idx % UT_CHART_PALETTE.length];

  if (layout === 'vertical') {
    return (
      <div className="w-full h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 16, left: 4, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="category"
              tick={{ fontSize: 11, fill: '#17365D' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => Number(v).toLocaleString('id-ID')}
            />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: '#EAF3F9', opacity: 0.6 }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
            {seriesKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={getColor(key, idx)}
                barSize={42}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const height = Math.max(240, data.length * 38 + 44);

  return (
    <div className={`w-full overflow-y-auto pr-1 ${maxHeightClass}`}>
      <div style={{ height: `${height}px`, minWidth: '340px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 4, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#64748B' }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
              tickFormatter={(v) => Number(v).toLocaleString('id-ID')}
            />
            <YAxis
              type="category"
              dataKey="category"
              width={yAxisWidth}
              tick={{ fontSize: 11, fill: '#17365D' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => truncateLabel(String(v), 25)}
            />
            <Tooltip content={<StackedTooltip />} cursor={{ fill: '#EAF3F9', opacity: 0.6 }} />
            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
            {seriesKeys.map((key, idx) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="a"
                fill={getColor(key, idx)}
                barSize={20}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
