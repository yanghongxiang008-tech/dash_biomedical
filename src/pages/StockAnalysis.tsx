import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Plus, Minus, Edit2, Save, X, Brain, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Trash2, Settings, User, LogOut, KeyRound, MessageCircle, Upload, FileText, Lightbulb, Database, CloudDownload, CheckCircle2, Sparkles, Archive } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DailyNotesEditor from "@/components/DailyNotesEditor";
import SearchBar from "@/components/SearchBar";
import SearchResults, { MarketNoteResult, StockResult } from "@/components/SearchResults";
import ConfirmDialog from "@/components/ConfirmDialog";
import Navigation from "@/components/Navigation";
import AboutPage from "@/components/AboutPage";
import FeedbackDialog from "@/components/FeedbackDialog";
import UserManagement from "@/components/UserManagement";
import StockChat from "@/components/StockChat";
import WeeklyStats from "@/components/WeeklyStats";
import AIChat from "@/components/AIChat";
import AIChatEnhanced from "@/components/AIChatEnhanced";
import StockDetailDialog from "@/components/StockDetailDialog";
import NotionIcon from "@/components/NotionIcon";
import Footer from "@/components/Footer";
import PageSectionHeader from "@/components/PageSectionHeader";
import PageLayout from "@/components/PageLayout";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { useI18n } from "@/i18n";

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

interface StockData {
  symbol: string;
  companyName?: string;
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  explanation?: string;
  customNote?: string;
  savedNote?: string;
  expandedExplanation?: boolean;
}

interface GroupData {
  group: StockGroup;
  stocks: Stock[];
  stockData: StockData[];
}

