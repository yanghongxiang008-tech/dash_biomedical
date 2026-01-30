import React, { useState, useEffect } from 'react';
import { format, subDays, startOfMonth, startOfYear, isAfter, isBefore, parseISO } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, FileText, ChevronRight, Clock, TrendingUp, TrendingDown, X } from "lucide-react";
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

interface StockNotesTimelineProps {
  symbol?: string;
  onClose?: () => void;
}

type DateRangePreset = 'week' | 'month' | 'quarter' | 'ytd' | 'year' | 'custom';

const StockNotesTimeline: React.FC<StockNotesTimelineProps> = ({ symbol, onClose }) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [notes, setNotes] = useState<StockNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(symbol || '');
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('month');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 30));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Fetch available symbols
  useEffect(() => {
    const fetchSymbols = async () => {
      const { data, error } = await supabase
        .from('stock_notes')
        .select('symbol')
        .order('symbol');

      if (!error && data) {
        const uniqueSymbols = [...new Set(data.map(d => d.symbol))];
        setAvailableSymbols(uniqueSymbols);
        if (!selectedSymbol && uniqueSymbols.length > 0) {
          setSelectedSymbol(uniqueSymbols[0]);
        }
      }
    };
    fetchSymbols();
  }, []);

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
      // custom doesn't change dates
    }
  }, [dateRangePreset]);

  // Fetch notes for selected symbol and date range
  useEffect(() => {
    if (!selectedSymbol) return;

    const fetchNotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('stock_notes')
        .select('*')
        .eq('symbol', selectedSymbol)
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
      setLoading(false);
    };

    fetchNotes();
  }, [selectedSymbol, startDate, endDate]);

  const presetLabels: Record<DateRangePreset, string> = {
    week: t('1 Week'),
    month: t('1 Month'),
    quarter: t('3 Months'),
    ytd: t('YTD'),
    year: t('1 Year'),
    custom: t('Custom')
  };

  return (
    <Card className="shadow-lg border-border/60 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {t('Stock Notes Timeline')}
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Symbol Selector */}
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder={t("Select stock")} />
            </SelectTrigger>
            <SelectContent>
              {availableSymbols.map(sym => (
                <SelectItem key={sym} value={sym} className="text-xs">
                  {sym}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date Range Preset */}
          <Select 
            value={dateRangePreset} 
            onValueChange={(v) => setDateRangePreset(v as DateRangePreset)}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(presetLabels).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Custom Date Range */}
          {dateRangePreset === 'custom' && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {format(startDate, "yyyy-MM-dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">{t('to')}</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs">
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    {format(endDate, "yyyy-MM-dd")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{t('{count} notes', { count: notes.length })}</span>
          <span>
            {format(startDate, "yyyy-MM-dd")} ~ {format(endDate, "yyyy-MM-dd")}
          </span>
        </div>

        {/* Timeline */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : notes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">{t('No notes yet')}</p>
              <p className="text-xs mt-1">{t('Select another stock or adjust the date range')}</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
              
              <div className="space-y-4">
                {notes.map((note, index) => (
                  <div key={note.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex items-center justify-center w-4 h-4 mt-1 rounded-full bg-primary/20 border-2 border-primary">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                          {format(parseISO(note.date), "yyyy-MM-dd")}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          ({format(parseISO(note.date), "EEEE")})
                        </span>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/40 border border-border/50 text-xs leading-relaxed">
                        {note.note}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default StockNotesTimeline;
