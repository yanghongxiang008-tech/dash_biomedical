import React, { useState, useEffect, useRef, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileText, ChevronDown, ChevronUp, Loader2, Trash2, ArrowUp, ArrowDown, Check, Sparkles, CloudDownload, CheckCircle2 } from "lucide-react";
import NotionIcon from "./NotionIcon";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './DailyNotesEditor.css';
import ConfirmDialog from "./ConfirmDialog";
import { useI18n } from "@/i18n";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Stock {
  id: string;
  symbol: string;
  group_id: string;
  display_order: number;
}

interface StockGroup {
  id: string;
  name: string;
  display_order: number;
  index_symbol?: string | null;
}

interface WeeklyStockData {
  symbol: string;
  companyName: string;
  weekStartPrice: number;
  weekEndPrice: number;
  change: number;
  changePercent: number;
  weekStartDate: string;
  weekEndDate: string;
  monthChange: number | null;
  monthChangePercent: number | null;
  ytdChange: number | null;
  ytdChangePercent: number | null;
  yearChange: number | null;
  yearChangePercent: number | null;
}

interface StockNote {
  id: string;
  symbol: string;
  date: string;
  note: string;
}

interface WeeklyStatsProps {
  stocks: Stock[];
  groups: StockGroup[];
}

type SortTimeframe = 'week' | 'month' | 'ytd' | 'year';

