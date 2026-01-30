/**
 * Dashboard stat card component
 * Clean design with unified icons, hover animations, and week comparison
 */

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface WeekComparison {
  thisWeek: number;
  lastWeek: number;
  percentChange: number | null;
}

interface StatCardProps {
  title: string;
  value: number;
  growth?: number;
  weekComparison?: WeekComparison;
  icon: LucideIcon;
  iconClassName?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  growth,
  weekComparison,
  icon: Icon,
  iconClassName,
  onClick,
}) => {
  const { t } = useI18n();
  const showGrowth = growth !== undefined && growth !== 0;
  const isPositiveGrowth = growth !== undefined && growth > 0;
  
  // Week comparison display
  const showWeekComparison = weekComparison !== undefined;
  const weekChange = weekComparison?.percentChange;
  const isPositiveWeek = weekChange !== null && weekChange > 0;
  const isNegativeWeek = weekChange !== null && weekChange < 0;
  const isNeutralWeek = weekChange === null || weekChange === 0;
  
  return (
    <div
      className={cn(
        "group p-5 rounded-xl bg-muted/40 hover:bg-muted/60 transition-all duration-200",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-3">
        <Icon className={cn(
          "h-5 w-5 text-muted-foreground group-hover:scale-110 transition-transform duration-200",
          iconClassName
        )} />
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        
        {showGrowth && (
          <div className={cn(
            "flex items-center gap-1 ml-auto text-xs font-medium",
            isPositiveGrowth 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-red-500 dark:text-red-400'
          )}>
            {isPositiveGrowth ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>{isPositiveGrowth ? '+' : ''}{growth}</span>
          </div>
        )}
      </div>
      
      <p className="text-2xl font-semibold tracking-tight">{value}</p>
      
      {/* Week-over-week comparison */}
      {showWeekComparison && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t('This week vs last')}</span>
            <div className={cn(
              "flex items-center gap-1 font-medium",
              isPositiveWeek && 'text-emerald-600 dark:text-emerald-400',
              isNegativeWeek && 'text-red-500 dark:text-red-400',
              isNeutralWeek && 'text-muted-foreground'
            )}>
              {isPositiveWeek && <TrendingUp className="h-3 w-3" />}
              {isNegativeWeek && <TrendingDown className="h-3 w-3" />}
              {isNeutralWeek && <Minus className="h-3 w-3" />}
              <span>
                {weekChange !== null ? (
                  `${weekChange > 0 ? '+' : ''}${weekChange}%`
                ) : (
                  t('N/A')
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
            <span className="tabular-nums">{t('{count} this week', { count: weekComparison.thisWeek })}</span>
            <span>·</span>
            <span className="tabular-nums">{t('{count} last week', { count: weekComparison.lastWeek })}</span>
          </div>
        </div>
      )}
    </div>
  );
};
