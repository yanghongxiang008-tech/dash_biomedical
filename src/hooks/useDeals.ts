/**
 * Custom hook for fetching and managing deals data
 * Centralizes deal-related data fetching logic with React Query
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Deal } from '@/types';
import { QUERY_KEYS, QUERY_CONFIG } from '@/constants';
import { useI18n } from '@/i18n';

export const useDeals = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: deals = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.DEALS],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('deal_date', { ascending: false });

      if (error) throw error;
      return (data || []) as Deal[];
    },
    staleTime: QUERY_CONFIG.STALE_TIME,
    gcTime: QUERY_CONFIG.GC_TIME,
  });

  const deleteDeal = async (dealId: string) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) throw error;
      
      toast({ title: t('Success'), description: t('Deal deleted successfully') });
      
      // Invalidate related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEALS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD_ACTIVE_DEALS] }),
        queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD_RECENT_PROJECTS] }),
      ]);
      
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : t('Failed to delete deal');
      toast({ title: t('Error'), description: message, variant: 'destructive' });
      return false;
    }
  };

  const invalidateDeals = () => {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DEALS] }),
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD_ACTIVE_DEALS] }),
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.DASHBOARD_RECENT_PROJECTS] }),
    ]);
  };

  return {
    deals,
    isLoading,
    error,
    refetch,
    deleteDeal,
    invalidateDeals,
  };
};

/**
 * Hook for filtered deals with stats
 */
export const useFilteredDeals = (
  deals: Deal[],
  filters: {
    searchQuery: string;
    sectorFilter: string;
    statusFilter: string;
    roundFilter: string;
    sortField: 'deal_date' | 'valuation_terms';
    sortOrder: 'asc' | 'desc';
  }
) => {
  const { searchQuery, sectorFilter, statusFilter, roundFilter, sortField, sortOrder } = filters;

  // Get unique filter values
  const sectors = [...new Set(deals.map(d => d.sector).filter(Boolean))] as string[];
  const statuses = [...new Set(deals.map(d => d.status).filter(Boolean))] as string[];
  const rounds = [...new Set(deals.map(d => d.funding_round).filter(Boolean))] as string[];

  // Stats
  const stats = {
    total: deals.length,
    following: deals.filter(d => d.status === 'Follow').length,
    active: deals.filter(d => d.status === 'Due Diligence' || d.status === 'DD').length,
    closed: deals.filter(d => d.status === 'Invested').length,
  };

  // Filter and sort
  const filteredDeals = [...deals]
    .filter(deal => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          deal.project_name.toLowerCase().includes(query) ||
          deal.description?.toLowerCase().includes(query) ||
          deal.sector?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      if (sectorFilter !== 'all' && deal.sector !== sectorFilter) return false;
      if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
      if (roundFilter !== 'all' && deal.funding_round !== roundFilter) return false;
      
      return true;
    })
    .sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      
      if (sortField === 'deal_date') {
        aVal = a.deal_date ? new Date(a.deal_date).getTime() : 0;
        bVal = b.deal_date ? new Date(b.deal_date).getTime() : 0;
      } else {
        aVal = a.valuation_terms || '';
        bVal = b.valuation_terms || '';
      }
      
      return sortOrder === 'asc' 
        ? (aVal > bVal ? 1 : -1) 
        : (aVal < bVal ? 1 : -1);
    });

  return {
    filteredDeals,
    filterOptions: { sectors, statuses, rounds },
    stats,
  };
};
