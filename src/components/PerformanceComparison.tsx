import React from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { useI18n } from '@/i18n';

interface PerformanceData {
  daily?: number;
  weekly?: number;
  monthly?: number;
  ytd?: number;
  yearly?: number;
}

interface PerformanceComparisonProps {
  symbol: string;
  companyName?: string;
  data: PerformanceData;
  compact?: boolean;
}

const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({ 
  symbol, 
  companyName,
  data, 
  compact = false 
}) => {
  const { t } = useI18n();
  const formatChange = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getChangeColor = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'text-muted-foreground';
    if (value > 0) return 'text-green-600 dark:text-green-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (value: number | undefined) => {
    if (value === undefined || value === null) return <Minus className="w-3 h-3" />;
    if (value > 0) return <TrendingUp className="w-3 h-3" />;
    if (value < 0) return <TrendingDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getBackgroundGradient = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'bg-muted/30';
    if (value > 5) return 'bg-gradient-to-r from-green-500/10 to-green-500/5';
    if (value > 0) return 'bg-green-500/5';
    if (value < -5) return 'bg-gradient-to-r from-red-500/10 to-red-500/5';
    if (value < 0) return 'bg-red-500/5';
    return 'bg-muted/30';
  };

  const periods = [
    { key: 'daily', label: 'D', fullLabel: t('Today') },
    { key: 'weekly', label: 'W', fullLabel: t('Week') },
    { key: 'monthly', label: 'M', fullLabel: t('Month') },
    { key: 'ytd', label: 'YTD', fullLabel: t('Year to Date') },
    { key: 'yearly', label: 'Y', fullLabel: t('Year') },
  ] as const;

  if (compact) {
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer group">
            {periods.slice(0, 3).map(({ key }) => {
              const value = data[key];
              return (
                <span 
                  key={key}
                  className={cn(
                    "text-[10px] px-1 py-0.5 rounded",
                    getChangeColor(value),
                    getBackgroundGradient(value)
                  )}
                >
                  {formatChange(value)}
                </span>
              );
            })}
            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-64 p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{symbol}</span>
              {companyName && (
                <span className="text-xs text-muted-foreground truncate">{companyName}</span>
              )}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {periods.map(({ key, label, fullLabel }) => {
                const value = data[key];
                return (
                  <div key={key} className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-1">{fullLabel}</p>
                    <div 
                      className={cn(
                        "flex flex-col items-center justify-center py-1.5 rounded",
                        getBackgroundGradient(value)
                      )}
                    >
                      <span className={cn("text-xs font-medium", getChangeColor(value))}>
                        {formatChange(value)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">{symbol}</span>
        {companyName && (
          <span className="text-xs text-muted-foreground">{companyName}</span>
        )}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {periods.map(({ key, label, fullLabel }) => {
          const value = data[key];
          return (
            <div 
              key={key}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-lg border border-border/50",
                getBackgroundGradient(value)
              )}
            >
              <span className="text-[10px] text-muted-foreground mb-1">{fullLabel}</span>
              <div className={cn("flex items-center gap-1", getChangeColor(value))}>
                {getChangeIcon(value)}
                <span className="text-xs font-medium">{formatChange(value)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PerformanceComparison;