const StockAnalysis = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();

  // Function to get previous trading day (skip weekends)
  const getPreviousTradingDay = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday

    let daysBack = 1;

    if (dayOfWeek === 0) {
      // Sunday -> Friday (2 days back)
      daysBack = 2;
    } else if (dayOfWeek === 1) {
      // Monday -> Friday (3 days back)  
      daysBack = 3;
    } else if (dayOfWeek === 6) {
      // Saturday -> Friday (1 day back)
      daysBack = 1;
    } else {
      // Tuesday-Friday -> previous day (1 day back)
      daysBack = 1;
    }

    const previousTradingDay = new Date(today);
    previousTradingDay.setDate(today.getDate() - daysBack);

    console.log(`Today: ${today.toDateString()} (day ${dayOfWeek})`);
    console.log(`Previous trading day: ${previousTradingDay.toDateString()}`);

    return previousTradingDay;
  };

  const [selectedDate, setSelectedDate] = useState<Date>(getPreviousTradingDay());
  const [groups, setGroups] = useState<StockGroup[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [stockData, setStockData] = useState<Record<string, StockData>>({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingStock, setEditingStock] = useState<string | null>(null);
  const [newSymbol, setNewSymbol] = useState('');
  const [addingToGroup, setAddingToGroup] = useState<string | null>(null);
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [groupNameBuffer, setGroupNameBuffer] = useState<Record<string, string>>({});
  const [addingNewGroup, setAddingNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupIndexSymbol, setNewGroupIndexSymbol] = useState('');
  const [editingGroupIndex, setEditingGroupIndex] = useState<string | null>(null);
  const [groupIndexBuffer, setGroupIndexBuffer] = useState<Record<string, string>>({});
  const [explainLoading, setExplainLoading] = useState<string | null>(null);
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());
  const [noteBuffer, setNoteBuffer] = useState<Record<string, string>>({});
  const [isComposing, setIsComposing] = useState<Record<string, boolean>>({});
  const [noteAutoSaveStatus, setNoteAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [expandedNoteKey, setExpandedNoteKey] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    marketNotes: MarketNoteResult[];
    stockResults: StockResult[];
    query: string;
  } | null>(null);
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string | null>(null); // null means "All"
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    open: false,
    title: '',
    description: '',
    onConfirm: () => { }
  });
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [activeTab, setActiveTab] = useState<'ai' | 'home' | 'weekly' | 'chat' | 'admin'>(() => {
    const stateTab = (location.state as { activeTab?: string })?.activeTab;
    if (stateTab && ['ai', 'home', 'weekly', 'chat', 'admin'].includes(stateTab)) {
      return stateTab as 'ai' | 'home' | 'weekly' | 'chat' | 'admin';
    }
    return 'home';
  });
  const [syncingToNotion, setSyncingToNotion] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [selectedStockDetail, setSelectedStockDetail] = useState<{
    symbol: string;
    companyName?: string;
    currentPrice?: number;
    changePercent?: number;
    benchmarkSymbol?: string;
  } | null>(null);
  const noteAutoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const noteSaveDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const loadingSteps = [
    {
      id: 'prepare',
      label: t('Prepare data'),
      icon: Sparkles,
      matches: ['Preparing', 'Refreshing stock data from market API']
    },
    {
      id: 'cache',
      label: t('Check cache'),
      icon: Database,
      matches: ['Checking cache', 'Loading cached data']
    },
    {
      id: 'fetch',
      label: t('Fetch market data'),
      icon: CloudDownload,
      matches: ['Fetching fresh stock data']
    },
    {
      id: 'save',
      label: t('Cache results'),
      icon: Archive,
      matches: ['Caching stock data']
    },
    {
      id: 'notes',
      label: t('Load notes'),
      icon: FileText,
      matches: ['Loading explanations and notes']
    },
    {
      id: 'done',
      label: t('Complete'),
      icon: CheckCircle2,
      matches: ['Complete', 'Market is open']
    }
  ];
  const activeLoadingStepIndex = loadingStatus
    ? loadingSteps.findIndex((step) => step.matches.some((match) => loadingStatus.includes(match)))
    : -1;
  const activeLoadingStep = activeLoadingStepIndex >= 0 ? loadingSteps[activeLoadingStepIndex] : null;
  const loadingPercent = Number.isFinite(loadingProgress) ? Math.min(100, Math.max(0, loadingProgress)) : 0;

  // Handle navigation state changes for tab switching
  useEffect(() => {
    const stateTab = (location.state as { activeTab?: string })?.activeTab;
    if (stateTab && ['ai', 'home', 'weekly', 'chat', 'admin'].includes(stateTab)) {
      setActiveTab(stateTab as 'ai' | 'home' | 'weekly' | 'chat' | 'admin');
    }
  }, [location.state]);

  const fetchData = async () => {
    console.log('[fetchData] Starting initial data fetch...');
    setInitialLoading(true);

    try {
      console.log('[fetchData] Fetching groups...');
      const groupsPromise = supabase
        .from('stock_groups')
        .select('*')
        .order('display_order');

      console.log('[fetchData] Fetching stocks...');
      const stocksPromise = supabase
        .from('stocks')
        .select('*')
        .order('display_order');

      // Use Promise.allSettled for better error handling
      const results = await Promise.allSettled([
        groupsPromise,
        stocksPromise
      ]);

      console.log('[fetchData] Results:', results.map(r => r.status));

      // Handle groups result
      if (results[0].status === 'fulfilled') {
        const groupsData = results[0].value?.data;
        if (groupsData) {
          console.log(`[fetchData] Loaded ${groupsData.length} groups`);
          setGroups(groupsData);
        }
      } else {
        console.error('[fetchData] Groups fetch failed:', results[0].reason);
      }

      // Handle stocks result
      if (results[1].status === 'fulfilled') {
        const stocksData = results[1].value?.data;
        if (stocksData) {
          console.log(`[fetchData] Loaded ${stocksData.length} stocks`);
          setStocks(stocksData);
        }
      } else {
        console.error('[fetchData] Stocks fetch failed:', results[1].reason);
      }

      // Show error only if both failed
      if (results[0].status === 'rejected' && results[1].status === 'rejected') {
        toast({
          title: t("Connection Error"),
          description: t("Could not load data. Please check your connection."),
          variant: "destructive"
        });
      }

      console.log('[fetchData] Initial data fetch completed');
    } catch (error) {
      console.error('[fetchData] Unexpected error:', error);
      toast({
        title: t("Error"),
        description: t("Failed to load initial data"),
        variant: "destructive"
      });
    } finally {
      setInitialLoading(false);
      console.log('[fetchData] Initial loading state cleared');
    }
  };

  // Add a new group
  const addGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      const maxOrder = Math.max(...groups.map(g => g.display_order), 0);
      const { data, error } = await supabase
        .from('stock_groups')
        .insert({
          name: newGroupName.trim(),
          display_order: maxOrder + 1,
          index_symbol: newGroupIndexSymbol.trim() || null
        })
        .select()
        .single();

      if (error) throw error;

      setGroups(prev => [...prev, data]);
      setNewGroupName('');
      setNewGroupIndexSymbol('');
      setAddingNewGroup(false);
      toast({
        title: t("Success"),
        description: t('Group "{name}" created successfully', { name: data.name }),
      });
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: t("Error"),
        description: t("Failed to create group"),
        variant: "destructive"
      });
    }
  };

  // Rename a group
  const renameGroup = async (groupId: string) => {
    const newName = groupNameBuffer[groupId]?.trim();
    if (!newName) return;

    try {
      const { error } = await supabase
        .from('stock_groups')
        .update({ name: newName })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, name: newName } : g
      ));
      setEditingGroup(null);
      setGroupNameBuffer(prev => ({ ...prev, [groupId]: '' }));
      toast({
        title: t("Success"),
        description: t("Group renamed successfully"),
      });
    } catch (error) {
      console.error('Error renaming group:', error);
      toast({
        title: t("Error"),
        description: t("Failed to rename group"),
        variant: "destructive"
      });
    }
  };

  // Update group index symbol
  const updateGroupIndexSymbol = async (groupId: string) => {
    const newIndexSymbol = groupIndexBuffer[groupId]?.trim();

    try {
      const { error } = await supabase
        .from('stock_groups')
        .update({ index_symbol: newIndexSymbol || null })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, index_symbol: newIndexSymbol || null } : g
      ));
      setEditingGroupIndex(null);
      setGroupIndexBuffer(prev => ({ ...prev, [groupId]: '' }));
      toast({
        title: t("Success"),
        description: t("Index symbol updated successfully"),
      });
    } catch (error) {
      console.error('Error updating index symbol:', error);
      toast({
        title: t("Error"),
        description: t("Failed to update index symbol"),
        variant: "destructive"
      });
    }
  };

  // Delete a group
  const deleteGroup = async (groupId: string) => {
    // First check if group has stocks
    const groupStocks = stocks.filter(s => s.group_id === groupId);
    if (groupStocks.length > 0) {
      toast({
        title: t("Cannot delete group"),
        description: t("Please remove all stocks from the group first"),
        variant: "destructive"
      });
      return;
    }

    const groupName = groups.find(g => g.id === groupId)?.name || t('this group');
    setConfirmDialog({
      open: true,
      title: t("Delete Group"),
      description: t('Are you sure you want to delete the group "{name}"? This action cannot be undone.', { name: groupName }),
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('stock_groups')
            .delete()
            .eq('id', groupId);

          if (error) throw error;

          setGroups(prev => prev.filter(g => g.id !== groupId));
          toast({
            title: t("Success"),
            description: t("Group deleted successfully"),
          });
        } catch (error) {
          console.error('Error deleting group:', error);
          toast({
            title: t("Error"),
            description: t("Failed to delete group"),
            variant: "destructive"
          });
        }
      }
    });
  };

  // Skeleton loading component
  const StockRowSkeleton = () => (
    <div className="flex items-center justify-between py-1.5 px-2 bg-card rounded border border-border animate-pulse">
      <div className="flex items-center gap-2">
        <div className="h-4 w-10 bg-muted rounded"></div>
        <div className="h-4 w-16 bg-muted rounded"></div>
        <div className="h-4 w-14 bg-muted rounded"></div>
        <div className="h-4 w-16 bg-muted rounded"></div>
        <div className="h-4 w-32 bg-muted rounded"></div>
      </div>
      <div className="flex gap-1">
        <div className="h-6 w-6 bg-muted rounded"></div>
        <div className="h-6 w-6 bg-muted rounded"></div>
        <div className="h-6 w-6 bg-muted rounded"></div>
      </div>
    </div>
  );

  const GroupSkeleton = () => (
    <Card className="shadow-sm border-border animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-24 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-7 w-16 bg-muted rounded animate-pulse"></div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-1.5 text-xs">
          {[...Array(3)].map((_, i) => (
            <StockRowSkeleton key={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  // Helper function to check if currently in US market trading hours
  const isInTradingHours = () => {
    const now = new Date();
    // Convert to US Eastern Time
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const day = etTime.getDay();

    // Check if it's a weekday (1 = Monday, 5 = Friday)
    if (day === 0 || day === 6) return false;

    // Market hours: 9:30 AM - 4:00 PM ET
    if (hours < 9 || hours >= 16) return false;
    if (hours === 9 && minutes < 30) return false;

    return true;
  };

  const fetchStockData = async (forceRefresh = false) => {
    console.log(`[fetchStockData] Starting stock data fetch... (forceRefresh=${forceRefresh})`);
    setLoading(true);
    setLoadingProgress(0);
    setLoadingStatus(forceRefresh ? 'Refreshing stock data from market API...' : 'Preparing to fetch stock data...');

    try {
      // Deduplicate symbols - a stock can exist in multiple groups
      const allSymbols = Array.from(new Set(stocks.map(s => s.symbol)));
      const currentDate = format(selectedDate, 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      const isToday = currentDate === today;
      const inTradingHours = isInTradingHours();

      console.log(`[fetchStockData] Fetching data for ${allSymbols.length} unique symbols on ${currentDate}`);
      console.log(`[fetchStockData] Is today: ${isToday}, In trading hours: ${inTradingHours}`);

      // If it's today and market is open, skip fetching data
      if (isToday && inTradingHours) {
        console.log('[fetchStockData] Market is currently open, skipping today\'s data fetch');
        setLoadingProgress(100);
        setLoadingStatus('Market is open - showing previous day data');
        setLoading(false);
        toast({
          title: t("Market Open"),
          description: t("Cannot fetch intraday data. Please check after market close."),
        });
        return;
      }

      setLoadingProgress(10);
      setLoadingStatus(forceRefresh ? 'Loading cached data for fallback...' : 'Checking cache for existing data...');

      // Check cache without timeout - let browser handle it
      let cachedData = null;
      try {
        console.log('[fetchStockData] Querying cache...');
        const cacheResult = await supabase
          .from('stock_price_cache')
          .select('symbol, current_price, previous_close, change_amount, change_percent, company_name')
          .eq('date', currentDate)
          .in('symbol', allSymbols);

        cachedData = cacheResult.data;
        console.log(`[fetchStockData] Cache check completed: found ${cachedData?.length || 0} cached symbols`);
      } catch (cacheError) {
        console.error('[fetchStockData] Cache query failed:', cacheError);
        cachedData = null;
      }

      const cachedSymbols = new Set(cachedData?.map(item => item.symbol) || []);
      const uncachedSymbols = forceRefresh ? allSymbols : allSymbols.filter(symbol => !cachedSymbols.has(symbol));

      setLoadingProgress(25);
      setLoadingStatus(
        forceRefresh
          ? 'Refreshing symbols from market API...'
          : 'Fetching fresh stock data...'
      );

      let stockDataMap: Record<string, StockData> = {};

      // Use cached data
      if (cachedData) {
        cachedData.forEach(cached => {
          stockDataMap[cached.symbol] = {
            symbol: cached.symbol,
            companyName: cached.company_name || undefined,
            currentPrice: Number(cached.current_price),
            previousClose: Number(cached.previous_close),
            change: Number(cached.change_amount),
            changePercent: Number(cached.change_percent)
          };
        });
      }

      // Fetch missing data from API only if needed
      if (uncachedSymbols.length > 0) {
        setLoadingProgress(40);
        setLoadingStatus('Fetching fresh stock data from market API...');
        console.log(`[fetchStockData] Fetching fresh data for ${uncachedSymbols.length} symbols:`, uncachedSymbols.join(', '));

        try {
          console.log('[fetchStockData] Invoking edge function...');
          const fetchResult = await supabase.functions.invoke('fetch-stock-data', {
            body: { symbols: uncachedSymbols, date: currentDate }
          });

          console.log('[fetchStockData] Edge function response:', fetchResult);

          if (fetchResult.error) {
            console.error('[fetchStockData] Edge function error:', fetchResult.error);
            throw fetchResult.error;
          }

          const freshData = fetchResult.data;

          setLoadingProgress(60);

          // Process fresh data and cache it
          if (freshData?.stockData && Array.isArray(freshData.stockData)) {
            console.log(`[fetchStockData] Processing ${freshData.stockData.length} fresh stock entries`);
            const cacheEntries = [];

            for (const stock of freshData.stockData) {
              stockDataMap[stock.symbol] = stock;

              // Prepare cache entry
              cacheEntries.push({
                symbol: stock.symbol,
                date: currentDate,
                current_price: stock.currentPrice,
                previous_close: stock.previousClose,
                change_amount: stock.change,
                change_percent: stock.changePercent,
                company_name: stock.companyName
              });
            }

            // Save to cache
            if (cacheEntries.length > 0) {
              setLoadingStatus('Caching stock data for faster future access...');
              try {
                console.log(`[fetchStockData] Saving ${cacheEntries.length} entries to cache`);
                const cacheResult = await supabase
                  .from('stock_price_cache')
                  .upsert(cacheEntries, {
                    onConflict: 'symbol,date',
                    ignoreDuplicates: false
                  });

                if (cacheResult.error) {
                  console.error('[fetchStockData] Cache save error:', cacheResult.error);
                } else {
                  console.log(`[fetchStockData] Successfully cached ${cacheEntries.length} stock entries`);
                }
              } catch (cacheError) {
                console.error('[fetchStockData] Cache save failed:', cacheError);
                // Continue even if caching fails
              }
            }
          } else {
            console.warn('[fetchStockData] No stock data in response or invalid format:', freshData);
          }
        } catch (fetchError) {
          console.error('[fetchStockData] Failed to fetch fresh stock data:', fetchError);
          toast({
            title: t("Warning"),
            description: t("Some stock data could not be fetched. Check console for details."),
            variant: "destructive"
          });
        }
      } else if (!forceRefresh) {
        console.log('[fetchStockData] All data found in cache, no API calls needed');
      } else {
        console.log('[fetchStockData] No symbols to refresh');
      }

      // Fetch explanations and custom notes for all symbols
      const allSymbolsWithData = Object.keys(stockDataMap);
      if (allSymbolsWithData.length > 0) {
        setLoadingProgress(75);
        setLoadingStatus('Loading explanations and notes...');

        try {
          console.log(`[fetchStockData] Fetching explanations and notes for ${allSymbolsWithData.length} symbols`);

          // Use Promise.allSettled for better compatibility
          const [explanationsResult, notesResult] = await Promise.allSettled([
            supabase
              .from('stock_explanations')
              .select('symbol, explanation')
              .eq('date', currentDate)
              .in('symbol', allSymbolsWithData),
            supabase
              .from('stock_notes')
              .select('symbol, note')
              .eq('date', currentDate)
              .in('symbol', allSymbolsWithData)
          ]);

          // Add explanations if successful
          if (explanationsResult.status === 'fulfilled' && explanationsResult.value?.data) {
            console.log(`[fetchStockData] Loaded ${explanationsResult.value.data.length} explanations`);
            explanationsResult.value.data.forEach((exp: any) => {
              if (stockDataMap[exp.symbol]) {
                stockDataMap[exp.symbol].explanation = exp.explanation;
              }
            });
          } else if (explanationsResult.status === 'rejected') {
            console.error('[fetchStockData] Failed to fetch explanations:', explanationsResult.reason);
          }

          // Add notes if successful
          if (notesResult.status === 'fulfilled' && notesResult.value?.data) {
            console.log(`[fetchStockData] Loaded ${notesResult.value.data.length} notes`);
            notesResult.value.data.forEach((note: any) => {
              if (stockDataMap[note.symbol]) {
                stockDataMap[note.symbol].savedNote = note.note;
                stockDataMap[note.symbol].customNote = note.note;
              }
            });
          } else if (notesResult.status === 'rejected') {
            console.error('[fetchStockData] Failed to fetch notes:', notesResult.reason);
          }
        } catch (metaError) {
          console.error('[fetchStockData] Unexpected error fetching explanations or notes:', metaError);
          // Continue even if metadata fetch fails
        }
      }

      setLoadingProgress(100);
      setLoadingStatus('Complete!');
      setStockData(stockDataMap);

    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast({
        title: t("Error"),
        description: t("Failed to fetch stock data"),
        variant: "destructive"
      });
      setStockData({});
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const addStock = async (groupId: string, symbol: string) => {
    if (!symbol.trim()) return;

    try {
      const groupStocks = stocks.filter(s => s.group_id === groupId);
      const maxOrder = Math.max(...groupStocks.map(s => s.display_order), 0);

      const { data, error } = await supabase
        .from('stocks')
        .insert({
          symbol: symbol.trim().toUpperCase(),
          group_id: groupId,
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      setStocks(prev => [...prev, data]);
      setNewSymbol('');
      setAddingToGroup(null);
      toast({
        title: t("Success"),
        description: t('Added {symbol} to group', { symbol: symbol.toUpperCase() }),
      });
    } catch (error) {
      console.error('Error adding stock:', error);
      toast({
        title: t("Error"),
        description: t("Failed to add stock"),
        variant: "destructive"
      });
    }
  };

  const removeStock = async (stockId: string) => {
    const stock = stocks.find(s => s.id === stockId);
    const symbol = stock?.symbol || t('this stock');

    setConfirmDialog({
      open: true,
      title: t("Remove Stock"),
      description: t('Are you sure you want to remove {symbol} from the list? This action cannot be undone.', { symbol }),
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('stocks')
            .delete()
            .eq('id', stockId);

          if (error) throw error;

          setStocks(prev => prev.filter(s => s.id !== stockId));
          toast({
            title: t("Success"),
            description: t("Stock removed successfully"),
          });
        } catch (error) {
          console.error('Error removing stock:', error);
          toast({
            title: t("Error"),
            description: t("Failed to remove stock"),
            variant: "destructive"
          });
        }
      }
    });
  };

  const explainStockMovement = async (symbol: string, changePercent: number) => {
    setExplainLoading(symbol);
    try {
      const currentDate = format(selectedDate, 'yyyy-MM-dd');

      const { data, error } = await supabase.functions.invoke('explain-stock-movement', {
        body: { symbol, changePercent, date: currentDate }
      });

      if (error) throw error;

      if (data?.explanation) {
        // Save to database
        const { error: dbError } = await supabase
          .from('stock_explanations')
          .upsert(
            {
              symbol,
              date: currentDate,
              change_percent: changePercent,
              explanation: data.explanation
            },
            { onConflict: 'symbol,date' }
          );

        if (dbError) {
          console.error('Error saving explanation to database:', dbError);
          toast({
            title: t("Warning"),
            description: t("Explanation generated but failed to save to database"),
            variant: "destructive"
          });
        }

        // Update local state
        setStockData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            explanation: data.explanation
          }
        }));

        toast({
          title: t("Success"),
          description: t("AI explanation generated and saved"),
        });
      }
    } catch (error) {
      console.error('Error explaining stock movement:', error);
      toast({
        title: t("Error"),
        description: t("Failed to explain stock movement"),
        variant: "destructive"
      });
    }
    setExplainLoading(null);
  };

  const toggleExplanation = (symbol: string) => {
    setExpandedExplanations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(symbol)) {
        newSet.delete(symbol);
      } else {
        newSet.add(symbol);
      }
      return newSet;
    });
  };

  const updateCustomNote = (symbol: string, note: string) => {
    setNoteBuffer(prev => ({ ...prev, [symbol]: note }));
    setStockData(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        customNote: note
      }
    }));
    if (noteSaveDebounceRef.current) {
      clearTimeout(noteSaveDebounceRef.current);
    }
    noteSaveDebounceRef.current = setTimeout(() => {
      saveCustomNote(symbol, note, { setStatus: true });
    }, 800);
  };

  // Save note to database
  const saveCustomNote = async (
    symbol: string,
    noteOverride?: string,
    options?: { closeAfterSave?: boolean; showToast?: boolean; setStatus?: boolean }
  ) => {
    const currentDate = format(selectedDate, 'yyyy-MM-dd');
    const note = noteOverride ?? noteBuffer[symbol] ?? '';
    const { closeAfterSave = false, showToast = false, setStatus = false } = options || {};

    try {
      if (setStatus) {
        setNoteAutoSaveStatus('saving');
      }
      const trimmedNote = note.trim();
      if (trimmedNote) {
        const { error } = await supabase
          .from('stock_notes')
          .upsert(
            {
              symbol,
              date: currentDate,
              note: trimmedNote
            },
            { onConflict: 'symbol,date' }
          );

        if (error) throw error;

        // Update savedNote to reflect successful save - this will update all occurrences of this symbol
        setStockData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            savedNote: trimmedNote
          }
        }));
        if (showToast) {
          toast({
            title: t("Success"),
            description: t("Note saved successfully"),
          });
        }
      } else {
        // If note is empty, delete from database
        const { error } = await supabase
          .from('stock_notes')
          .delete()
          .eq('symbol', symbol)
          .eq('date', currentDate);

        if (error) throw error;

        // Clear saved note - this will update all occurrences of this symbol
        setStockData(prev => ({
          ...prev,
          [symbol]: {
            ...prev[symbol],
            savedNote: undefined
          }
        }));
      }
      if (setStatus) {
        setNoteAutoSaveStatus('saved');
        if (noteAutoSaveTimeoutRef.current) {
          clearTimeout(noteAutoSaveTimeoutRef.current);
        }
        noteAutoSaveTimeoutRef.current = setTimeout(() => {
          setNoteAutoSaveStatus('idle');
        }, 2000);
      }
      if (closeAfterSave) {
        setEditingStock(null);
      }
    } catch (error) {
      console.error('Error saving note:', error);
      if (setStatus) {
        setNoteAutoSaveStatus('idle');
      }
      toast({
        title: t("Error"),
        description: t("Failed to save note"),
        variant: "destructive"
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: t("Error"),
        description: t("Failed to logout"),
        variant: "destructive"
      });
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    if (!newPassword || !confirmNewPassword) {
      toast({
        title: t("Error"),
        description: t("Please fill in all password fields"),
        variant: "destructive"
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: t("Error"),
        description: t("New passwords do not match"),
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: t("Error"),
        description: t("Password must be at least 6 characters"),
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: t("Success"),
        description: t("Password changed successfully")
      });

      setChangePasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: t("Error"),
        description: error.message || t("Failed to change password"),
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Handle sync to Notion
  const handleSyncToNotion = async () => {
    setShowSyncConfirm(false);
    setSyncingToNotion(true);
    const currentDate = format(selectedDate, 'yyyy-MM-dd');

    try {
      const { data, error } = await supabase.functions.invoke('sync-to-notion', {
        body: { date: currentDate }
      });

      if (error) throw error;

      toast({
        title: t("Sync successful"),
        description: t("Synced {marketNotes} market notes and {stockNotes} stock notes to Notion", {
          marketNotes: data.synced.marketNotes,
          stockNotes: data.synced.stockNotes,
        }),
      });
    } catch (error) {
      console.error('Error syncing to Notion:', error);
      toast({
        title: t("Sync failed"),
        description: t("Error syncing to Notion. Please check console logs."),
        variant: "destructive"
      });
    } finally {
      setSyncingToNotion(false);
    }
  };

  // Get user email and check admin role
  const [userEmail, setUserEmail] = useState('');
  useEffect(() => {
    const checkUserRole = async () => {
      setCheckingRole(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);

          // Check if user has admin role
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();

          setIsAdmin(!!roleData);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      } finally {
        setCheckingRole(false);
      }
    };

    checkUserRole();
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch stock data when stocks or date changes
  useEffect(() => {
    if (stocks.length > 0 && !initialLoading) {
      fetchStockData();
    }
  }, [stocks, selectedDate, initialLoading]);

  // Clear expanded explanations and note buffer when date changes
  useEffect(() => {
    setExpandedExplanations(new Set());
    setNoteBuffer({});
    setExpandedNoteKey(null);
    // Clear search when date changes
    setIsSearching(false);
    setSearchResults(null);
  }, [selectedDate]);

  useEffect(() => {
    setNoteAutoSaveStatus('idle');
    if (editingStock) {
      setExpandedNoteKey(null);
    }
    if (noteSaveDebounceRef.current) {
      clearTimeout(noteSaveDebounceRef.current);
      noteSaveDebounceRef.current = null;
    }
  }, [editingStock]);

  useEffect(() => {
    const activeKey = editingStock ?? expandedNoteKey;
    if (!activeKey) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        return;
      }
      const container = target.closest('[data-note-key]') as HTMLElement | null;
      if (container?.dataset.noteKey === activeKey) {
        return;
      }
      setEditingStock(null);
      setExpandedNoteKey(null);
    };

    const timeoutId = window.setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingStock, expandedNoteKey]);

  useEffect(() => {
    return () => {
      if (noteSaveDebounceRef.current) {
        clearTimeout(noteSaveDebounceRef.current);
      }
      if (noteAutoSaveTimeoutRef.current) {
        clearTimeout(noteAutoSaveTimeoutRef.current);
      }
    };
  }, []);

  // Search function
  const handleSearch = async (query: string) => {
    setIsSearching(true);
    setSearchLoading(true);
    try {
      // Search in daily_notes
      const { data: dailyNotesData } = await supabase
        .from('daily_notes')
        .select('date, content')
        .ilike('content', `%${query}%`)
        .order('date', { ascending: false });

      const marketNotes: MarketNoteResult[] = (dailyNotesData || []).map(note => ({
        date: note.date,
        content: note.content || '',
        matchedText: note.content || ''
      }));

      // Search in stock_explanations
      const { data: explanationsData } = await supabase
        .from('stock_explanations')
        .select('symbol, date, explanation')
        .ilike('explanation', `%${query}%`)
        .order('date', { ascending: false });

      // Search in stock_notes (search both symbol and note content)
      const { data: notesDataDb } = await supabase
        .from('stock_notes')
        .select('symbol, date, note')
        .or(`symbol.ilike.%${query}%,note.ilike.%${query}%`)
        .order('date', { ascending: false });

      const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, '');
      let notesData = notesDataDb || [];

      // Fallback: if DB search returns nothing, fetch a reasonable batch and filter locally
      if (!notesData.length) {
        const { data: fallbackNotes } = await supabase
          .from('stock_notes')
          .select('symbol, date, note')
          .order('date', { ascending: false })
          .limit(1000);
        notesData = (fallbackNotes || []).filter(n => normalize(n.note).includes(normalize(query)));
      }

      // Get company names for the symbols
      const allSymbols = [
        ...(explanationsData || []).map(e => e.symbol),
        ...(notesData || []).map(n => n.symbol)
      ];
      const uniqueSymbols = [...new Set(allSymbols)];

      let companyNameMap: Record<string, string | null> = {};
      if (uniqueSymbols.length) {
        const { data: priceData } = await supabase
          .from('stock_price_cache')
          .select('symbol, company_name')
          .in('symbol', uniqueSymbols);

        companyNameMap = (priceData || []).reduce((acc, item) => {
          acc[item.symbol] = item.company_name;
          return acc;
        }, {} as Record<string, string | null>);
      }

      const stockResults: StockResult[] = [
        ...(notesData || []).map(note => ({
          symbol: note.symbol,
          date: note.date,
          type: 'note' as const,
          content: note.note,
          matchedText: note.note,
          companyName: companyNameMap[note.symbol] || undefined
        })),
        ...(explanationsData || []).map(exp => ({
          symbol: exp.symbol,
          date: exp.date,
          type: 'explanation' as const,
          content: exp.explanation,
          matchedText: exp.explanation,
          companyName: companyNameMap[exp.symbol] || undefined
        }))
      ];

      setSearchResults({
        marketNotes,
        stockResults,
        query
      });

      toast({
        title: t("Search Complete"),
        description: t("Found {marketNotes} market notes, {stockNotes} notes, {explanations} AI explanations", {
          marketNotes: marketNotes.length,
          stockNotes: stockResults.filter(r => r.type === 'note').length,
          explanations: stockResults.filter(r => r.type === 'explanation').length,
        }),
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: t("Search Failed"),
        description: t("An error occurred while searching"),
        variant: "destructive"
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setIsSearching(false);
    setSearchResults(null);
  };

  // Group stocks by their groups and include stock data
  const groupedData: GroupData[] = groups.map(group => {
    const groupStocks = stocks.filter(s => s.group_id === group.id);
    const groupStockData = groupStocks
      .map(stock => stockData[stock.symbol])
      .filter(Boolean)
      .sort((a, b) => b.changePercent - a.changePercent); // Sort by performance desc

    return {
      group,
      stocks: groupStocks,
      stockData: groupStockData
    };
  });

  // Filter grouped data based on selected group filter
  const filteredGroupedData = selectedGroupFilter
    ? groupedData.filter(gd => gd.group.id === selectedGroupFilter)
    : groupedData;

  const getChangeColor = (changePercent: number) => {
    if (changePercent > 0) return 'text-green-600';
    if (changePercent < 0) return 'text-red-600';
    return 'text-muted-foreground';
  };

  // Get visual styling for stock row based on change percent
  const getStockRowStyle = (changePercent: number) => {
    const absChange = Math.abs(changePercent);
    const intensity = Math.min(absChange / 10, 1); // Cap at 10% for full intensity

    if (changePercent > 0) {
      // Green for gains
      const bgOpacity = intensity * 0.08; // Very subtle background
      const borderWidth = Math.max(2, intensity * 4); // 2-4px border
      return {
        backgroundColor: `rgba(34, 197, 94, ${bgOpacity})`,
        borderLeft: `${borderWidth}px solid rgb(34, 197, 94)`,
      };
    } else if (changePercent < 0) {
      // Red for losses
      const bgOpacity = intensity * 0.08;
      const borderWidth = Math.max(2, intensity * 4);
      return {
        backgroundColor: `rgba(239, 68, 68, ${bgOpacity})`,
        borderLeft: `${borderWidth}px solid rgb(239, 68, 68)`,
      };
    }
    return {
      backgroundColor: 'transparent',
      borderLeft: '2px solid transparent',
    };
  };

  // Map group names to ETF symbols
  const groupToEtfMap: Record<string, string> = {
    'Software': 'IGV',
    'Semi': 'SOXX',
    'MAG7': 'MAGS',
    'Power': 'ICLN',
    'Miner/neocloud': 'BTC',
  };

  // Calculate group statistics
  const getGroupStats = (stockData: StockData[]) => {
    const up = stockData.filter(s => s.changePercent > 0).length;
    const down = stockData.filter(s => s.changePercent < 0).length;
    const unchanged = stockData.filter(s => s.changePercent === 0).length;
    return { up, down, unchanged };
  };

  // Get ETF change for a group
  const getGroupEtfChange = (groupName: string, allStockData: Record<string, StockData>) => {
    const etfSymbol = groupToEtfMap[groupName];
    if (!etfSymbol) return null;

    const etfData = allStockData[etfSymbol];
    return etfData ? etfData.changePercent : null;
  };

  // Calculate group performance (using index symbol or average)
  const getGroupPerformance = (group: StockGroup, groupStockData: StockData[], allStockData: Record<string, StockData>) => {
    // If index_symbol is specified, use that
    if (group.index_symbol) {
      const indexData = allStockData[group.index_symbol];
      if (indexData) {
        return {
          changePercent: indexData.changePercent,
          displaySymbol: group.index_symbol,
          isIndex: true
        };
      }
    }

    // Otherwise calculate average of all stocks in group
    if (groupStockData.length === 0) {
      return { changePercent: 0, displaySymbol: 'AVG', isIndex: false };
    }

    const avgChange = groupStockData.reduce((sum, stock) => sum + stock.changePercent, 0) / groupStockData.length;
    return {
      changePercent: avgChange,
      displaySymbol: 'AVG',
      isIndex: false
    };
  };

  const handleMarketChange = (market: 'public' | 'private') => {
    if (market === 'private') {
      navigate('/private');
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Page Header with biomedical brand and Market Switcher */}
      <PageHeader />

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        isAdmin={isAdmin}
        onTabChange={setActiveTab}
      />

      {/* Feedback Button - Only for non-admin users */}
      {!isAdmin && (
        <div className="fixed top-4 right-16 z-[60]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedbackDialog(true)}
            className="h-10 px-3 gap-2 rounded-full hover:bg-accent"
            title={t("Send Feedback")}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="text-xs">{t("Feedback")}</span>
          </Button>
        </div>
      )}

      {/* User Menu */}
      <div className="fixed top-[18px] right-4 z-[60]">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-accent">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userEmail ? userEmail[0].toUpperCase() : <User className="h-5 w-5" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[60]" sideOffset={8}>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium">{userEmail || t('User')}</p>
              {isAdmin && (
                <p className="text-xs text-muted-foreground bg-primary/10 px-2 py-0.5 rounded w-fit">
                  {t('Admin')}
                </p>
              )}
            </div>
            <DropdownMenuSeparator />
            {isAdmin && (
              <DropdownMenuItem onClick={() => setActiveTab('admin')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>{t('User Management')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setChangePasswordDialog(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              <span>{t('Change Password')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t('Settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('Logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Render different pages based on active tab */}
      {activeTab === 'admin' ? (
        <UserManagement />
      ) : activeTab === 'chat' ? (
        <StockChat stocks={stocks} groups={groups} />
      ) : activeTab === 'weekly' ? (
        <PageLayout
          maxWidth="full"
          paddingTop="pt-16 sm:pt-24"
          paddingBottom="pb-0"
          paddingX="px-4 md:px-6 lg:px-8"
          header={<PageSectionHeader title={t("Weekly")} subtitle={t("Recap to reiterate")} />}
        >
          <WeeklyStats stocks={stocks} groups={groups} />
        </PageLayout>
      ) : activeTab === 'ai' ? (
        <PageLayout
          maxWidth="full"
          paddingTop="pt-16 sm:pt-24"
          paddingBottom="pb-0"
          paddingX="px-4 md:px-6 lg:px-8"
          header={<PageSectionHeader title={t("Cortex")} subtitle={t("Feed the edge")} />}
        >
          <AIChatEnhanced />
        </PageLayout>
      ) : (
        <PageLayout
          maxWidth="full"
          paddingTop="pt-16 sm:pt-24"
          paddingBottom="pb-0"
          paddingX="px-4 md:px-6 lg:px-8"
          header={(
            <PageSectionHeader
              title={t("Daily")}
              subtitle={t("Sync with the volatility · {date}", { date: format(selectedDate, "MMMM d, yyyy") })}
              actions={(
                <>
                  {!initialLoading && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowSyncConfirm(true)}
                      disabled={syncingToNotion}
                      className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground border-border gap-1.5"
                    >
                      <NotionIcon size={14} />
                      {syncingToNotion ? t('Syncing...') : t('Sync to Notion')}
                    </Button>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full sm:w-[200px] justify-start text-left font-normal text-xs hover:shadow-sm transition-all duration-200 ease-out",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {selectedDate ? format(selectedDate, "MMM dd, yyyy") : <span>{t('Pick a date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Button
                    onClick={() => fetchStockData(true)}
                    disabled={loading}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-xs hover:shadow-sm transition-all duration-200 ease-out flex-shrink-0"
                  >
                    {loading ? t('Loading...') : t('Refresh')}
                  </Button>

                  {isAdmin && (
                    <Button
                      onClick={() => setIsEditMode(!isEditMode)}
                      size="sm"
                      variant="outline"
                      className={cn(
                        "text-xs flex-shrink-0 transition-all duration-200 ease-out",
                        isEditMode
                          ? "bg-muted hover:bg-muted/80"
                          : "bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 hover:shadow-sm"
                      )}
                    >
                      <Edit2 className="h-3 w-3 sm:mr-1" />
                      <span className="hidden sm:inline">{isEditMode ? t('Exit Edit') : t('Edit')}</span>
                    </Button>
                  )}
                </>
              )}
            />
          )}
        >

          <div className="flex flex-col gap-4">
            {/* Search Bar */}
            {!initialLoading && (
              <>
                <SearchBar
                  onSearch={handleSearch}
                  onClear={handleClearSearch}
                  isSearching={isSearching}
                />

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
              </>
            )}

            {/* Sync Confirmation Dialog */}
            <ConfirmDialog
              open={showSyncConfirm}
              onOpenChange={setShowSyncConfirm}
              onConfirm={handleSyncToNotion}
              title={t("Confirm Sync to Notion")}
              description={t("Confirm to sync {date} market notes and stock notes to Notion?", { date: format(selectedDate, 'yyyy-MM-dd') })}
              confirmText={t("Confirm sync")}
              cancelText={t("Cancel")}
            />

            {/* Search Loading */}
            {isSearching && searchLoading && (
              <Card className="animate-fade-in">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center gap-4">
                    <div className="text-2xl animate-bounce">🔍</div>
                    <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground">{t('Searching...')}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Results */}
            {isSearching && !searchLoading && searchResults && (
              <SearchResults
                marketNotes={searchResults.marketNotes}
                stockResults={searchResults.stockResults}
                searchQuery={searchResults.query}
              />
            )}

            {/* Main Content - Hidden when searching */}
            {!isSearching && (
              <>
                {/* Daily Notes Section */}
                {!initialLoading && (
                  <DailyNotesEditor selectedDate={selectedDate} isEditMode={isEditMode} />
                )}

                {/* Group Performance Chart */}
                {!initialLoading && !loading && groups.length > 0 && (
                  <Card className="shadow-sm border-border">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">{t('Sector Performance')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                          data={(() => {
                            // First, get all group data
                            const chartData = groups.map(group => {
                              const groupStocks = stocks.filter(s => s.group_id === group.id);
                              const groupStockData = groupStocks
                                .map(stock => stockData[stock.symbol])
                                .filter(Boolean);
                              const performance = getGroupPerformance(group, groupStockData, stockData);
                              return {
                                name: group.name,
                                value: performance.changePercent,
                                displaySymbol: performance.displaySymbol,
                                fill: performance.changePercent >= 0 ? '#22c55e' : '#ef4444'
                              };
                            });



                            // Sort by changePercent descending (highest to lowest)
                            return chartData.sort((a, b) => b.value - a.value);
                          })()}
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
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className="bg-card border border-border rounded-lg shadow-lg p-3">
                                    <p className="font-medium text-sm">{data.name}</p>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Index: {data.displaySymbol}
                                    </p>
                                    <p className={cn(
                                      "font-semibold",
                                      data.value >= 0 ? "text-green-600" : "text-red-600"
                                    )}>
                                      {data.value >= 0 ? '+' : ''}{data.value.toFixed(2)}%
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="3 3" />
                          <Bar
                            dataKey="value"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={60}
                            label={{
                              content: (props: any) => {
                                const { x, y, width, value, index } = props;
                                if (value === undefined || value === null) return null;
                                const displayValue = `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
                                const yPosition = value >= 0 ? y - 8 : y + 18;
                                return (
                                  <text
                                    x={x + width / 2}
                                    y={yPosition}
                                    fill={value >= 0 ? '#22c55e' : '#ef4444'}
                                    textAnchor="middle"
                                    fontSize={11}
                                    fontWeight={600}
                                  >
                                    {displayValue}
                                  </text>
                                );
                              }
                            }}
                          >
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Group Filter Tabs */}
                {!initialLoading && (
                  <div className="my-6">
                    <Tabs
                      value={selectedGroupFilter || "all"}
                      onValueChange={(value) => setSelectedGroupFilter(value === "all" ? null : value)}
                      className="w-full"
                    >
                      <TabsList className="w-full justify-start h-auto flex-wrap gap-2 bg-background/40 backdrop-blur-lg border border-border/50 shadow-lg p-2">
                        <TabsTrigger
                          value="all"
                          className="data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md backdrop-blur-sm transition-all"
                        >
                          {t('All')}
                        </TabsTrigger>
                        {groups.map(group => (
                          <TabsTrigger
                            key={group.id}
                            value={group.id}
                            className="data-[state=active]:bg-primary/90 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md backdrop-blur-sm transition-all"
                          >
                            {group.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                )}

                {/* Add New Group Button */}
                {isEditMode && (
                  <div className="flex items-center gap-2 mb-2">
                    {!addingNewGroup ? (
                      <Button
                        onClick={() => setAddingNewGroup(true)}
                        size="sm"
                        variant="outline"
                        className="text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {t('Add Group')}
                      </Button>
                    ) : (
                      <div className="flex gap-2 items-center flex-wrap">
                        <Input
                          placeholder={t('Group name')}
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                          className="w-32 h-7 text-xs"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addGroup();
                            if (e.key === 'Escape') {
                              setAddingNewGroup(false);
                              setNewGroupName('');
                              setNewGroupIndexSymbol('');
                            }
                          }}
                        />
                        <Input
                          placeholder={t('Index symbol (optional)')}
                          value={newGroupIndexSymbol}
                          onChange={(e) => setNewGroupIndexSymbol(e.target.value.toUpperCase())}
                          className="w-40 h-7 text-xs"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') addGroup();
                            if (e.key === 'Escape') {
                              setAddingNewGroup(false);
                              setNewGroupName('');
                              setNewGroupIndexSymbol('');
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={addGroup}
                          disabled={!newGroupName.trim()}
                          className="h-7 px-2 text-xs"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAddingNewGroup(false);
                            setNewGroupName('');
                            setNewGroupIndexSymbol('');
                          }}
                          className="h-7 px-2"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Show skeleton loading during initial load */}
                {initialLoading ? (
                  <div className="animate-fade-in">
                    {[...Array(3)].map((_, i) => (
                      <GroupSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  // Regular content
                  filteredGroupedData.map(({ group, stocks: groupStocks, stockData: groupStockData }) => {
                    const stats = getGroupStats(groupStockData);
                    const groupPerformance = getGroupPerformance(group, groupStockData, stockData);
                    return (
                      <Card key={group.id} className="shadow-sm border-border hover:shadow-md transition-all duration-300 ease-out">
                        <CardHeader className="pb-2 px-3 sm:px-6">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="flex items-center gap-3">
                              {editingGroup === group.id && isEditMode ? (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={groupNameBuffer[group.id] || group.name}
                                    onChange={(e) => setGroupNameBuffer(prev => ({ ...prev, [group.id]: e.target.value }))}
                                    className="w-32 h-6 text-sm font-medium"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') renameGroup(group.id);
                                      if (e.key === 'Escape') {
                                        setEditingGroup(null);
                                        setGroupNameBuffer(prev => ({ ...prev, [group.id]: '' }));
                                      }
                                    }}
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => renameGroup(group.id)}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingGroup(null);
                                      setGroupNameBuffer(prev => ({ ...prev, [group.id]: '' }));
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <CardTitle
                                    className={`text-sm font-medium text-foreground ${isEditMode ? 'cursor-pointer hover:text-primary' : 'cursor-default'} transition-colors`}
                                    onClick={() => {
                                      if (isEditMode) {
                                        setEditingGroup(group.id);
                                        setGroupNameBuffer(prev => ({ ...prev, [group.id]: group.name }));
                                      }
                                    }}
                                    title={isEditMode ? t("Click to rename") : ""}
                                  >
                                    {group.name}
                                  </CardTitle>
                                  {isEditMode && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingGroup(group.id);
                                        setGroupNameBuffer(prev => ({ ...prev, [group.id]: group.name }));
                                      }}
                                      className="h-5 w-5 p-0 opacity-50 hover:opacity-100"
                                      title={t("Rename group")}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </>
                              )}
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                                  {t('{count} stocks', { count: groupStockData.length })}
                                </span>
                                {stats.up > 0 && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <TrendingUp className="h-3 w-3" />
                                    {stats.up}
                                  </span>
                                )}
                                {stats.down > 0 && (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <TrendingDown className="h-3 w-3" />
                                    {stats.down}
                                  </span>
                                )}
                                <span className={cn(
                                  "px-2 py-0.5 rounded font-medium",
                                  groupPerformance.changePercent > 0 ? "text-green-600 bg-green-50 dark:bg-green-950/30" :
                                    groupPerformance.changePercent < 0 ? "text-red-600 bg-red-50 dark:bg-red-950/30" : "text-muted-foreground bg-muted"
                                )}>
                                  {groupPerformance.displaySymbol}: {groupPerformance.changePercent > 0 ? '+' : ''}{groupPerformance.changePercent.toFixed(2)}%
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {isEditMode && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingGroupIndex(group.id);
                                      setGroupIndexBuffer(prev => ({ ...prev, [group.id]: group.index_symbol || '' }));
                                    }}
                                    className="h-7 w-7 p-0 hover:bg-accent"
                                    title={t("Edit index symbol")}
                                  >
                                    <Settings className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setAddingToGroup(addingToGroup === group.id ? null : group.id)}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    {t('Add')}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteGroup(group.id)}
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title={t("Delete group")}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>

                          {editingGroupIndex === group.id && isEditMode && (
                            <div className="flex gap-2 mt-2 items-center">
                              <span className="text-xs text-muted-foreground">{t('Index Symbol')}:</span>
                              <Input
                                placeholder={t('e.g., SOXX, IGV')}
                                value={groupIndexBuffer[group.id] || ''}
                                onChange={(e) => setGroupIndexBuffer(prev => ({ ...prev, [group.id]: e.target.value.toUpperCase() }))}
                                className="w-32 h-7 text-xs"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') updateGroupIndexSymbol(group.id);
                                  if (e.key === 'Escape') {
                                    setEditingGroupIndex(null);
                                    setGroupIndexBuffer(prev => ({ ...prev, [group.id]: '' }));
                                  }
                                }}
                              />
                              <Button
                                size="sm"
                                onClick={() => updateGroupIndexSymbol(group.id)}
                                className="h-7 px-2 text-xs"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingGroupIndex(null);
                                  setGroupIndexBuffer(prev => ({ ...prev, [group.id]: '' }));
                                }}
                                className="h-7 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground italic">{t('Leave empty for average')}</span>
                            </div>
                          )}

                          {addingToGroup === group.id && isEditMode && (
                            <div className="flex gap-2 mt-2">
                              <Input
                                placeholder={t('Stock symbol')}
                                value={newSymbol}
                                onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                                className="w-24 h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                onClick={() => addStock(group.id, newSymbol)}
                                disabled={!newSymbol}
                                className="h-7 px-2 text-xs"
                              >
                                <Save className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setAddingToGroup(null);
                                  setNewSymbol('');
                                }}
                                className="h-7 px-2"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </CardHeader>

                        <CardContent className="pt-0 px-2 sm:px-6">
                          <div className="grid gap-1.5 text-xs">
                            {groupStockData.map((stock) => {
                              const stockRecord = groupStocks.find(s => s.symbol === stock.symbol);
                              const editKey = `${group.id}-${stock.symbol}`; // Unique key for editing even if symbol appears in multiple groups
                              const noteValue = noteBuffer[stock.symbol] ?? stock.customNote ?? stock.savedNote ?? '';
                              const autoSaveLabel = noteAutoSaveStatus === 'saving'
                                ? t("Saving...")
                                : noteAutoSaveStatus === 'saved'
                                  ? t("Saved")
                                  : t("Auto Save");
                              const hasNote = Boolean(noteValue);
                              const autoSaveClassName = cn(
                                "text-[9px] px-2 py-0.5 rounded-full border",
                                noteAutoSaveStatus === 'saving'
                                  ? "text-amber-600 border-amber-200 bg-amber-50"
                                  : noteAutoSaveStatus === 'saved'
                                    ? "text-emerald-600 border-emerald-200 bg-emerald-50"
                                    : "text-muted-foreground border-border/60 bg-muted/40"
                              );
                              const isEditingNote = editingStock === editKey && isEditMode;
                              const isViewingNote = expandedNoteKey === editKey && !isEditingNote;
                              const readOnlyClassName = "text-[9px] px-2 py-0.5 rounded-full border text-muted-foreground border-border/60 bg-muted/40";
                              return (
                                <div
                                  key={editKey}
                                  data-note-key={editKey}
                                  className={cn("flex flex-col", isEditingNote ? "gap-0" : "gap-2")}
                                >
                                  <div
                                    className={cn(
                                      "flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 px-2 bg-card border border-border hover:bg-accent/50 transition-all duration-200 ease-out gap-2 cursor-pointer",
                                      isEditingNote
                                        ? "rounded-t-md rounded-b-none border-b-0 shadow-none hover:shadow-none"
                                        : "rounded-md hover:shadow-sm"
                                    )}
                                    style={getStockRowStyle(stock.changePercent)}
                                    onClick={() => setSelectedStockDetail({
                                      symbol: stock.symbol,
                                      companyName: stock.companyName,
                                      currentPrice: stock.currentPrice,
                                      changePercent: stock.changePercent,
                                      benchmarkSymbol: group.index_symbol || undefined
                                    })}
                                  >
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-medium w-12 sm:w-14 text-foreground text-xs sm:text-sm">{stock.symbol}</span>
                                      {stock.companyName && (
                                        <span className="text-[9px] sm:text-[10px] text-muted-foreground/70 w-24 sm:w-32 truncate" title={stock.companyName}>
                                          {stock.companyName}
                                        </span>
                                      )}
                                      <span className="text-muted-foreground w-14 sm:w-16 text-xs">${stock.currentPrice.toFixed(2)}</span>
                                      <span className={cn("font-medium w-12 sm:w-14 text-xs", getChangeColor(stock.changePercent))}>
                                        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                      </span>

                                      {stock.explanation && (
                                        <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 w-full sm:w-auto">
                                          <div className="text-[9px] sm:text-[10px] text-primary/70 italic break-words line-clamp-1 flex items-start gap-1">
                                            <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                            <span>{expandedExplanations.has(stock.symbol)
                                              ? stock.explanation
                                              : `${stock.explanation.substring(0, 35)}${stock.explanation.length > 35 ? '...' : ''}`
                                            }</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {stock.explanation.length > 35 && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  toggleExplanation(stock.symbol);
                                                }}
                                                className="h-4 w-4 p-0 text-primary hover:text-primary"
                                              >
                                                {expandedExplanations.has(stock.symbol) ? (
                                                  <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                  <ChevronDown className="h-3 w-3" />
                                                )}
                                              </Button>
                                            )}
                                            {isEditMode && (
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setConfirmDialog({
                                                    open: true,
                                                    title: t("Delete AI Explanation"),
                                                    description: t("Are you sure you want to delete the AI explanation for {symbol}? This action cannot be undone.", { symbol: stock.symbol }),
                                                    onConfirm: async () => {
                                                      try {
                                                        // Delete from database
                                                        const { error } = await supabase
                                                          .from('stock_explanations')
                                                          .delete()
                                                          .eq('symbol', stock.symbol)
                                                          .eq('date', format(selectedDate, 'yyyy-MM-dd'));

                                                        if (error) {
                                                          console.error('Error deleting explanation:', error);
                                                          toast({
                                                            title: t("Error"),
                                                            description: t("Failed to delete explanation"),
                                                            variant: "destructive",
                                                          });
                                                          return;
                                                        }

                                                        // Update local state
                                                        setStockData(prev => ({
                                                          ...prev,
                                                          [stock.symbol]: {
                                                            ...prev[stock.symbol],
                                                            explanation: undefined
                                                          }
                                                        }));

                                                        toast({
                                                          title: t("Success"),
                                                          description: t("AI explanation deleted"),
                                                        });
                                                      } catch (error) {
                                                        console.error('Error deleting explanation:', error);
                                                        toast({
                                                          title: t("Error"),
                                                          description: t("Failed to delete explanation"),
                                                          variant: "destructive",
                                                        });
                                                      }
                                                    }
                                                  });
                                                }}
                                                className="h-4 w-4 p-0 text-red-500 hover:text-red-600"
                                                title={t("Delete AI Explanation")}
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          explainStockMovement(stock.symbol, stock.changePercent);
                                        }}
                                        disabled={explainLoading === stock.symbol}
                                        className="h-6 w-6 p-0"
                                        title={t("Explain {symbol} movement for {date}", {
                                          symbol: stock.symbol,
                                          date: format(selectedDate, 'MMM dd, yyyy')
                                        })}
                                      >
                                        {explainLoading === stock.symbol ? (
                                          <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                                        ) : (
                                          <Brain className="h-3 w-3" />
                                        )}
                                      </Button>

                                      {!isEditingNote && hasNote && (
                                        <span
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (editingStock && editingStock !== editKey) {
                                              setEditingStock(null);
                                            }
                                            setExpandedNoteKey(prev => (prev === editKey ? null : editKey));
                                          }}
                                          className={cn(
                                            "text-xs text-foreground italic max-w-80 truncate cursor-pointer bg-accent/30 px-2 py-0.5 rounded",
                                            isViewingNote && "bg-accent/50"
                                          )}
                                          title={noteValue}
                                        >
                                          <FileText className="w-3 h-3 inline mr-1" />{noteValue}
                                        </span>
                                      )}
                                      {isEditMode && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setNoteBuffer(prev => ({ ...prev, [stock.symbol]: noteValue }));
                                            setNoteAutoSaveStatus('idle');
                                            setEditingStock(editKey);
                                          }}
                                          className="h-6 w-6 p-0"
                                          title={t("{action} note for {date}", {
                                            action: stock.customNote || stock.savedNote ? t("Edit") : t("Add"),
                                            date: format(selectedDate, 'MMM dd, yyyy')
                                          })}
                                        >
                                          <Edit2 className="h-3 w-3" />
                                        </Button>
                                      )}

                                      {isEditMode && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            stockRecord && removeStock(stockRecord.id);
                                          }}
                                          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    aria-hidden={!isEditingNote && !isViewingNote}
                                    className={cn(
                                      "overflow-hidden transition-[max-height,opacity,transform] duration-100 ease-out",
                                      isEditingNote || isViewingNote
                                        ? "max-h-[240px] opacity-100 translate-y-0"
                                        : "max-h-0 opacity-0 -translate-y-1"
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        "rounded-b-md border border-border border-t-0 bg-muted/20 px-3 py-2",
                                        isEditingNote || isViewingNote ? "pointer-events-auto" : "pointer-events-none"
                                      )}
                                    >
                                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                        <div>
                                          <p className="text-[10px] font-medium text-foreground">{t("Note · {symbol}", { symbol: stock.symbol })}</p>
                                          <p className="text-[9px] text-muted-foreground">
                                            {format(selectedDate, 'MMM dd, yyyy')}
                                          </p>
                                        </div>
                                        <span className={isEditingNote ? autoSaveClassName : readOnlyClassName}>
                                          {isEditingNote ? autoSaveLabel : t("Read only")}
                                        </span>
                                      </div>
                                      {isEditingNote ? (
                                        <>
                                          <Textarea
                                            value={noteValue}
                                            onChange={(e) => updateCustomNote(stock.symbol, e.target.value)}
                                            onCompositionStart={() => setIsComposing(prev => ({ ...prev, [stock.symbol]: true }))}
                                            onCompositionEnd={() => setIsComposing(prev => ({ ...prev, [stock.symbol]: false }))}
                                            onBlur={(e) => {
                                              if (!isComposing[stock.symbol]) {
                                                if (noteSaveDebounceRef.current) {
                                                  clearTimeout(noteSaveDebounceRef.current);
                                                }
                                                saveCustomNote(stock.symbol, e.currentTarget.value, { setStatus: true });
                                              }
                                            }}
                                            placeholder={t("Add note for {date}", { date: format(selectedDate, 'MMM dd, yyyy') })}
                                            className="mt-2 min-h-[80px] text-xs resize-none"
                                            onKeyDown={(e) => {
                                              if (e.key === 'Escape') {
                                                if (noteSaveDebounceRef.current) {
                                                  clearTimeout(noteSaveDebounceRef.current);
                                                }
                                                const savedNote = stock.savedNote || '';
                                                setStockData(prev => ({
                                                  ...prev,
                                                  [stock.symbol]: {
                                                    ...prev[stock.symbol],
                                                    customNote: savedNote
                                                  }
                                                }));
                                                setNoteBuffer(prev => ({ ...prev, [stock.symbol]: savedNote }));
                                                setNoteAutoSaveStatus('idle');
                                                setEditingStock(null);
                                              }
                                            }}
                                            autoFocus={isEditingNote}
                                          />
                                          <p className="mt-1 text-[9px] text-muted-foreground">{t("Auto save · Esc to cancel")}</p>
                                        </>
                                      ) : (
                                        <div className="mt-2 text-xs whitespace-pre-wrap text-foreground/80">
                                          {noteValue}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}

                            {groupStockData.length === 0 && !loading && (
                              <div className="text-center py-3 text-muted-foreground text-xs">
                                {t("No data available for this group")}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </>
            )}
          </div>
        </PageLayout>
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        onConfirm={() => {
          confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={t("Delete")}
        cancelText={t("Cancel")}
      />

      {/* Change Password Dialog */}
      <Dialog modal={false} open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("Change Password")}</DialogTitle>
            <DialogDescription>
              {t("Enter your new password below. Make sure it's at least 6 characters long.")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="new-password" className="text-sm font-medium">
                {t("New Password")}
              </label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("Enter new password")}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="confirm-password" className="text-sm font-medium">
                {t("Confirm New Password")}
              </label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                placeholder={t("Confirm new password")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setChangePasswordDialog(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? t("Changing...") : t("Change Password")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <FeedbackDialog open={feedbackDialog} onOpenChange={setFeedbackDialog} />

      {/* Stock Detail Dialog */}
      <StockDetailDialog
        open={!!selectedStockDetail}
        onOpenChange={(open) => !open && setSelectedStockDetail(null)}
        symbol={selectedStockDetail?.symbol || ''}
        companyName={selectedStockDetail?.companyName}
        currentPrice={selectedStockDetail?.currentPrice}
        changePercent={selectedStockDetail?.changePercent}
        benchmarkSymbol={selectedStockDetail?.benchmarkSymbol}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default StockAnalysis;
