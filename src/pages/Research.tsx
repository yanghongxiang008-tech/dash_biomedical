import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  RotateCw,
  Zap,
  Lightbulb,
  Headphones,
  FileBarChart2,
  LayoutGrid,
  CheckCheck,
  Search,
  X,
  ExternalLink,
  FileText as ArticleIcon,
  Trash2,
  Loader2,
  Sparkles,
  ArrowLeft,
  FileText as SummaryIcon,
  ChevronDown,
  ChevronRight,
  Star,
  Square,
  User,
  LogOut,
  KeyRound,
  Settings as SettingsIcon,
  MessageCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useToast } from "@/hooks/use-toast";

import PageHeader from '@/components/PageHeader';
import Navigation from '@/components/Navigation';
import PageSectionHeader from '@/components/PageSectionHeader';
import PageSkeleton from '@/components/PageSkeleton';
import PageLayout from '@/components/PageLayout';
import { useResearch, ResearchSource } from '@/hooks/useResearch';
import { SourceCard, SourceLogo } from '@/components/research/SourceCard';
import { AddSourceDialog } from '@/components/research/AddSourceDialog';
import { SourceDetailDialog } from '@/components/research/SourceDetailDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonGrid } from '@/components/ui/skeleton-list';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

// Custom X (formerly Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const SUMMARY_PHASES = [
  { key: 'preparing', labelKey: 'Preparing', processKey: 'Collect unread items + sources' },
  { key: 'streaming', labelKey: 'Generating', processKey: 'Stream summary output' },
  { key: 'saving', labelKey: 'Saving', processKey: 'Write summary history' },
];

