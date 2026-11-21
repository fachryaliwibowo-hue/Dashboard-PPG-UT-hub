import React from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  footerNote?: string;
  isEmpty?: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  action,
  footerNote,
  isEmpty = false,
  emptyMessage = 'Tidak ada data yang memenuhi kriteria filter aktif.',
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-[#17365D] leading-snug">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {isEmpty ? (
        <div className="flex-1 min-h-[220px] flex items-center justify-center border border-dashed border-slate-200 rounded-lg bg-[#F5F7FA]/60 p-6 text-center">
          <p className="text-xs text-slate-500 max-w-xs">{emptyMessage}</p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">{children}</div>
      )}

      {footerNote && (
        <div className="mt-3 pt-2.5 border-t border-slate-100 text-[11px] text-slate-500 tabular-nums">
          {footerNote}
        </div>
      )}
    </div>
  );
};
