import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SourceCategory = 'news' | 'research' | 'podcast' | 'report' | 'twitter';
export type SourceType = 'rss' | 'crawl' | 'manual';

export interface ResearchSource {
  id: string;
  user_id: string;
  name: string;
  url: string;
  feed_url: string | null;
  category: SourceCategory;
  favicon_url: string | null;
  source_type: SourceType;
  description: string | null;
  last_checked_at: string | null;
  last_content_hash: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  // New fields
  tags: string[];
  priority: number;
  logo_url: string | null;
  // Latest item info
  latest_item_title?: string | null;
  latest_item_date?: string | null;
}

export interface ResearchItem {
  id: string;
  source_id: string;
  title: string;
  url: string | null;
  summary: string | null;
  content: string | null;
  published_at: string | null;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

// Lightweight item for search
export interface ResearchItemSummary {
  id: string;
  source_id: string;
  title: string;
  summary: string | null;
  url: string | null;
  published_at: string | null;
  is_read: boolean;
}

export interface ResearchSummaryHistory {
  id: string;
  title: string | null;
  preview: string | null;
  summary: string | null;
  created_at: string;
  item_count: number | null;
  source_count: number | null;
  is_favorite: boolean | null;
}

export const useResearch = () => {
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [items, setItems] = useState<ResearchItem[]>([]);
  const [allItems, setAllItems] = useState<ResearchItemSummary[]>([]);
  const [summaryHistory, setSummaryHistory] = useState<ResearchSummaryHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingSourceIds, setSyncingSourceIds] = useState<Set<string>>(new Set());
  const [syncProgress, setSyncProgress] = useState<{
    current: number;
    total: number;
    currentSourceId?: string;
    currentSourceName?: string;
    isStopping?: boolean;
  } | null>(null);
  const syncAllAbortRef = useRef(false);
  const { toast } = useToast();