const SummaryThinkingIndicator = ({ stage }: { stage: 'preparing' | 'streaming' | 'saving' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  const phase = SUMMARY_PHASES.find((item) => item.key === stage) || SUMMARY_PHASES[0];

  return (
    <div className="space-y-3 mt-1">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
          <span className="text-[13px] font-medium bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-[length:200%_100%] bg-clip-text text-transparent animate-text-shimmer">
            {t(phase.labelKey)}...
          </span>
          <span className="text-[11px] font-medium text-muted-foreground">({t(phase.processKey)})</span>
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 rounded-xl bg-muted/30 px-3 py-2">
            <p className="text-[11px] text-muted-foreground mb-2">{t('Process')}</p>
            <ol className="space-y-2 border-l border-muted-foreground/20 pl-3">
              {SUMMARY_PHASES.map((step) => (
                <li key={step.key} className="relative">
                  <span
                    className={cn(
                      "absolute -left-[7px] top-1 h-2 w-2 rounded-full",
                      step.key === stage
                        ? "bg-primary shadow-glow"
                        : "bg-muted-foreground/30"
                    )}
                  />
                  <div className={cn(
                    "text-[12px] font-medium",
                    step.key === stage ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {t(step.labelKey)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{t(step.processKey)}</div>
                </li>
              ))}
            </ol>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

// Priority filter config with semantic design tokens (P1-P5 only)
const priorityConfig: Record<number | 'all', { label: string; bgColor: string; activeColor: string }> = {
  'all': { label: 'All', bgColor: 'bg-muted hover:bg-muted/80', activeColor: 'bg-primary text-primary-foreground' },
  5: { label: 'P5', bgColor: 'bg-destructive/10 hover:bg-destructive/20 text-destructive', activeColor: 'bg-destructive text-destructive-foreground' },
  4: { label: 'P4', bgColor: 'bg-warning/10 hover:bg-warning/20 text-warning', activeColor: 'bg-warning text-warning-foreground' },
  3: { label: 'P3', bgColor: 'bg-warning/10 hover:bg-warning/20 text-warning', activeColor: 'bg-warning text-warning-foreground' },
  2: { label: 'P2', bgColor: 'bg-info/10 hover:bg-info/20 text-info', activeColor: 'bg-info text-info-foreground' },
  1: { label: 'P1', bgColor: 'bg-muted hover:bg-muted/80 text-muted-foreground', activeColor: 'bg-muted-foreground text-background' },
};

const Research = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<number | 'all'>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [isSummaryView, setIsSummaryView] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<any | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryTargetItemId, setSummaryTargetItemId] = useState<string | null>(null);
  const [markReadAfterSummary, setMarkReadAfterSummary] = useState(false);
  const summaryAbortRef = useRef<AbortController | null>(null);
  const [summaryStage, setSummaryStage] = useState<'idle' | 'preparing' | 'streaming' | 'saving'>('idle');
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [checkingRole, setCheckingRole] = useState(true);
  const [changePasswordDialog, setChangePasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({ open: false, title: '', description: '', onConfirm: () => { } });
  const categoryConfig = useMemo<Record<string, { label: string; icon: React.ReactNode; bg?: string; color?: string }>>(
    () => ({
      all: { label: t('All'), icon: <LayoutGrid className="h-4 w-4" /> },
      news: { label: t('News'), icon: <Zap className="h-4 w-4" />, bg: 'bg-info/10', color: 'text-info' },
      research: { label: t('Research'), icon: <Lightbulb className="h-4 w-4" />, bg: 'bg-warning/10', color: 'text-warning' },
      podcast: { label: t('Podcast'), icon: <Headphones className="h-4 w-4" />, bg: 'bg-primary/10', color: 'text-primary' },
      report: { label: t('Report'), icon: <FileBarChart2 className="h-4 w-4" />, bg: 'bg-success/10', color: 'text-success' },
      twitter: { label: 'X', icon: <XIcon className="h-4 w-4" />, bg: 'bg-muted/50', color: 'text-foreground' }
    }),
    [t]
  );

  const {
    sources,
    items,
    allItems,
    loading: sourcesLoading,
    syncingSourceIds,
    syncProgress,
    fetchItemsForSource,
    addSource,
    updateSource,
    deleteSource,
    addManualItem,
    markItemAsRead,
    markAllAsRead,
    markAllSourcesAsRead,
    clearSourceItems,
    clearAllSourcesItems,
    syncSource,
    syncAllSources,
    stopSyncAll,
    generateSummary,
    summaryHistory,
    fetchSummaryHistory,
    toggleSummaryFavorite,
    deleteSummaryHistory
  } = useResearch();

  // Check auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Check admin role and user email
  useEffect(() => {
    const checkUserRole = async () => {
      setCheckingRole(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
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
        description: t("Passwords do not match"),
        variant: "destructive"
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({
        title: t("Success"),
        description: t("Password updated successfully"),
      });
      setChangePasswordDialog(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: any) {
      toast({
        title: t("Error"),
        description: error.message || t("Failed to update password"),
        variant: "destructive"
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleTabChange = (tab: 'ai' | 'home' | 'weekly' | 'chat' | 'admin') => {
    navigate('/', { state: { activeTab: tab } });
  };

  const handleDeleteSource = (sourceId: string, sourceName: string) => {
    setConfirmDialog({
      open: true,
      title: t('Delete Source'),
      description: t('Are you sure you want to delete "{name}"? All saved articles will be removed.', { name: sourceName }),
      onConfirm: () => {
        deleteSource(sourceId);
        setConfirmDialog(prev => ({ ...prev, open: false }));
      }
    });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  // Create source map for item results (includes logo info)
  const sourceMap = useMemo(() => {
    const map: Record<string, ResearchSource> = {};
    sources.forEach(s => { map[s.id] = s; });
    return map;
  }, [sources]);

  // Collect all unique tags from sources
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    sources.forEach(s => {
      if (s.tags && s.tags.length > 0) {
        s.tags.forEach(t => tagSet.add(t));
      }
    });
    return Array.from(tagSet).sort();
  }, [sources]);

  // Filter sources by category, priority, tag, and search, then sort by priority (desc) then name (asc)
  const filteredSources = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return sources
      .filter(s => {
        const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
        const matchesPriority = selectedPriority === 'all' || (s.priority || 0) === selectedPriority;
        const matchesTag = selectedTag === 'all' || (s.tags && s.tags.includes(selectedTag));
        const matchesUnread = !showUnreadOnly || (s.unread_count || 0) > 0;
        // Search across all source properties
        const matchesSearch = query === '' ||
          s.name.toLowerCase().includes(query) ||
          (s.tags && s.tags.some(t => t.toLowerCase().includes(query))) ||
          (s.description && s.description.toLowerCase().includes(query)) ||
          s.url.toLowerCase().includes(query) ||
          (s.feed_url && s.feed_url.toLowerCase().includes(query)) ||
          s.category.toLowerCase().includes(query) ||
          s.source_type.toLowerCase().includes(query);
        return matchesCategory && matchesPriority && matchesTag && matchesUnread && matchesSearch;
      })
      .sort((a, b) => {
        // Sort by priority descending (higher priority first)
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        if (priorityB !== priorityA) {
          return priorityB - priorityA;
        }
        // Then sort by name A-Z
        return a.name.localeCompare(b.name);
      });
  }, [sources, searchQuery, selectedCategory, selectedPriority, selectedTag, showUnreadOnly]);

  // Filter items by search query (only when searching)
  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '' || query.length < 2) return [];

    return allItems
      .filter(item => {
        // Also filter by category if not 'all'
        if (selectedCategory !== 'all') {
          const source = sources.find(s => s.id === item.source_id);
          if (!source || source.category !== selectedCategory) return false;
        }

        return (
          item.title.toLowerCase().includes(query) ||
          (item.summary && item.summary.toLowerCase().includes(query)) ||
          (item.url && item.url.toLowerCase().includes(query))
        );
      })
      .slice(0, 20); // Limit to 20 items for performance
  }, [allItems, searchQuery, selectedCategory, sources]);

  const hasSearchResults = searchQuery.trim().length >= 2 && (filteredSources.length > 0 || filteredItems.length > 0);
  const isSearching = searchQuery.trim().length >= 2;

  const totalUnread = sources.reduce((sum, s) => sum + (s.unread_count || 0), 0);
  const unreadSourceCount = sources.filter(s => (s.unread_count || 0) > 0).length;
  const unreadSources = useMemo(
    () => sources.filter(s => (s.unread_count || 0) > 0),
    [sources]
  );
  const normalizeSourceName = (name: string) => {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    const withoutMeta = trimmed.split('|')[0]?.trim() || trimmed;
    const withoutPriority = withoutMeta.replace(/\s*-\s*P\d+\s*$/i, '').trim();
    const withoutQuotes = withoutPriority.replace(/^[“"']|[”"']$/g, '');
    const withoutPunctuation = withoutQuotes.replace(/[。.,，:：;；]+$/g, '').trim();
    return withoutPunctuation.toLowerCase();
  };

  const compactSourceKey = (name: string) => {
    return normalizeSourceName(name).replace(/[^\p{L}\p{N}]+/gu, '');
  };

  const sourceEntries = useMemo(() => {
    return sources.map(source => ({
      source,
      key: normalizeSourceName(source.name),
      compactKey: compactSourceKey(source.name),
    }));
  }, [sources]);

  const resolveSourceByName = (name: string) => {
    const key = normalizeSourceName(name);
    const compactKey = compactSourceKey(name);
    if (!key && !compactKey) return null;

    const exact = sourceEntries.find(entry => entry.key === key || entry.compactKey === compactKey);
    if (exact) return exact.source;

    if (compactKey.length < 4) return null;

    const fuzzyMatches = sourceEntries.filter(entry =>
      compactKey.includes(entry.compactKey) || entry.compactKey.includes(compactKey)
    );
    if (fuzzyMatches.length === 1) return fuzzyMatches[0].source;
    if (fuzzyMatches.length > 1) {
      const sorted = fuzzyMatches.sort((a, b) => b.compactKey.length - a.compactKey.length);
      if (sorted[0].compactKey.length > sorted[1].compactKey.length) {
        return sorted[0].source;
      }
    }

    return null;
  };

  useEffect(() => {
    if (isSummaryView) {
      fetchSummaryHistory();
    }
  }, [isSummaryView, fetchSummaryHistory]);

  const currentSource = sources.find(s => s.id === selectedSource) || null;

  const isSyncing = syncingSourceIds.size > 0;
  const currentSyncSource = useMemo(() => {
    if (!syncProgress?.currentSourceId) return null;
    return sources.find(source => source.id === syncProgress.currentSourceId) || null;
  }, [sources, syncProgress]);
  const syncingSources = useMemo(() => {
    if (syncingSourceIds.size === 0) return [];
    const idSet = syncingSourceIds;
    return sources.filter(source => idSet.has(source.id));
  }, [sources, syncingSourceIds]);

  const encodeSourceTagField = (value: string) => encodeURIComponent(value);
  const decodeSourceTagField = (value: string | undefined) => {
    if (!value) return '';
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };

  const preprocessSummaryText = (value: string | null) => {
    if (!value) return '';
    const pattern = /\[SOURCE\s*[:：]\s*([^\]|]+?)\s*(?:[|｜]\s*URL\s*[:：]\s*([^\]]+))?\]/gi;
    let next = value.replace(pattern, (_match, name, url) => {
      const encodedName = encodeSourceTagField(String(name ?? '').trim());
      const encodedUrl = encodeSourceTagField(String(url ?? '').trim());
      return `[[SOURCE_TAG name="${encodedName}" url="${encodedUrl}"]]`;
    });
    next = next.replace(/[ \t]*\r?\n[ \t]*(\[\[SOURCE_TAG)/g, ' $1');
    next = next.replace(/[ \t]+(\[\[SOURCE_TAG)/g, ' $1');
    next = next.replace(/(\bImplication)\s*[:：]\s*([^\n]*?)(?=(\[\[SOURCE_TAG)|$)/gi, (match, label, detail) => {
      const trimmedDetail = String(detail ?? '').trim();
      if (!trimmedDetail) return match;
      return `**${label}:** *${trimmedDetail}*`;
    });
    return next;
  };

  const stripSourceTagsFromNode = (node: React.ReactNode) => {
    const sources: Array<{ sourceName: string; url: string | null }> = [];
    const placeholderPattern = /\[\[SOURCE_TAG\s+name="([^"]*)"\s+url="([^"]*)"\s*\]\]/gi;
    const legacyPattern = /[\[(](?:SOURCE|Source)\s*[:：]\s*([^|\]\)]+)(?:\s*[|｜]\s*URL\s*[:：]\s*([^\]\)]+))?[\])]/gi;

    const stripFromString = (value: string) => {
      let next = value;
      next = next.replace(placeholderPattern, (_match, name, url) => {
        const decodedName = decodeSourceTagField(name).trim();
        const decodedUrl = decodeSourceTagField(url).trim();
        const normalizedUrl = normalizeSourceTagUrl(decodedUrl);
        if (decodedName) {
          sources.push({ sourceName: decodedName, url: normalizedUrl });
        }
        return '';
      });

      next = next.replace(legacyPattern, (_match, name, url) => {
        const rawUrl = String(url ?? '').trim();
        const normalizedUrl = normalizeSourceTagUrl(rawUrl);
        const cleanedName = String(name ?? '').trim();
        if (cleanedName) {
          sources.push({ sourceName: cleanedName, url: normalizedUrl });
        }
        return '';
      });

      return next.replace(/ {2,}/g, ' ').trimEnd();
    };

    const walk = (value: React.ReactNode): React.ReactNode => {
      if (typeof value === 'string') {
        return stripFromString(value);
      }
      if (Array.isArray(value)) {
        return value.map(child => walk(child));
      }
      if (React.isValidElement(value)) {
        const nextChildren = walk(value.props.children);
        return React.cloneElement(value, { ...value.props, children: nextChildren });
      }
      return value;
    };

    const cleanedNode = walk(node);
    return { sources, cleanedNode };
  };

  const formatImplicationInString = (value: string): React.ReactNode => {
    const match = value.match(/^(.*?)(\bImplication)\s*[:：]\s*(.*)$/i);
    if (!match) return value;
    const before = match[1];
    const after = match[3];
    if (!after) return value;
    return (
      <>
        {before}
        <strong>Implication:</strong>{' '}
        <em>{after}</em>
      </>
    );
  };

  const formatImplicationNode = (value: React.ReactNode): React.ReactNode => {
    if (typeof value === 'string') {
      return formatImplicationInString(value);
    }
    if (Array.isArray(value)) {
      return value.map(child => formatImplicationNode(child));
    }
    if (React.isValidElement(value)) {
      const nextChildren = formatImplicationNode(value.props.children);
      return React.cloneElement(value, { ...value.props, children: nextChildren });
    }
    return value;
  };

  const normalizeSourceTagUrl = (value: string | null | undefined) => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    if (lowered === 'none' || lowered === '(none)' || lowered === 'null') return null;
    return trimmed;
  };

  const normalizeUrl = (value: string) => {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`.replace(/\/$/, '');
    } catch {
      return value.replace(/\/$/, '');
    }
  };

  const formatSummaryDate = (
    value: string | null | undefined,
    options: Intl.DateTimeFormatOptions
  ) => {
    if (!value) return 'Unknown date';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Unknown date';
    return date.toLocaleDateString('en-US', options);
  };

  const selectedHistory = summaryHistory.find(h => h.id === selectedHistoryId) || null;
  const summaryItemCount = selectedHistory?.item_count ?? summaryMeta?.itemCount ?? totalUnread;
  const summarySourceCount = selectedHistory?.source_count ?? summaryMeta?.sourceCount ?? unreadSourceCount;
  const summaryHeaderTitle = selectedHistory
    ? formatSummaryDate(selectedHistory.created_at, { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Research Summary';

  const resolveSourceByUrl = (url?: string | null) => {
    if (!url) return null;
    const target = normalizeUrl(url);
    const matchedItem = allItems.find(item => item.url && normalizeUrl(item.url) === target) || null;
    if (!matchedItem) return null;
    return sources.find(source => source.id === matchedItem.source_id) || null;
  };

  const resolveSourceForBadge = (sourceName: string, url?: string | null) => {
    const sourceFromUrl = resolveSourceByUrl(url);
    if (sourceFromUrl) return sourceFromUrl;
    return resolveSourceByName(sourceName);
  };

  const handleSourceBadgeClick = (sourceName: string, url?: string | null) => {
    let matchedItem = null;
    if (url) {
      const target = normalizeUrl(url);
      matchedItem = allItems.find(item => item.url && normalizeUrl(item.url) === target) || null;
    }

    if (matchedItem) {
      setSummaryTargetItemId(matchedItem.id);
      setSelectedSource(matchedItem.source_id);
      return;
    }

    const source = resolveSourceByName(sourceName);
    if (source) {
      setSummaryTargetItemId(null);
      setSelectedSource(source.id);
      return;
    }

    if (url) {
      window.open(url, '_blank');
    }
  };
  const renderSourceBadge = (sourceName: string, url?: string | null) => {
    const source = resolveSourceForBadge(sourceName, url);
    const displayName = source?.name || sourceName.trim();
    return (
      <button
        type="button"
        onClick={() => handleSourceBadgeClick(displayName, url)}
        className="inline-flex items-center gap-1 rounded-md bg-muted/40 px-1.5 py-0.5 align-middle hover:bg-muted/60 transition-colors"
        title={displayName}
      >
        {source ? (
          <SourceLogo source={source} size="xs" />
        ) : (
          <div className="w-3 h-3 rounded bg-muted flex items-center justify-center text-[8px] font-semibold text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-[10px] text-muted-foreground leading-none">
          {displayName}
        </span>
      </button>
    );
  };

  const renderSourceBadges = (sources: Array<{ sourceName: string; url: string | null }>) => {
    if (sources.length === 0) return null;
    return (
      <span className="inline-flex flex-wrap items-center gap-1 ml-2 align-middle">
        {sources.map((source, index) => (
          <span key={`${source.sourceName}-${source.url || 'none'}-${index}`}>
            {renderSourceBadge(source.sourceName, source.url)}
          </span>
        ))}
      </span>
    );
  };

  const SummaryParagraph = ({ children }: { children: React.ReactNode }) => {
    const { sources, cleanedNode } = stripSourceTagsFromNode(children);
    const formattedNode = formatImplicationNode(cleanedNode);
    return (
      <p className="my-4 text-sm text-foreground">
        {formattedNode}
        {renderSourceBadges(sources)}
      </p>
    );
  };

  const summaryMarkdownComponents = {
    p: SummaryParagraph,
    li: ({ children }: { children: React.ReactNode }) => {
      const childArray = React.Children.toArray(children);
      const hasParagraphChild = childArray.some(child => (
        React.isValidElement(child) && (child.type === SummaryParagraph || child.type === 'p')
      ));

      if (hasParagraphChild) {
        return <li className="my-4 text-sm text-foreground">{children}</li>;
      }

      const { sources, cleanedNode } = stripSourceTagsFromNode(children);
      const formattedNode = formatImplicationNode(cleanedNode);
      const badges = renderSourceBadges(sources);
      return (
        <li className="my-4 text-sm text-foreground">
          {formattedNode}
          {badges}
        </li>
      );
    },
    h2: ({ children }: { children: React.ReactNode }) => {
      const { sources, cleanedNode } = stripSourceTagsFromNode(children);
      const formattedNode = formatImplicationNode(cleanedNode);
      return (
        <h2 className="mt-6 mb-2 text-base font-semibold font-sans text-foreground/90">
          {formattedNode}
          {renderSourceBadges(sources)}
        </h2>
      );
    },
    h3: ({ children }: { children: React.ReactNode }) => {
      const { sources, cleanedNode } = stripSourceTagsFromNode(children);
      const formattedNode = formatImplicationNode(cleanedNode);
      return (
        <h3 className="mt-4 mb-2 text-sm font-semibold font-sans text-foreground/90">
          {formattedNode}
          {renderSourceBadges(sources)}
        </h3>
      );
    },
    h4: ({ children }: { children: React.ReactNode }) => {
      const { sources, cleanedNode } = stripSourceTagsFromNode(children);
      const formattedNode = formatImplicationNode(cleanedNode);
      return (
        <h4 className="mt-3 mb-2 text-[11px] font-semibold font-sans text-foreground/90">
          {formattedNode}
          {renderSourceBadges(sources)}
        </h4>
      );
    },
  };

  const handleToggleSummaryView = () => {
    setIsSummaryView(prev => {
      const next = !prev;
      if (next) {
        setSelectedHistoryId(null);
        setSummaryError(null);
      } else {
        setSelectedHistoryId(null);
      }
      return next;
    });
  };

  const handleGenerateSummary = async () => {
    const historySnapshot = new Set(summaryHistory.map(item => item.id));
    const selectLatestHistory = async (allowRetry = false) => {
      let history = await fetchSummaryHistory();
      if (history.length === 0 && allowRetry) {
        await new Promise(resolve => setTimeout(resolve, 900));
        history = await fetchSummaryHistory();
      }
      if (history.length === 0) return false;
      const newEntries = history.filter(item => !historySnapshot.has(item.id));
      if (newEntries.length === 0) {
        return false;
      }
      const latest = newEntries.reduce((acc, item) => {
        const accTime = new Date(acc.created_at).getTime();
        const itemTime = new Date(item.created_at).getTime();
        if (Number.isNaN(accTime)) return item;
        if (Number.isNaN(itemTime)) return acc;
        return itemTime > accTime ? item : acc;
      }, newEntries[0]);
      setSelectedHistoryId(latest.id);
      setSummaryText(null);
      return true;
    };

    setIsGeneratingSummary(true);
    setSummaryError(null);
    setSummaryText('');
    setSummaryMeta(null);
    setSelectedHistoryId(null);
    setSummaryStage('preparing');
    summaryAbortRef.current?.abort();
    summaryAbortRef.current = new AbortController();

    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Not authenticated');

      const supabaseUrl = (supabase as any).supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-research-summary?stream=1`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            markAsRead: markReadAfterSummary,
            sourceIds: unreadSources.map(source => source.id),
          }),
          signal: summaryAbortRef.current.signal,
        }
      );

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate summary');
      }

      setSummaryStage('streaming');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let didComplete = false;
      let hasStreamedText = false;

      const handlePayload = async (payload: string) => {
        if (!payload) return false;
        if (payload === '[DONE]') {
          setSummaryStage('saving');
          didComplete = true;
          await selectLatestHistory(true);
          return true;
        }
        try {
          const parsed = JSON.parse(payload);
          if (parsed.type === 'meta') {
            setSummaryMeta(parsed.metadata || null);
          } else if (parsed.type === 'delta' && parsed.text) {
            hasStreamedText = true;
            setSummaryText(prev => `${prev || ''}${parsed.text}`);
          }
        } catch (error) {
          // Ignore malformed stream chunks.
        }
        return false;
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, '\n');
        let boundaryIndex = buffer.indexOf('\n\n');
        while (boundaryIndex !== -1) {
          const chunk = buffer.slice(0, boundaryIndex);
          buffer = buffer.slice(boundaryIndex + 2);
          const lines = chunk.split('\n').filter((line) => line.startsWith('data: '));
          for (const line of lines) {
            const payload = line.replace(/^data:\s*/, '').trim();
            const shouldStop = await handlePayload(payload);
            if (shouldStop) {
              return;
            }
          }
          boundaryIndex = buffer.indexOf('\n\n');
        }
      }

      if (!didComplete) {
        buffer = buffer.replace(/\r\n/g, '\n');
        const trailingLines = buffer.split('\n').filter((line) => line.startsWith('data: '));
        for (const line of trailingLines) {
          const payload = line.replace(/^data:\s*/, '').trim();
          const shouldStop = await handlePayload(payload);
          if (shouldStop) {
            return;
          }
        }
      }

      if (!didComplete && hasStreamedText) {
        setSummaryStage('saving');
        await selectLatestHistory(true);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        const message = error instanceof Error ? error.message : 'Failed to generate summary';
        setSummaryError(message);
      }
    } finally {
      setIsGeneratingSummary(false);
      setSummaryStage('idle');
    }
  };

  const handleStopSummary = () => {
    summaryAbortRef.current?.abort();
    summaryAbortRef.current = null;
  };

  if (loading) {
    return <PageSkeleton />;
  }

  const handleMarketChange = (market: 'public' | 'private') => {
    if (market === 'private') {
      navigate('/private');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />

      <Navigation activeTab="research" onTabChange={handleTabChange} isAdmin={isAdmin} />

      {/* User Menu */}
      <div className="fixed top-[18px] right-4 z-[60]">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-accent ring-0 focus-visible:ring-0">
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
              <DropdownMenuItem onClick={() => navigate('/', { state: { activeTab: 'admin' } })}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>{t('User Management')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setChangePasswordDialog(true)}>
              <KeyRound className="mr-2 h-4 w-4" />
              <span>{t('Change Password')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <SettingsIcon className="mr-2 h-4 w-4" />
              <span>{t('Settings')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('Logout')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

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

      <PageLayout
        maxWidth="full"
        paddingX="px-4 md:px-6 lg:px-8"
        header={(
          <PageSectionHeader
            title={t('Research')}
            subtitle={
              totalUnread > 0
                ? t('{unread} unread across {sources} sources', { unread: totalUnread, sources: sources.length })
                : t('Tracking {sources} sources', { sources: sources.length })
            }
            actions={(
              <>
                <Button
                  variant={isSummaryView ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleSummaryView}
                  className={cn(
                    "text-xs hover:shadow-sm transition-all duration-200 ease-out border-0 text-foreground",
                    isSummaryView
                      ? "bg-foreground text-background hover:bg-foreground/90"
                      : "bg-transparent bg-gradient-to-r from-amber-200/70 via-fuchsia-200/60 to-sky-200/70 hover:from-amber-200/80 hover:via-fuchsia-200/70 hover:to-sky-200/80 opacity-85"
                  )}
                >
                  {isSummaryView ? (
                    <ArrowLeft className="h-3 w-3 mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  {isSummaryView ? t('Back') : t('Summary')}
                </Button>
                <div className={cn("flex flex-wrap items-center gap-2 sm:gap-3", isSummaryView && "invisible pointer-events-none")}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllSourcesAsRead()}
                    disabled={totalUnread === 0}
                    className="text-xs hover:shadow-sm transition-all duration-200 ease-out disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCheck className="h-3 w-3 mr-1" />
                    {t('Read All')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDialog({
                      open: true,
                      title: t('Clear All Records'),
                      description: t('This will delete all articles from all sources. The sources themselves will be kept. This action cannot be undone.'),
                      onConfirm: () => clearAllSourcesItems()
                    })}
                    className="text-xs hover:shadow-sm transition-all duration-200 ease-out text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('Clear All')}
                  </Button>
                  {syncProgress ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stopSyncAll}
                      className={cn(
                        "text-xs hover:shadow-sm transition-all duration-200 ease-out",
                        syncProgress.isStopping && "opacity-60 cursor-not-allowed"
                      )}
                      disabled={syncProgress.isStopping}
                    >
                      <Square className="h-3 w-3 mr-1" />
                      {syncProgress.isStopping ? t('Stopping...') : t('Stop')}
                    </Button>
                  ) : isSyncing ? (
                    <span
                      className="text-xs font-medium animate-text-shimmer bg-clip-text text-transparent px-3 py-1.5"
                      style={{
                        backgroundImage: 'linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--muted-foreground)) 100%)',
                        backgroundSize: '200% auto'
                      }}
                    >
                      {t('Working...')}
                    </span>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncAllSources()}
                      className="text-xs hover:shadow-sm transition-all duration-200 ease-out"
                    >
                      <RotateCw className="h-3 w-3 mr-1" />
                      {t('Sync All')}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setAddDialogOpen(true)}
                    className="bg-primary hover:bg-primary/90 text-xs hover:shadow-sm transition-all duration-200 ease-out"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t('Add Source')}
                  </Button>
                </div>
              </>
            )}
          />
        )}
      >

        {isSummaryView ? (
          <div className="mt-6 rounded-3xl bg-gradient-to-br from-muted/30 via-muted/10 to-transparent shadow-sm p-5">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
              <div className="flex flex-col h-[70vh] bg-white/80 rounded-2xl">
                <ScrollArea className="flex-1 pr-2 scrollbar-none">
                  {summaryHistory.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground">
                      {t('No summary history yet.')}
                    </div>
                  ) : (
                    <div className="divide-y divide-border/40">
                      {summaryHistory.map((summary) => {
                        const formattedDate = formatSummaryDate(summary.created_at, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });
                        return (
                          <button
                            key={summary.id}
                            onClick={() => {
                              setSelectedHistoryId(summary.id);
                              setSummaryError(null);
                            }}
                            className={cn(
                              "w-full text-left px-4 py-3 transition-colors",
                              selectedHistoryId === summary.id
                                ? "bg-muted/40"
                                : "hover:bg-muted/30"
                            )}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-medium text-foreground/90">
                                {formattedDate}
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    toggleSummaryFavorite(summary.id, !summary.is_favorite);
                                  }}
                                  className={cn(
                                    "rounded-full p-1 transition-colors",
                                    summary.is_favorite ? "text-amber-500" : "text-muted-foreground hover:text-foreground"
                                  )}
                                  title={summary.is_favorite ? t('Unfavorite') : t('Favorite')}
                                >
                                  <Star className={cn("h-3 w-3", summary.is_favorite && "fill-current")} />
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (selectedHistoryId === summary.id) {
                                      setSelectedHistoryId(null);
                                    }
                                    deleteSummaryHistory(summary.id);
                                  }}
                                  className="rounded-full p-1 text-muted-foreground hover:text-destructive transition-colors"
                                  title={t('Delete')}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {t('Unread {count} · Sources {sources}', {
                                count: summary.item_count ?? 0,
                                sources: summary.source_count ?? 0
                              })}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="flex flex-col h-[70vh]">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <SummaryIcon className="h-4 w-4 text-muted-foreground" />
                      <h2 className="text-base font-semibold text-foreground">{summaryHeaderTitle}</h2>
                    </div>
                    {!selectedHistory && (
                      <p className="text-xs text-muted-foreground">
                        {t('Ready to summarize.')}
                      </p>
                    )}
                    {selectedHistory && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 rounded-full bg-muted/40 text-[11px] text-muted-foreground">
                          {t('Unread: {count}', { count: summaryItemCount })}
                        </span>
                        <span className="px-2 py-1 rounded-full bg-muted/40 text-[11px] text-muted-foreground">
                          {t('Sources: {count}', { count: summarySourceCount })}
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedHistory ? (
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryId(null)}
                      className="rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                      title={t('Close summary')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <ScrollArea className="flex-1">
                  <div className="pr-2">
                    {summaryError && (
                      <div className="text-sm text-red-500 mb-3">{summaryError}</div>
                    )}
                    {isGeneratingSummary ? (
                      <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                          <SummaryThinkingIndicator stage={summaryStage === 'idle' ? 'preparing' : summaryStage} />
                          <Button
                            onClick={handleStopSummary}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 rounded-full p-0 bg-white text-red-600 border-0 hover:bg-red-50 hover:text-red-700"
                          >
                            <Square className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        {summaryText ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-3 prose-headings:my-5 prose-p:indent-0 prose-li:indent-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMarkdownComponents}>
                              {preprocessSummaryText(summaryText)}
                            </ReactMarkdown>
                          </div>
                        ) : null}
                      </div>
                    ) : selectedHistory ? (
                      <div>
                        <p className="text-xs text-muted-foreground mb-4">
                          {t('Generated on {date}', {
                            date: formatSummaryDate(selectedHistory.created_at, {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })
                          })}
                        </p>
                        {selectedHistory.summary ? (
                          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-3 prose-headings:my-5 prose-p:indent-0 prose-li:indent-0">
                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMarkdownComponents}>
                              {preprocessSummaryText(selectedHistory.summary)}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">{t('No content available.')}</p>
                        )}
                      </div>
                    ) : summaryText ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-4 prose-ul:my-4 prose-ol:my-4 prose-li:my-3 prose-headings:my-5 prose-p:indent-0 prose-li:indent-0">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={summaryMarkdownComponents}>
                          {preprocessSummaryText(summaryText)}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center min-h-[360px]">
                        <div className="w-full max-w-sm space-y-5">
                          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <span className="px-2 py-1 rounded-full bg-muted/40">{t('Unread: {count}', { count: totalUnread })}</span>
                            <span className="px-2 py-1 rounded-full bg-muted/40">{t('Sources: {count}', { count: unreadSourceCount })}</span>
                          </div>
                          {unreadSources.length > 0 && (
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              {unreadSources.slice(0, 10).map((source) => (
                                <div key={source.id} className="rounded-full bg-muted/40 p-1 shadow-xs">
                                  <SourceLogo source={source} size="xs" />
                                </div>
                              ))}
                              {unreadSources.length > 10 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{unreadSources.length - 10}
                                </span>
                              )}
                            </div>
                          )}
                          <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                            <Checkbox
                              checked={markReadAfterSummary}
                              onCheckedChange={(value) => setMarkReadAfterSummary(Boolean(value))}
                            />
                            {t('Mark all read after generation')}
                          </label>
                          <div className="flex justify-center">
                            <Button
                              onClick={handleGenerateSummary}
                              size="sm"
                              className="gap-2 rounded-lg px-6 shadow-sm text-foreground border-0 bg-transparent bg-gradient-to-r from-amber-200/70 via-fuchsia-200/60 to-sky-200/70 hover:bg-transparent hover:from-amber-200/80 hover:via-fuchsia-200/70 hover:to-sky-200/80 hover:brightness-100"
                              disabled={totalUnread === 0}
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              {t('Generate Summary')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar - Full width */}
            <div className="mb-4 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('Search sources and articles...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-8 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sync Progress */}
            {syncProgress && (
              <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-r from-amber-200/30 via-fuchsia-200/25 to-sky-200/30 p-3 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center justify-between gap-3 text-xs mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[13px] font-semibold bg-gradient-to-r from-foreground via-primary to-foreground/70 bg-[length:200%_100%] bg-clip-text text-transparent animate-text-shimmer"
                    >
                      {syncProgress.isStopping ? t('Stopping') : t('Syncing')}
                    </span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {syncProgress.current} / {syncProgress.total}
                  </span>
                </div>
                {syncingSources.length > 0 && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {syncingSources.slice(0, 8).map((source) => (
                      <div key={source.id} className="rounded-full bg-white/70 p-1 shadow-sm">
                        <SourceLogo source={source} size="xs" />
                      </div>
                    ))}
                    {syncingSources.length > 8 && (
                      <span className="text-[10px] text-muted-foreground">
                        +{syncingSources.length - 8}
                      </span>
                    )}
                  </div>
                )}
                <div className="relative h-2 rounded-full bg-white/45 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-primary/90 to-primary/70 transition-all duration-500 ease-out"
                    style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                  />
                  <div
                    className="absolute inset-0 animate-shimmer-slow"
                    style={{
                      backgroundImage: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
                      backgroundSize: '200% 100%'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Category Tabs and Priority Filter */}
            <div className="space-y-3 mb-6">
              <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const count = key === 'all'
                    ? sources.length
                    : sources.filter(s => s.category === key).length;
                  const unread = key === 'all'
                    ? totalUnread
                    : sources.filter(s => s.category === key).reduce((sum, s) => sum + (s.unread_count || 0), 0);
                  const isActive = selectedCategory === key;

                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedCategory(key)}
                      className={cn(
                        "px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors duration-200 flex-shrink-0 border-0 ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 inline-flex items-center gap-1.5",
                        isActive
                          ? key === 'all'
                            ? "bg-foreground text-background shadow-md"
                            : cn(config.bg, config.color, "shadow-sm")
                          : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/40"
                      )}
                    >
                      {config.icon}
                      {config.label}
                      <span className={cn("ml-1.5 sm:ml-2", isActive ? "opacity-70" : "opacity-40")}>
                        {count}
                      </span>
                      {unread > 0 && (
                        <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-medium inline-flex items-center justify-center">
                          {unread}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Priority Filter and Tag Filter */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Priority buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                    {t('Unread')}
                  </span>
                  <button
                    onClick={() => setShowUnreadOnly(prev => !prev)}
                    disabled={unreadSourceCount === 0}
                    aria-pressed={showUnreadOnly}
                    className={cn(
                      "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors flex items-center gap-1.5 border-0 ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                      showUnreadOnly
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground",
                      unreadSourceCount === 0 && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    {t('Unread')}
                    <span
                      className={cn(
                        "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center",
                        showUnreadOnly
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-background text-foreground"
                      )}
                    >
                      {unreadSourceCount}
                    </span>
                  </button>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 ml-2">
                    {t('Priority')}
                  </span>
                  {(['all', 5, 4, 3, 2, 1] as const).map((p) => {
                    const config = priorityConfig[p];
                    const isActive = selectedPriority === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setSelectedPriority(p)}
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-colors border-0 ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
                          isActive ? config.activeColor : config.bgColor
                        )}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {/* Tag dropdown */}
                {allTags.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
                      {t('Tag')}
                    </span>
                    <Select value={selectedTag} onValueChange={setSelectedTag}>
                      <SelectTrigger className="h-6 w-[140px] text-[11px] bg-background/60 border border-border/40 hover:bg-background/80">
                        <SelectValue placeholder={t('All tags')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('All tags')}</SelectItem>
                        {allTags.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Sources Section Header when searching */}
            {isSearching && filteredSources.length > 0 && (
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <LayoutGrid className="h-4 w-4" />
                {t('Sources')} ({filteredSources.length})
              </h3>
            )}

            {/* Sources Grid */}
            {sourcesLoading ? (
              <SkeletonGrid count={6} columns={4} />
            ) : filteredSources.length === 0 && filteredItems.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title={searchQuery
                  ? t('No matching results')
                  : selectedCategory === 'all'
                    ? t('No sources yet')
                    : t('No {category} sources', { category: categoryConfig[selectedCategory]?.label || selectedCategory })
                }
                description={searchQuery
                  ? t('Try a different search term')
                  : t('Add your favorite information sources to track updates')
                }
                action={!searchQuery ? {
                  label: t('Add Your First Source'),
                  onClick: () => setAddDialogOpen(true),
                  icon: Plus,
                } : undefined}
              />
            ) : filteredSources.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {filteredSources.map((source) => (
                  <SourceCard
                    key={source.id}
                    source={source}
                    onClick={() => setSelectedSource(source.id)}
                    onDelete={() => handleDeleteSource(source.id, source.name)}
                    onSync={() => syncSource(source.id)}
                    isSyncing={syncingSourceIds.has(source.id)}
                  />
                ))}
              </div>
            ) : null}

            {/* Search Results: Articles (below sources) */}
            {isSearching && filteredItems.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <ArticleIcon className="h-4 w-4" />
                  {t('Articles')} ({filteredItems.length}{filteredItems.length >= 20 ? '+' : ''})
                </h3>
                <div className="space-y-2">
                  {filteredItems.map((item) => {
                    const itemSource = sourceMap[item.source_id];
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer",
                          !item.is_read && "border-l-2 border-primary"
                        )}
                        onClick={() => {
                          if (item.url) {
                            window.open(item.url, '_blank');
                          } else {
                            setSelectedSource(item.source_id);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Source Logo */}
                          {itemSource && (
                            <SourceLogo source={itemSource} size="sm" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                            {item.summary && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.summary}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-muted-foreground">
                                {itemSource?.name || 'Unknown'}
                              </span>
                              {item.published_at && (
                                <span className="text-[10px] text-muted-foreground">
                                  · {new Date(item.published_at).toLocaleDateString()}
                                </span>
                              )}
                              {!item.is_read && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                  {t('Unread')}
                                </span>
                              )}
                            </div>
                          </div>
                          {item.url && (
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </PageLayout>

      <AddSourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        existingSourceNames={sources.map(s => s.name)}
        onAdd={addSource}
      />

      <SourceDetailDialog
        source={currentSource}
        items={items}
        open={!!selectedSource && !!currentSource}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSource(null);
            setSummaryTargetItemId(null);
          }
        }}
        initialItemId={summaryTargetItemId}
        onFetchItems={fetchItemsForSource}
        onMarkAsRead={markItemAsRead}
        onMarkAllAsRead={markAllAsRead}
        onClearRecords={(sourceId) => setConfirmDialog({
          open: true,
          title: t('Clear Records'),
          description: t('This will delete all articles from this source. The source itself will be kept. This action cannot be undone.'),
          onConfirm: () => {
            clearSourceItems(sourceId);
            setSelectedSource(null); // Close the dialog after clearing
          }
        })}
        onAddItem={addManualItem}
        onUpdateSource={updateSource}
        onSync={syncSource}
        isSyncing={selectedSource ? syncingSourceIds.has(selectedSource) : false}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
      />

      {/* Change Password Dialog */}
      <Dialog open={changePasswordDialog} onOpenChange={setChangePasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Change Password")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("New Password")}</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("Enter new password")}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("Confirm New Password")}</label>
              <Input
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
    </div>
  );
};

export default Research;