const WeeklyStats = ({ stocks, groups }: WeeklyStatsProps) => {
  const { toast } = useToast();
  const { t } = useI18n();

  // Default to last Friday
  const getLastFriday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysBack = dayOfWeek === 0 ? 2 : dayOfWeek === 6 ? 1 : dayOfWeek + 2;
    return subDays(today, daysBack);
  };

  const [weekEndDate, setWeekEndDate] = useState<Date>(getLastFriday());
  const [weeklyData, setWeeklyData] = useState<Record<string, WeeklyStockData>>({});
  const [stockNotes, setStockNotes] = useState<Record<string, StockNote[]>>({});
  const [loading, setLoading] = useState(false);
  const [dataGenerated, setDataGenerated] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Weekly notes state (like DailyNotesEditor)
  const [weeklyNotesContent, setWeeklyNotesContent] = useState('');
  const [savedWeeklyNotesContent, setSavedWeeklyNotesContent] = useState('');
  const [isEditingWeeklyNotes, setIsEditingWeeklyNotes] = useState(false);
  const [savingWeeklyNotes, setSavingWeeklyNotes] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showNotionSyncConfirm, setShowNotionSyncConfirm] = useState(false);
  const [syncingToNotion, setSyncingToNotion] = useState(false);

  // Auto-save refs
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const weeklyNotesEditorRef = useRef<HTMLDivElement>(null);
  const loadingSteps = [
    {
      id: 'prepare',
      label: t('Prepare weekly data'),
      icon: Sparkles,
      matches: ['Preparing weekly data']
    },
    {
      id: 'fetch',
      label: t('Fetch market data'),
      icon: CloudDownload,
      matches: ['Fetching weekly stock data']
    },
    {
      id: 'notes',
      label: t('Load notes'),
      icon: FileText,
      matches: ['Loading notes', 'Loading weekly notes']
    },
    {
      id: 'done',
      label: t('Complete'),
      icon: CheckCircle2,
      matches: ['Complete']
    }
  ];
  const activeLoadingStepIndex = loadingStatus
    ? loadingSteps.findIndex((step) => step.matches.some((match) => loadingStatus.includes(match)))
    : -1;
  const activeLoadingStep = activeLoadingStepIndex >= 0 ? loadingSteps[activeLoadingStepIndex] : null;
  const loadingPercent = Number.isFinite(loadingProgress) ? Math.min(100, Math.max(0, loadingProgress)) : 0;

  // Tab and sort state
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sortTimeframe, setSortTimeframe] = useState<SortTimeframe>('week');
  const [sortAscending, setSortAscending] = useState(false); // false = high to low (default)
  const [chartTimeframe, setChartTimeframe] = useState<SortTimeframe>('week'); // Chart timeframe

  // Calculate week start date (7 calendar days before)
  const weekStartDate = subDays(weekEndDate, 7);

  // Quill editor configuration - simplified toolbar
  const modules = {
    toolbar: [
      ['bold', 'italic', 'underline'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link'],
      ['clean']
    ],
  };

  const formats = [
    'bold', 'italic', 'underline',
    'color', 'background', 'list', 'bullet', 'link'
  ];

  // Fetch weekly stock data
  const fetchWeeklyData = async () => {
    setLoading(true);
    setLoadingProgress(10);
    setLoadingStatus('Preparing weekly data...');
    try {
      const allSymbols = Array.from(new Set([...stocks.map(s => s.symbol), 'QQQ', 'IWM']));
      const dateStr = format(weekEndDate, 'yyyy-MM-dd');

      setLoadingProgress(35);
      setLoadingStatus('Fetching weekly stock data...');
      const { data, error } = await supabase.functions.invoke('fetch-weekly-stock-data', {
        body: { symbols: allSymbols, weekEndDate: dateStr }
      });

      if (error) throw error;

      setLoadingProgress(60);
      const dataMap: Record<string, WeeklyStockData> = {};
      (data.stockData || []).forEach((stock: WeeklyStockData) => {
        dataMap[stock.symbol] = stock;
      });
      setWeeklyData(dataMap);

      // Fetch stock notes for the week
      setLoadingProgress(75);
      setLoadingStatus('Loading notes...');
      await fetchStockNotes(dateStr);

      // Load weekly notes
      setLoadingProgress(90);
      setLoadingStatus('Loading weekly notes...');
      await loadWeeklyNotes(dateStr);

      setLoadingProgress(100);
      setLoadingStatus('Complete!');
      setDataGenerated(true);
      toast({
        title: t("Weekly data generated"),
        description: t("Loaded multi-period data for {count} stocks", { count: Object.keys(dataMap).length }),
      });
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      toast({
        title: t("Failed to fetch data"),
        description: t("Please try again later"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setLoadingStatus('');
    }
  };

  // Fetch stock notes for the week
  const fetchStockNotes = async (weekEnd: string) => {
    const weekStart = format(subDays(new Date(weekEnd), 7), 'yyyy-MM-dd');

    const { data, error } = await supabase
      .from('stock_notes')
      .select('*')
      .gte('date', weekStart)
      .lte('date', weekEnd);

    if (error) {
      console.error('Error fetching stock notes:', error);
      return;
    }

    // Group notes by symbol
    const notesBySymbol: Record<string, StockNote[]> = {};
    (data || []).forEach(note => {
      if (!notesBySymbol[note.symbol]) {
        notesBySymbol[note.symbol] = [];
      }
      notesBySymbol[note.symbol].push(note);
    });

    // Sort notes by date within each symbol
    Object.keys(notesBySymbol).forEach(symbol => {
      notesBySymbol[symbol].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    setStockNotes(notesBySymbol);
  };

  // Load weekly notes
  const loadWeeklyNotes = async (weekEnd: string) => {
    const { data, error } = await supabase
      .from('weekly_additional_notes')
      .select('*')
      .eq('week_end_date', weekEnd)
      .maybeSingle();

    if (error) {
      console.error('Error loading weekly notes:', error);
      return;
    }

    setWeeklyNotesContent(data?.content || '');
    setSavedWeeklyNotesContent(data?.content || '');
    setIsEditingWeeklyNotes((data?.content || '').length === 0);
  };

  // Save weekly notes (internal function for auto-save)
  const saveWeeklyNotesInternal = useCallback(async (contentToSave: string, dateToSave: Date, silent: boolean = false) => {
    const dateStr = format(dateToSave, 'yyyy-MM-dd');
    if (!silent) setSavingWeeklyNotes(true);
    setAutoSaveStatus('saving');

    try {
      const { error } = await supabase
        .from('weekly_additional_notes')
        .upsert({
          week_end_date: dateStr,
          content: contentToSave.trim()
        }, {
          onConflict: 'week_end_date'
        });

      if (error) throw error;

      setSavedWeeklyNotesContent(contentToSave);
      setAutoSaveStatus('saved');

      // Clear the "saved" status after 2 seconds
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
      statusTimeoutRef.current = setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);

    } catch (error) {
      console.error('Error saving weekly notes:', error);
      setAutoSaveStatus('idle');
      toast({
        title: "保存失败",
        description: "请稍后重试",
        variant: "destructive"
      });
    } finally {
      if (!silent) setSavingWeeklyNotes(false);
    }
  }, [toast]);

  // Auto-save effect with debounce for weekly notes
  useEffect(() => {
    // Only auto-save when editing and content has changed
    if (!isEditingWeeklyNotes || weeklyNotesContent === savedWeeklyNotesContent) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds debounce)
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveWeeklyNotesInternal(weeklyNotesContent, weekEndDate, true);
    }, 1500);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [weeklyNotesContent, savedWeeklyNotesContent, isEditingWeeklyNotes, weekEndDate, saveWeeklyNotesInternal]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  // Click outside detection for weekly notes editor
  useEffect(() => {
    if (!isEditingWeeklyNotes) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (weeklyNotesEditorRef.current && !weeklyNotesEditorRef.current.contains(event.target as Node)) {
        // Save any pending changes before exiting
        if (weeklyNotesContent !== savedWeeklyNotesContent) {
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
          }
          saveWeeklyNotesInternal(weeklyNotesContent, weekEndDate, true);
        }
        setIsEditingWeeklyNotes(false);
      }
    };

    // Delay adding the listener to avoid immediate trigger
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditingWeeklyNotes, weeklyNotesContent, savedWeeklyNotesContent, weekEndDate, saveWeeklyNotesInternal]);

  // Clear weekly notes
  const handleClearWeeklyNotes = async () => {
    setSavingWeeklyNotes(true);
    const dateStr = format(weekEndDate, 'yyyy-MM-dd');

    try {
      const { error } = await supabase
        .from('weekly_additional_notes')
        .delete()
        .eq('week_end_date', dateStr);

      if (error) throw error;

      setWeeklyNotesContent('');
      setSavedWeeklyNotesContent('');
      setIsEditingWeeklyNotes(false);
      setShowClearConfirm(false);

      toast({
        title: t("Success"),
        description: t("Weekly notes cleared successfully"),
      });
    } catch (error) {
      console.error('Error clearing weekly notes:', error);
      toast({
        title: t("Error"),
        description: t("Failed to clear weekly notes"),
        variant: "destructive"
      });
    } finally {
      setSavingWeeklyNotes(false);
    }
  };

  // Toggle note expansion
  const toggleNoteExpansion = (symbol: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  // Calculate group performance for a given timeframe
  const getGroupPerformance = (group: StockGroup, timeframe: SortTimeframe = 'week') => {
    if (group.index_symbol && weeklyData[group.index_symbol]) {
      const data = weeklyData[group.index_symbol];
      return {
        changePercent: getChangeByTimeframe(data, timeframe),
        displaySymbol: group.index_symbol
      };
    }

    const groupStocks = stocks.filter(s => s.group_id === group.id);
    const groupData = groupStocks
      .map(s => weeklyData[s.symbol])
      .filter(Boolean);

    if (groupData.length === 0) return { changePercent: 0, displaySymbol: 'AVG' };

    const avgChange = groupData.reduce((sum, d) => sum + getChangeByTimeframe(d, timeframe), 0) / groupData.length;
    return { changePercent: avgChange, displaySymbol: 'AVG' };
  };

  // Get change value based on timeframe
  const getChangeByTimeframe = (data: WeeklyStockData, timeframe: SortTimeframe): number => {
    switch (timeframe) {
      case 'week':
        return data.changePercent;
      case 'month':
        return data.monthChangePercent ?? 0;
      case 'ytd':
        return data.ytdChangePercent ?? 0;
      case 'year':
        return data.yearChangePercent ?? 0;
      default:
        return data.changePercent;
    }
  };

  // Get stocks for selected group, sorted by selected timeframe
  const getGroupStocksData = (groupId: string) => {
    const groupStocks = stocks.filter(s => s.group_id === groupId);
    const stocksWithData = groupStocks
      .map(s => ({ stock: s, data: weeklyData[s.symbol] }))
      .filter(item => item.data);

    // Sort by selected timeframe
    return stocksWithData.sort((a, b) => {
      const aChange = getChangeByTimeframe(a.data, sortTimeframe);
      const bChange = getChangeByTimeframe(b.data, sortTimeframe);
      return sortAscending ? aChange - bChange : bChange - aChange;
    });
  };

  // Chart data based on selected chart timeframe
  const getChartData = () => {
    const chartData = groups.map(group => {
      const perf = getGroupPerformance(group, chartTimeframe);
      return {
        name: group.name,
        value: perf.changePercent,
        displaySymbol: perf.displaySymbol,
        fill: perf.changePercent >= 0 ? '#22c55e' : '#ef4444'
      };
    });

    // Add QQQ and IWM
    if (weeklyData['QQQ']) {
      const value = getChangeByTimeframe(weeklyData['QQQ'], chartTimeframe);
      chartData.push({
        name: 'QQQ',
        value,
        displaySymbol: 'QQQ',
        fill: value >= 0 ? '#22c55e' : '#ef4444'
      });
    }
    if (weeklyData['IWM']) {
      const value = getChangeByTimeframe(weeklyData['IWM'], chartTimeframe);
      chartData.push({
        name: 'IWM',
        value,
        displaySymbol: 'IWM',
        fill: value >= 0 ? '#22c55e' : '#ef4444'
      });
    }

    return chartData.sort((a, b) => b.value - a.value);
  };

  const chartTimeframeLabels: Record<SortTimeframe, string> = {
    week: t('Week'),
    month: t('Month'),
    ytd: t('YTD'),
    year: t('Year')
  };

  // Format change percent
  const formatChange = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '-';
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get color class for change
  const getChangeColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'text-muted-foreground';
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  // Set default selected group when data is generated
  useEffect(() => {
    if (dataGenerated && groups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(groups[0].id);
    }
  }, [dataGenerated, groups, selectedGroupId]);

  // Auto-fetch data on initial mount and when week end date changes
  useEffect(() => {
    if (stocks.length > 0 && groups.length > 0) {
      fetchWeeklyData();
    }
  }, [weekEndDate, stocks.length, groups.length]);

  const hasWeeklyNotesChanges = weeklyNotesContent !== savedWeeklyNotesContent;
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const selectedGroupPerf = selectedGroup ? getGroupPerformance(selectedGroup) : null;

  const timeframeLabels: Record<SortTimeframe, string> = {
    week: t('Week'),
    month: t('Month'),
    ytd: t('YTD'),
    year: t('Year')
  };

  return (
    <div className="space-y-5">
      {/* Header - Now handled by parent page */}

      {/* Date Selection and Generate Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {t('Period: {start} ~ {end}', {
            start: format(weekStartDate, "yyyy-MM-dd"),
            end: format(weekEndDate, "yyyy-MM-dd")
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full sm:w-[200px] justify-start text-left font-normal text-xs hover:shadow-sm transition-all duration-200 ease-out",
                  !weekEndDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-3 w-3" />
                {weekEndDate ? format(weekEndDate, "yyyy-MM-dd") : t("Select date")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={weekEndDate}
                onSelect={(date) => {
                  if (date) {
                    setWeekEndDate(date);
                  }
                }}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            onClick={fetchWeeklyData}
            disabled={loading}
            size="sm"
            className="gap-2 rounded-lg px-6 shadow-sm text-foreground border-0 bg-transparent bg-gradient-to-r from-amber-200/70 via-fuchsia-200/60 to-sky-200/70 hover:bg-transparent hover:from-amber-200/80 hover:via-fuchsia-200/70 hover:to-sky-200/80 hover:brightness-100 transition-all duration-200 ease-out flex-shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? t('Loading...') : t('Generate')}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="overflow-hidden rounded-xl bg-gradient-to-r from-amber-200/30 via-fuchsia-200/25 to-sky-200/30 px-4 py-2.5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between gap-3 text-xs mb-2">
            <span
              className="text-[13px] font-semibold bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-[length:200%_100%] bg-clip-text text-transparent animate-text-shimmer"
            >
              {t('Loading data')}
            </span>
            <span className="text-muted-foreground tabular-nums">
              {Math.round(loadingPercent)}%
            </span>
          </div>
          {activeLoadingStep ? (
            <div className="flex items-center gap-2 text-[11px] text-foreground/80 mb-2">
              <activeLoadingStep.icon className="h-3.5 w-3.5 text-primary" />
              <span>{activeLoadingStep.label}</span>
            </div>
          ) : null}
          <div className="relative h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/70 transition-all duration-500 ease-out"
              style={{ width: `${loadingPercent}%` }}
            />
            <div
              className="absolute inset-0 animate-shimmer-slow"
              style={{
                backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                backgroundSize: '200% 100%'
              }}
            />
          </div>
          {loadingStatus && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {t(loadingStatus)}
            </p>
          )}
        </div>
      )}

      {/* Main Content - Only show after data is generated */}
      {dataGenerated && (
        <div className="space-y-4">
          {/* Weekly Notes */}
          <Card className="border border-border/60 bg-background shadow-sm hover:shadow-md transition-shadow duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
              <div>
                <h3 className="text-sm font-medium text-foreground">{t('Weekly Notes')}</h3>
                <p className="text-[10px] text-muted-foreground">{format(weekStartDate, "MMM dd")} - {format(weekEndDate, "MMM dd, yyyy")}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Auto-save status */}
                {isEditingWeeklyNotes && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border border-border/50">
                    {autoSaveStatus === 'saving' && (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                        <span className="text-[10px] text-amber-600">{t('Saving...')}</span>
                      </>
                    )}
                    {autoSaveStatus === 'saved' && (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] text-emerald-600">{t('Saved')}</span>
                      </>
                    )}
                    {autoSaveStatus === 'idle' && hasWeeklyNotesChanges && (
                      <span className="text-[10px] text-amber-600">{t('Editing...')}</span>
                    )}
                    {autoSaveStatus === 'idle' && !hasWeeklyNotesChanges && (
                      <span className="text-[10px] text-muted-foreground">{t('Auto Save')}</span>
                    )}
                  </div>
                )}

                {/* Action buttons when not editing */}
                {!isEditingWeeklyNotes && savedWeeklyNotesContent && (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowNotionSyncConfirm(true)}
                      disabled={syncingToNotion}
                      className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted gap-1"
                    >
                      <NotionIcon size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowClearConfirm(true)}
                      className="h-7 px-2 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Editor Content */}
            <CardContent className="p-0">
              {isEditingWeeklyNotes ? (
                <div ref={weeklyNotesEditorRef} className="weekly-notes-editor-light">
                  <ReactQuill
                    value={weeklyNotesContent}
                    onChange={setWeeklyNotesContent}
                    modules={modules}
                    formats={formats}
                    placeholder={t("Summarize weekly market trends, key observations, and insights...")}
                    theme="snow"
                  />
                </div>
              ) : (
                <div
                  className="min-h-[160px] p-4 cursor-text hover:bg-muted/30 transition-colors"
                  onClick={() => setIsEditingWeeklyNotes(true)}
                >
                  {weeklyNotesContent ? (
                    <div
                      className="prose prose-sm max-w-none 
                        prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:my-1.5
                        prose-strong:text-foreground 
                        prose-ul:text-foreground/80 prose-ol:text-foreground/80 
                        prose-li:text-foreground/80 prose-li:my-0.5
                        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                        text-[11px] sm:text-xs"
                      dangerouslySetInnerHTML={{ __html: weeklyNotesContent }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-[120px]">
                      <p className="text-muted-foreground text-xs">{t("Click to add weekly summary notes")}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sector Performance Chart - Fixed height to prevent layout shift */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-medium">
                  {t('Sector {timeframe} Performance', { timeframe: chartTimeframeLabels[chartTimeframe] })}
                </CardTitle>
                <div className="flex gap-1">
                  {(['week', 'month', 'ytd', 'year'] as SortTimeframe[]).map((tf) => (
                    <Button
                      key={tf}
                      variant={chartTimeframe === tf ? "default" : "outline"}
                      size="sm"
                      onClick={() => setChartTimeframe(tf)}
                      className={cn(
                        "h-6 px-2 text-[10px]",
                        chartTimeframe === tf && "bg-primary text-primary-foreground"
                      )}
                    >
                      {timeframeLabels[tf]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={getChartData()}
                  margin={{ top: 30, right: 10, left: 10, bottom: 40 }}
                  barCategoryGap="20%"
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value: number) => [`${value.toFixed(2)}%`, t("{timeframe} Change", { timeframe: chartTimeframeLabels[chartTimeframe] })]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--border))" />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    label={{
                      position: 'top',
                      formatter: (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`,
                      fill: 'hsl(var(--foreground))',
                      fontSize: 10
                    }}
                  >
                    {getChartData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Group Tabs - Fixed container to prevent layout shift */}
          <Card className="shadow-sm border-border">
            <CardHeader className="pb-2 px-3 sm:px-6">
              <div className="flex flex-col gap-3">
                {/* Tabs for groups - Fixed height container */}
                <div className="min-h-[36px]">
                  <Tabs value={selectedGroupId || ''} onValueChange={(value) => setSelectedGroupId(value)}>
                    <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0">
                      {groups.map(group => {
                        const groupStocks = stocks.filter(s => s.group_id === group.id);
                        const groupData = groupStocks.map(s => weeklyData[s.symbol]).filter(Boolean);

                        return (
                          <TabsTrigger
                            key={group.id}
                            value={group.id}
                            className={cn(
                              "text-xs px-3 py-1.5 rounded-md border transition-all",
                              selectedGroupId === group.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                            )}
                          >
                            <span>{group.name}</span>
                            <span className="ml-1.5 text-[10px] opacity-70">({groupData.length})</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>

                {/* Header with group info and sort controls - Fixed height */}
                <div className="min-h-[32px]">
                  {selectedGroup && (
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-sm font-medium text-foreground">
                          {selectedGroup.name}
                        </CardTitle>
                        <span className="px-2 py-0.5 bg-muted rounded text-xs">
                          {t('{count} stocks', { count: getGroupStocksData(selectedGroup.id).length })}
                        </span>
                        {selectedGroupPerf && (
                          <span className={cn(
                            "px-2 py-0.5 rounded font-medium text-xs",
                            selectedGroupPerf.changePercent > 0 ? "text-green-600 bg-green-50 dark:bg-green-950/30" :
                              selectedGroupPerf.changePercent < 0 ? "text-red-600 bg-red-50 dark:bg-red-950/30" : "text-muted-foreground bg-muted"
                          )}>
                            {selectedGroupPerf.displaySymbol}: {selectedGroupPerf.changePercent > 0 ? '+' : ''}{selectedGroupPerf.changePercent.toFixed(2)}%
                          </span>
                        )}
                      </div>

                      {/* Sort controls */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{t('Sort')}:</span>
                        <Select value={sortTimeframe} onValueChange={(v) => setSortTimeframe(v as SortTimeframe)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="week">{t('Week')}</SelectItem>
                            <SelectItem value="month">{t('Month')}</SelectItem>
                            <SelectItem value="ytd">{t('YTD')}</SelectItem>
                            <SelectItem value="year">{t('Year')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSortAscending(!sortAscending)}
                          className="h-7 px-2 text-xs gap-1"
                        >
                          {sortAscending ? (
                            <>
                              <ArrowUp className="h-3 w-3" />
                              {t('Low to High')}
                            </>
                          ) : (
                            <>
                              <ArrowDown className="h-3 w-3" />
                              {t('High to Low')}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column headers - Fixed height */}
                <div className="min-h-[28px]">
                  {selectedGroup && (
                    <div className="flex items-center text-[10px] text-muted-foreground font-medium px-2 py-1 border-b border-border">
                      <span className="w-14">{t('Stock')}</span>
                      <span className="w-16 text-right pr-1">{t('Close')}</span>
                      <span className={cn("w-16 text-right pr-1", sortTimeframe === 'week' && "text-primary font-semibold")}>{t('Week')}</span>
                      <span className={cn("w-16 text-right pr-1", sortTimeframe === 'month' && "text-primary font-semibold")}>{t('Month')}</span>
                      <span className={cn("w-16 text-right pr-1", sortTimeframe === 'ytd' && "text-primary font-semibold")}>{t('YTD')}</span>
                      <span className={cn("w-16 text-right pr-1", sortTimeframe === 'year' && "text-primary font-semibold")}>{t('Year')}</span>
                      <span className="flex-1 text-right pr-2">{t('Notes')}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-0 px-3 sm:px-6">
              {selectedGroupId && (
                <div className="grid gap-1 text-xs">
                  {getGroupStocksData(selectedGroupId).map(({ stock, data: stockData }) => {
                    const notes = stockNotes[stock.symbol] || [];
                    const isExpanded = expandedNotes.has(stock.symbol);

                    return (
                      <div key={stock.id} className="bg-card rounded border border-border min-h-[40px]">
                        <div className="flex items-center py-1.5 px-2 h-[36px]">
                          <span className="font-medium text-foreground w-14">{stock.symbol}</span>
                          <span className="text-muted-foreground w-16 text-right pr-1 text-[11px]">
                            ${stockData.weekEndPrice.toFixed(2)}
                          </span>
                          <span className={cn(
                            "w-16 text-right pr-1 transition-all",
                            getChangeColor(stockData.changePercent),
                            sortTimeframe === 'week'
                              ? "font-bold bg-primary/10 rounded px-1"
                              : "opacity-50"
                          )}>
                            {formatChange(stockData.changePercent)}
                          </span>
                          <span className={cn(
                            "w-16 text-right pr-1 transition-all",
                            getChangeColor(stockData.monthChangePercent),
                            sortTimeframe === 'month'
                              ? "font-bold bg-primary/10 rounded px-1"
                              : "opacity-50"
                          )}>
                            {formatChange(stockData.monthChangePercent)}
                          </span>
                          <span className={cn(
                            "w-16 text-right pr-1 transition-all",
                            getChangeColor(stockData.ytdChangePercent),
                            sortTimeframe === 'ytd'
                              ? "font-bold bg-primary/10 rounded px-1"
                              : "opacity-50"
                          )}>
                            {formatChange(stockData.ytdChangePercent)}
                          </span>
                          <span className={cn(
                            "w-16 text-right pr-1 transition-all",
                            getChangeColor(stockData.yearChangePercent),
                            sortTimeframe === 'year'
                              ? "font-bold bg-primary/10 rounded px-1"
                              : "opacity-50"
                          )}>
                            {formatChange(stockData.yearChangePercent)}
                          </span>

                          {/* Notes indicator */}
                          <div className="flex-1 flex justify-end min-w-[60px]">
                            {notes.length > 0 ? (
                              <Collapsible open={isExpanded} onOpenChange={() => toggleNoteExpansion(stock.symbol)}>
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 gap-1 text-xs"
                                  >
                                    <FileText className="h-3 w-3" />
                                    <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[10px] font-medium">
                                      {notes.length}
                                    </span>
                                    {isExpanded ? (
                                      <ChevronUp className="h-3 w-3" />
                                    ) : (
                                      <ChevronDown className="h-3 w-3" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              </Collapsible>
                            ) : (
                              <span className="text-muted-foreground/40 text-[10px] pr-2">-</span>
                            )}
                          </div>
                        </div>

                        {/* Expanded notes */}
                        {notes.length > 0 && (
                          <Collapsible open={isExpanded}>
                            <CollapsibleContent>
                              <div className="border-t border-border px-3 py-2 bg-muted/30 space-y-2">
                                {notes.map(note => (
                                  <div key={note.id} className="text-xs">
                                    <span className="text-muted-foreground font-medium">
                                      {format(new Date(note.date), 'MM/dd')}:
                                    </span>
                                    <span className="ml-2 text-foreground">{note.note}</span>
                                  </div>
                                ))}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        onConfirm={handleClearWeeklyNotes}
        title={t("Clear Weekly Notes")}
        description={t("Are you sure you want to clear all weekly notes for {start} - {end}? This action cannot be undone.", {
          start: format(weekStartDate, 'MMM dd'),
          end: format(weekEndDate, 'MMM dd, yyyy')
        })}
        confirmText={t("Clear")}
        cancelText={t("Cancel")}
      />

      <ConfirmDialog
        open={showNotionSyncConfirm}
        onOpenChange={setShowNotionSyncConfirm}
        onConfirm={async () => {
          setSyncingToNotion(true);
          try {
            const { error } = await supabase.functions.invoke('sync-to-notion', {
              body: {
                type: 'weekly_notes',
                date: format(weekEndDate, 'yyyy-MM-dd'),
                content: savedWeeklyNotesContent
              }
            });
            if (error) throw error;
            toast({
              title: t("Synced to Notion"),
              description: t("Weekly notes synced successfully"),
            });
          } catch (error) {
            console.error('Error syncing to Notion:', error);
            toast({
              title: t("Sync failed"),
              description: t("Failed to sync to Notion"),
              variant: "destructive"
            });
          } finally {
            setSyncingToNotion(false);
          }
        }}
        title={t("Sync to Notion")}
        description={t("Are you sure you want to sync weekly notes for {start} - {end} to Notion?", {
          start: format(weekStartDate, 'MMM dd'),
          end: format(weekEndDate, 'MMM dd, yyyy')
        })}
        confirmText={t("Sync")}
        cancelText={t("Cancel")}
      />
    </div>
  );
};

export default WeeklyStats;