  const fetchSources = async () => {
    try {
      const { data: sourcesData, error: sourcesError } = await supabase
        .from('research_sources')
        .select('*')
        .order('display_order');

      if (sourcesError) throw sourcesError;

      // Fetch all items with fields needed for search and display
      const { data: itemsData, error: itemsError } = await supabase
        .from('research_items')
        .select('id, source_id, is_read, title, summary, url, published_at')
        .order('published_at', { ascending: false });

      if (itemsError) throw itemsError;

      const { data: unreadItemsData, error: unreadItemsError } = await supabase
        .from('research_items')
        .select('source_id')
        .eq('is_read', false);

      if (unreadItemsError) throw unreadItemsError;

      // Store all items for search
      setAllItems(itemsData as ResearchItemSummary[] || []);

      // Calculate unread counts and get latest item per source
      const unreadCounts: Record<string, number> = {};
      const latestItems: Record<string, { title: string; date: string | null }> = {};

      unreadItemsData?.forEach(item => {
        unreadCounts[item.source_id] = (unreadCounts[item.source_id] || 0) + 1;
      });

      itemsData?.forEach(item => {
        // Track the first (latest) item for each source
        if (!latestItems[item.source_id]) {
          latestItems[item.source_id] = {
            title: item.title,
            date: item.published_at
          };
        }
      });

      // Attach unread counts and latest item info to sources
      const sourcesWithCounts = sourcesData?.map(source => ({
        ...source,
        tags: source.tags || [],
        priority: source.priority || 3,
        logo_url: source.logo_url || null,
        unread_count: unreadCounts[source.id] || 0,
        latest_item_title: latestItems[source.id]?.title || null,
        latest_item_date: latestItems[source.id]?.date || null
      })) || [];

      setSources(sourcesWithCounts as ResearchSource[]);
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast({
        title: "Error",
        description: "Failed to load research sources",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchItemsForSource = async (sourceId: string) => {
    try {
      const { data, error } = await supabase
        .from('research_items')
        .select('*')
        .eq('source_id', sourceId)
        .order('published_at', { ascending: false });

      if (error) throw error;
      setItems(data as ResearchItem[] || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: "Error",
        description: "Failed to load articles",
        variant: "destructive"
      });
    }
  };

  const fetchSummaryHistory = useCallback(async (): Promise<ResearchSummaryHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('research_summary_history')
        .select('id, title, preview, summary, created_at, item_count, source_count, is_favorite')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      const history = (data || []) as ResearchSummaryHistory[];
      setSummaryHistory(history);
      return history;
    } catch (error) {
      console.error('Error fetching summary history:', error);
      toast({
        title: "Error",
        description: "Failed to load summary history",
        variant: "destructive"
      });
      return [];
    }
  }, [toast]);

  const toggleSummaryFavorite = useCallback(async (id: string, nextFavorite: boolean) => {
    const previous = summaryHistory;
    setSummaryHistory(prev =>
      prev.map(item => item.id === id ? { ...item, is_favorite: nextFavorite } : item)
    );
    const { error } = await supabase
      .from('research_summary_history')
      .update({ is_favorite: nextFavorite })
      .eq('id', id);

    if (error) {
      console.error('Error updating summary favorite:', error);
      setSummaryHistory(previous);
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive"
      });
    }
  }, [summaryHistory, toast]);

  const deleteSummaryHistory = useCallback(async (id: string) => {
    const previous = summaryHistory;
    setSummaryHistory(prev => prev.filter(item => item.id !== id));
    const { error } = await supabase
      .from('research_summary_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting summary history:', error);
      setSummaryHistory(previous);
      toast({
        title: "Error",
        description: "Failed to delete summary",
        variant: "destructive"
      });
    }
  }, [summaryHistory, toast]);

  const addSource = async (source: {
    name: string;
    url: string;
    feed_url?: string;
    category: SourceCategory;
    source_type: SourceType;
    description?: string;
    tags?: string[];
    priority?: number;
    logo_url?: string;
  }) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const maxOrder = Math.max(...sources.map(s => s.display_order), 0);

      const { data, error } = await supabase
        .from('research_sources')
        .insert({
          user_id: user.id,
          name: source.name,
          url: source.url,
          feed_url: source.feed_url || null,
          category: source.category,
          source_type: source.source_type,
          description: source.description || null,
          tags: source.tags || [],
          priority: source.priority || 3,
          logo_url: source.logo_url || null,
          display_order: maxOrder + 1
        })
        .select()
        .single();

      if (error) throw error;

      setSources(prev => [...prev, { ...data, unread_count: 0, tags: data.tags || [], priority: data.priority || 3 } as ResearchSource]);
      toast({
        title: "Success",
        description: `Added "${source.name}" to your sources`
      });

      return data;
    } catch (error) {
      console.error('Error adding source:', error);
      toast({
        title: "Error",
        description: "Failed to add source",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateSource = async (id: string, updates: Partial<ResearchSource>) => {
    try {
      const { error } = await supabase
        .from('research_sources')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      setSources(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
      toast({
        title: "Success",
        description: "Source updated"
      });
    } catch (error) {
      console.error('Error updating source:', error);
      toast({
        title: "Error",
        description: "Failed to update source",
        variant: "destructive"
      });
    }
  };

  const deleteSource = async (id: string) => {
    try {
      const { error } = await supabase
        .from('research_sources')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSources(prev => prev.filter(s => s.id !== id));
      toast({
        title: "Success",
        description: "Source deleted"
      });
    } catch (error) {
      console.error('Error deleting source:', error);
      toast({
        title: "Error",
        description: "Failed to delete source",
        variant: "destructive"
      });
    }
  };

  const addManualItem = async (sourceId: string, item: {
    title: string;
    url?: string;
    summary?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('research_items')
        .insert({
          source_id: sourceId,
          title: item.title,
          url: item.url || null,
          summary: item.summary || null,
          published_at: new Date().toISOString(),
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Update unread count
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { ...s, unread_count: (s.unread_count || 0) + 1 }
          : s
      ));

      toast({
        title: "Success",
        description: "Article added"
      });

      return data;
    } catch (error) {
      console.error('Error adding item:', error);
      toast({
        title: "Error",
        description: "Failed to add article",
        variant: "destructive"
      });
      return null;
    }
  };

  const markItemAsRead = async (itemId: string, sourceId: string) => {
    try {
      const { error } = await supabase
        .from('research_items')
        .update({ is_read: true })
        .eq('id', itemId);

      if (error) throw error;

      setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_read: true } : i));
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { ...s, unread_count: Math.max((s.unread_count || 0) - 1, 0) }
          : s
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('research_items')
        .update({ is_read: true })
        .eq('source_id', sourceId)
        .eq('is_read', false);

      if (error) throw error;

      setItems(prev => prev.map(i => i.source_id === sourceId ? { ...i, is_read: true } : i));
      setSources(prev => prev.map(s => 
        s.id === sourceId ? { ...s, unread_count: 0 } : s
      ));

      toast({
        title: "Success",
        description: "All articles marked as read"
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark as read",
        variant: "destructive"
      });
    }
  };

  const markAllSourcesAsRead = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all source IDs for current user
      const sourceIds = sources.map(s => s.id);
      if (sourceIds.length === 0) return;

      // Mark all items from user's sources as read
      const { error } = await supabase
        .from('research_items')
        .update({ is_read: true })
        .in('source_id', sourceIds)
        .eq('is_read', false);

      if (error) throw error;

      // Update local state
      setItems(prev => prev.map(i => ({ ...i, is_read: true })));
      setSources(prev => prev.map(s => ({ ...s, unread_count: 0 })));

      toast({
        title: "Success",
        description: "All sources marked as read"
      });
    } catch (error) {
      console.error('Error marking all sources as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive"
      });
    }
  };

  const clearSourceItems = async (sourceId: string) => {
    try {
      const { error } = await supabase
        .from('research_items')
        .delete()
        .eq('source_id', sourceId);

      if (error) throw error;

      // Update local state
      setItems(prev => prev.filter(i => i.source_id !== sourceId));
      setSources(prev => prev.map(s => 
        s.id === sourceId 
          ? { ...s, unread_count: 0, item_count: 0, latest_item_title: null, latest_item_date: null }
          : s
      ));

      toast({
        title: "Success",
        description: "All records cleared"
      });
    } catch (error) {
      console.error('Error clearing source items:', error);
      toast({
        title: "Error",
        description: "Failed to clear records",
        variant: "destructive"
      });
    }
  };

  const clearAllSourcesItems = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get all source IDs for current user
      const sourceIds = sources.map(s => s.id);
      if (sourceIds.length === 0) return;

      // Delete all items from user's sources
      const { error } = await supabase
        .from('research_items')
        .delete()
        .in('source_id', sourceIds);

      if (error) throw error;

      // Update local state
      setItems([]);
      setSources(prev => prev.map(s => ({ 
        ...s, 
        unread_count: 0, 
        item_count: 0, 
        latest_item_title: null, 
        latest_item_date: null 
      })));

      toast({
        title: "Success",
        description: "All records cleared from all sources"
      });
    } catch (error) {
      console.error('Error clearing all items:', error);
      toast({
        title: "Error",
        description: "Failed to clear all records",
        variant: "destructive"
      });
    }
  };

  const syncSource = useCallback(async (sourceId: string) => {
    setSyncingSourceIds(prev => new Set(prev).add(sourceId));
    try {
      const { data, error } = await supabase.functions.invoke('sync-research-sources', {
        body: { sourceIds: [sourceId] }
      });

      if (error) throw error;

      toast({
        title: "Sync Complete",
        description: `Found ${data?.newItems || 0} new items`
      });

      await fetchSources();
    } catch (error) {
      console.error('Error syncing source:', error);
      toast({
        title: "Sync Failed",
        description: "Could not sync source. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSyncingSourceIds(prev => {
        const next = new Set(prev);
        next.delete(sourceId);
        return next;
      });
    }
  }, [toast]);

  const syncAllSources = useCallback(async () => {
    const sourceIds = sources.filter(s => s.source_type !== 'manual').map(s => s.id);
    if (sourceIds.length === 0) return;
    if (syncProgress) return;

    syncAllAbortRef.current = false;

    const concurrencyLimit = 6;
    let completed = 0;
    const sourceLookup = new Map(sources.map(source => [source.id, source]));

    const syncOne = async (sourceId: string) => {
      if (syncAllAbortRef.current) return;
      const source = sourceLookup.get(sourceId);
      setSyncProgress(prev => prev ? {
        ...prev,
        currentSourceId: sourceId,
        currentSourceName: source?.name
      } : prev);
      setSyncingSourceIds(prev => new Set(prev).add(sourceId));

      try {
        await supabase.functions.invoke('sync-research-sources', {
          body: { sourceIds: [sourceId] }
        });
      } catch (error) {
        console.error(`Error syncing source ${sourceId}:`, error);
      } finally {
        setSyncingSourceIds(prev => {
          const next = new Set(prev);
          next.delete(sourceId);
          return next;
        });
        completed += 1;
        setSyncProgress(prev => prev ? {
          ...prev,
          current: completed,
          total: sourceIds.length
        } : prev);
      }
    };

    setSyncProgress({ current: 0, total: sourceIds.length });

    for (let i = 0; i < sourceIds.length; i += concurrencyLimit) {
      if (syncAllAbortRef.current) break;
      const batch = sourceIds.slice(i, i + concurrencyLimit);
      await Promise.all(batch.map(syncOne));
    }

    setSyncProgress(null);
    await fetchSources();
    
    if (syncAllAbortRef.current) {
      toast({
        title: "Sync Stopped",
        description: "Stopped syncing remaining sources."
      });
    } else {
      toast({
        title: "Sync Complete",
        description: `Synced ${sourceIds.length} sources`
      });
    }
  }, [sources, syncProgress, toast]);

  const stopSyncAll = useCallback(() => {
    syncAllAbortRef.current = true;
    setSyncProgress(prev => prev ? { ...prev, isStopping: true } : prev);
  }, []);

  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('research-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('research-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      });
      return null;
    }
  };

  const generateSummary = useCallback(async (options?: {
    sourceIds?: string[];
    markAsRead?: boolean;
    maxItems?: number;
  }): Promise<{ summary?: string; metadata?: any; error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-research-summary', {
        body: {
          sourceIds: options?.sourceIds,
          markAsRead: options?.markAsRead,
          maxItems: options?.maxItems,
        },
      });

      if (error) throw error;

      return {
        summary: data?.summary || '',
        metadata: data?.metadata,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      const message = error instanceof Error ? error.message : 'Failed to generate summary';
      return { error: message };
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, []);

  return {
    sources,
    items,
    allItems,
    loading,
    syncingSourceIds,
    syncProgress,
    fetchSources,
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
    uploadLogo,
    generateSummary,
    summaryHistory,
    fetchSummaryHistory,
    toggleSummaryFavorite,
    deleteSummaryHistory
  };
};
