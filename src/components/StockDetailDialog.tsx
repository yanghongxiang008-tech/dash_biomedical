import React, { useState, useEffect } from 'react';
import { format, subDays, startOfYear, parseISO } from 'date-fns';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileText, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";

interface StockNote {
  id: string;
  symbol: string;
  date: string;
  note: string;
  created_at: string;
}

interface PerformanceData {
  daily?: number;
  weekly?: number;
  monthly?: number;
  ytd?: number;
  yearly?: number;
}

interface StockDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  companyName?: string;
  currentPrice?: number;
  changePercent?: number;
  benchmarkSymbol?: string;
}

type DateRangePreset = 'week' | 'month' | 'quarter' | 'ytd' | 'year' | 'custom';

const StockDetailDialog: React.FC<StockDetailDialogProps> = ({
  open,
  onOpenChange,
  symbol,
  companyName,
  currentPrice,
  changePercent = 0,
  benchmarkSymbol
}) => {
  const { toast } = useToast();
  const { t } = useI18n();
  
  // Timeline state
  const [notes, setNotes] = useState<StockNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('year');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 365));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Performance state
  const [performanceData, setPerformanceData] = useState<PerformanceData>({});
  const [benchmarkData, setBenchmarkData] = useState<PerformanceData>({});
  const [performanceLoading, setPerformanceLoading] = useState(false);

  const presetLabels: Record<DateRangePreset, string> = {
    week: t('1 Week'),
    month: t('1 Month'),
    quarter: t('3 Months'),
    ytd: t('YTD'),
    year: t('1 Year'),
    custom: t('Custom')
  };

  // Update date range based on preset
  useEffect(() => {
    const today = new Date();
    switch (dateRangePreset) {
      case 'week':
        setStartDate(subDays(today, 7));
        setEndDate(today);
        break;
      case 'month':
        setStartDate(subDays(today, 30));
        setEndDate(today);
        break;
      case 'quarter':
        setStartDate(subDays(today, 90));
        setEndDate(today);
        break;
      case 'ytd':
        setStartDate(startOfYear(today));
        setEndDate(today);
        break;
      case 'year':
        setStartDate(subDays(today, 365));
        setEndDate(today);
        break;
    }
  }, [dateRangePreset]);

  // Fetch notes when dialog opens or filters change
  useEffect(() => {
    if (!open || !symbol) return;

    const fetchNotes = async () => {
      setNotesLoading(true);
      const { data, error } = await supabase
        .from('stock_notes')
        .select('*')
        .eq('symbol', symbol)
        .gte('date', format(startDate, 'yyyy-MM-dd'))
        .lte('date', format(endDate, 'yyyy-MM-dd'))
        .order('date', { ascending: false });

      if (error) {
        toast({
          title: t("Error"),
          description: t("Failed to fetch notes"),
          variant: "destructive"
        });
      } else {
        setNotes(data || []);
      }
      setNotesLoading(false);
    };

    fetchNotes();
  }, [open, symbol, startDate, endDate]);

  // Fetch performance data from edge function in real-time
  useEffect(() => {
    if (!open || !symbol) return;

    const fetchPerformance = async () => {
      setPerformanceLoading(true);
      
      try {
        console.log(`[StockDetailDialog] Fetching real-time performance for ${symbol}`);
        
        // Fetch stock performance
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-stock-performance`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({ symbol }),
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch performance: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[StockDetailDialog] Performance data received:`, data);

        setPerformanceData({
          daily: data.daily,
          weekly: data.weekly,
          monthly: data.monthly,
          ytd: data.ytd,
          yearly: data.yearly,
        });

        // Fetch benchmark performance if available
        if (benchmarkSymbol) {
          try {
            console.log(`[StockDetailDialog] Fetching benchmark performance for ${benchmarkSymbol}`);
            const benchmarkResponse = await fetch(
              `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-stock-performance`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ symbol: benchmarkSymbol }),
              }
            );

            if (benchmarkResponse.ok) {
              const benchmarkResult = await benchmarkResponse.json();
              console.log(`[StockDetailDialog] Benchmark data received:`, benchmarkResult);
              setBenchmarkData({
                daily: benchmarkResult.daily,
                weekly: benchmarkResult.weekly,
                monthly: benchmarkResult.monthly,
                ytd: benchmarkResult.ytd,
                yearly: benchmarkResult.yearly,
              });
            }
          } catch (benchmarkError) {
            console.error('Error fetching benchmark performance:', benchmarkError);
          }
        }
      } catch (error) {
        console.error('Error fetching performance:', error);
        // Fallback to current day's change if API fails
        setPerformanceData({ daily: changePercent });
      }
      
      setPerformanceLoading(false);
    };

    fetchPerformance();
  }, [open, symbol, changePercent, benchmarkSymbol]);

  const formatChange = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'text-muted-foreground';
    if (value > 0) return 'text-emerald-600 dark:text-emerald-400';
    if (value < 0) return 'text-red-600 dark:text-red-400';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (value: number | undefined) => {
    if (value === undefined || value === null) return <Minus className="w-3.5 h-3.5" />;
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5" />;
    return <Minus className="w-3.5 h-3.5" />;
  };

  const periods = [
    { key: 'daily', label: t('Today') },
    { key: 'weekly', label: t('Week') },
    { key: 'monthly', label: t('Month') },
    { key: 'ytd', label: t('YTD') },
    { key: 'yearly', label: t('Year') },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
              {symbol.substring(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-medium" >{symbol}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {companyName && (
                  <span className="text-xs text-muted-foreground">{companyName}</span>
                )}
                {currentPrice && (
                  <span className="text-sm font-medium">${currentPrice.toFixed(2)}</span>
                )}
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                  changePercent >= 0 ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"
                )}>
                  {changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {formatChange(changePercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank')}
           >
              <ExternalLink className="w-3.5 h-3.5" />
              {t('Yahoo Finance')}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 space-y-5 max-h-[calc(85vh-140px)]">
          {/* Performance Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <TrendingUp className="w-3.5 h-3.5" />
                {t('Performance')}
              </div>
              {benchmarkSymbol && (
                <span className="text-[10px] text-muted-foreground">
                  {t('vs {symbol}', { symbol: benchmarkSymbol })}
                </span>
              )}
            </div>
            
            {performanceLoading ? (
              <div className="grid grid-cols-5 gap-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="p-3 border-l-2 border-muted/50">
                    <div className="h-2.5 w-8 bg-muted/50 rounded animate-pulse mb-2" />
                    <div className="h-4 w-12 bg-muted/50 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-3">
                {periods.map(({ key, label }) => {
                  const value = performanceData[key];
                  const benchmarkValue = benchmarkData[key];
                  const diff = (value !== undefined && benchmarkValue !== undefined) 
                    ? value - benchmarkValue 
                    : undefined;
                  
                  return (
                    <div 
                      key={key}
                      className="p-3 border-l-2 transition-colors"
                      style={{ 
                        borderLeftColor: value === undefined ? 'hsl(var(--muted-foreground) / 0.3)' : 
                          value > 0 ? 'hsl(142.1 76.2% 36.3%)' : 
                          value < 0 ? 'hsl(0 84.2% 60.2%)' : 'hsl(var(--muted-foreground) / 0.3)'
                      }}
                   >
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</p>
                      <div className={cn("flex items-center gap-1 mt-0.5", getChangeColor(value))}>
                        {getChangeIcon(value)}
                        <span className="text-sm font-semibold">{formatChange(value)}</span>
                      </div>
                      {benchmarkSymbol && diff !== undefined && (
                        <div className={cn("text-[10px] mt-1", getChangeColor(diff))}>
                          α {diff > 0 ? '+' : ''}{diff.toFixed(2)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes Timeline Section */}
          <div className="space-y-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                {t('Notes Timeline')}
              </div>
              <div className="flex items-center gap-2">
                <Select 
                  value={dateRangePreset} 
                  onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}
               >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(presetLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {dateRangePreset === 'custom' && (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {format(startDate, "MM-dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={(date) => date && setStartDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <span className="text-xs text-muted-foreground">~</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs px-2">
                          {format(endDate, "MM-dd")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={(date) => date && setEndDate(date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </>
                )}
              </div>
            </div>

            {/* Notes Content */}
            <div>
              {notesLoading ? (
                <div className="space-y-4 py-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="w-3 h-3 rounded-full bg-muted/50 animate-pulse mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-16 bg-muted/50 rounded animate-pulse" />
                        <div className="h-12 bg-muted/30 rounded-lg animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mb-3 opacity-40" />
                  <p className="text-sm">{t('No notes yet')}</p>
                  <p className="text-xs mt-1 text-muted-foreground/70">{t('Add notes for this stock on the Daily page')}</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-border" />
                  
                  <div className="space-y-4">
                    {notes.map((note) => (
                      <div key={note.id} className="relative flex gap-3">
                        {/* Timeline dot */}
                        <div className="relative z-10 flex items-center justify-center w-3 h-3 mt-1.5 rounded-full bg-primary/20 border-2 border-primary">
                          <div className="w-1 h-1 rounded-full bg-primary" />
                        </div>
                        
                        {/* Content */}
                        <div className="flex-1 pb-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-foreground">
                              {format(parseISO(note.date), "MMM d")}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(parseISO(note.date), "EEEE")}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs leading-relaxed text-foreground/90">
                            {note.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Stats */}
            {notes.length > 0 && (
              <div className="text-[10px] text-muted-foreground text-right pt-2">
                {t('{count} notes', { count: notes.length })} · {format(startDate, "yyyy-MM-dd")} ~ {format(endDate, "yyyy-MM-dd")}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StockDetailDialog;
