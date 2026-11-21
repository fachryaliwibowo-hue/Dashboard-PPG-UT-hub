import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  accent?: 'navy' | 'blue' | 'orange' | 'green';
}

const ACCENT_STYLES: Record<NonNullable<KpiCardProps['accent']>, string> = {
  navy: 'bg-[#17365D]/8 text-[#17365D]',
  blue: 'bg-[#EAF3F9] text-[#0066A4]',
  orange: 'bg-[#F39C35]/12 text-[#C87512]',
  green: 'bg-[#27AE60]/12 text-[#1E874B]',
};

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = 'blue',
}) => {
  const formattedValue =
    typeof value === 'number' ? value.toLocaleString('id-ID') : value;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium text-slate-600 leading-snug">
          {title}
        </span>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${ACCENT_STYLES[accent]}`}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-[#17365D] tracking-tight tabular-nums leading-none">
          {formattedValue}
        </div>
        {subtitle && (
          <p className="mt-2 text-[11px] text-slate-500 tabular-nums truncate" title={subtitle}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
