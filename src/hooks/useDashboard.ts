/**
 * Dashboard data fetching hooks
 * Centralizes all dashboard-related queries
 */

import { useQuery } from '@tanstack/react-query';
import { subDays, isAfter, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/constants';
import type { Deal, Contact, Interaction } from '@/types';

const SEVEN_DAYS_AGO = subDays(new Date(), 7);
const FOURTEEN_DAYS_AGO = subDays(new Date(), 14);

interface DashboardStats {
  contactsCount: number;
  lastWeekContactsCount: number;
  activeDealsCount: number;
  lastWeekDealsCount: number;
  contactsGrowth: number;
  dealsGrowth: number;
  // Week-over-week comparison
  thisWeekContacts: number;
  lastWeekNewContacts: number;
  thisWeekDeals: number;
  lastWeekNewDeals: number;
  contactsPercentChange: number | null;
  dealsPercentChange: number | null;
  lastUpdated: Date;
}

interface RecentActivity {
  recentProjects: Deal[];
  recentContacts: Contact[];
  recentInteractions: (Interaction & { 
    contacts: { id: string; name: string; company: string | null } | null;
    deals: { id: string; project_name: string } | null;
  })[];
}

interface NotableDealsData {
  notableDeals: Deal[];
  dealInteractions: (Interaction & { 
    contacts: { id: string; name: string; company: string | null } | null;
  })[];
}

export const useDashboardStats = (): { data: DashboardStats; isLoading: boolean } => {
  const sevenDaysAgo = SEVEN_DAYS_AGO.toISOString();
  const fourteenDaysAgo = FOURTEEN_DAYS_AGO.toISOString();

  const { data: contactsCount = 0 } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_CONTACTS_COUNT],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: lastWeekContactsCount = 0 } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_LAST_WEEK_CONTACTS],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  // This week's new contacts (created in last 7 days)
  const { data: thisWeekContacts = 0 } = useQuery({
    queryKey: ['dashboard-this-week-contacts'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  // Last week's new contacts (created between 7-14 days ago)
  const { data: lastWeekNewContacts = 0 } = useQuery({
    queryKey: ['dashboard-last-week-new-contacts'],
    queryFn: async () => {
      const { count } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fourteenDaysAgo)
        .lt('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  const { data: activeDealsCount = 0 } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_ACTIVE_DEALS],
    queryFn: async () => {
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Reject');
      return count || 0;
    },
  });

  const { data: lastWeekDealsCount = 0 } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_LAST_WEEK_DEALS],
    queryFn: async () => {
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Reject')
        .lt('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  // This week's new deals
  const { data: thisWeekDeals = 0 } = useQuery({
    queryKey: ['dashboard-this-week-deals'],
    queryFn: async () => {
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Reject')
        .gte('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  // Last week's new deals (created between 7-14 days ago)
  const { data: lastWeekNewDeals = 0, isLoading } = useQuery({
    queryKey: ['dashboard-last-week-new-deals'],
    queryFn: async () => {
      const { count } = await supabase
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .not('status', 'eq', 'Reject')
        .gte('created_at', fourteenDaysAgo)
        .lt('created_at', sevenDaysAgo);
      return count || 0;
    },
  });

  // Calculate percentage change (week-over-week)
  const calculatePercentChange = (thisWeek: number, lastWeek: number): number | null => {
    if (lastWeek === 0) {
      return thisWeek > 0 ? 100 : null;
    }
    return Math.round(((thisWeek - lastWeek) / lastWeek) * 100);
  };

  return {
    data: {
      contactsCount,
      lastWeekContactsCount,
      activeDealsCount,
      lastWeekDealsCount,
      contactsGrowth: contactsCount - lastWeekContactsCount,
      dealsGrowth: activeDealsCount - lastWeekDealsCount,
      // Week-over-week
      thisWeekContacts,
      lastWeekNewContacts,
      thisWeekDeals,
      lastWeekNewDeals,
      contactsPercentChange: calculatePercentChange(thisWeekContacts, lastWeekNewContacts),
      dealsPercentChange: calculatePercentChange(thisWeekDeals, lastWeekNewDeals),
      lastUpdated: new Date(),
    },
    isLoading,
  };
};

export const useDashboardActivity = (): { data: RecentActivity; isLoading: boolean } => {
  const sevenDaysAgo = SEVEN_DAYS_AGO.toISOString();

  const { data: recentProjects = [] } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_RECENT_PROJECTS],
    queryFn: async () => {
      const { data } = await supabase
        .from('deals')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });
      return (data || []) as Deal[];
    },
  });

  const { data: recentContacts = [] } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_RECENT_CONTACTS],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('*')
        .gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false });
      return (data || []) as Contact[];
    },
  });

  const { data: recentInteractions = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_RECENT_INTERACTIONS],
    queryFn: async () => {
      const { data } = await supabase
        .from('interactions')
        .select(`
          *,
          contacts(id, name, company),
          deals(id, project_name)
        `)
        .gte('interaction_date', sevenDaysAgo)
        .order('interaction_date', { ascending: false });
      return data || [];
    },
  });

  return {
    data: { recentProjects, recentContacts, recentInteractions },
    isLoading,
  };
};

export const useDashboardNotableDeals = (): { data: NotableDealsData; isLoading: boolean } => {
  const sevenDaysAgo = SEVEN_DAYS_AGO;

  const { data: notableDeals = [] } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_NOTABLE_DEALS],
    queryFn: async () => {
      const [{ data: ddDeals }, { data: newDeals }] = await Promise.all([
        supabase.from('deals').select('*').eq('status', 'DD'),
        supabase
          .from('deals')
          .select('*')
          .gte('created_at', sevenDaysAgo.toISOString())
          .neq('status', 'DD'),
      ]);

      const allDeals = [...(ddDeals || []), ...(newDeals || [])] as Deal[];
      
      // Remove duplicates by id
      return allDeals.filter(
        (deal, index, self) => index === self.findIndex(d => d.id === deal.id)
      );
    },
  });

  const { data: dealInteractions = [], isLoading } = useQuery({
    queryKey: [QUERY_KEYS.DASHBOARD_DEAL_INTERACTIONS, notableDeals.map(d => d.id)],
    queryFn: async () => {
      if (notableDeals.length === 0) return [];
      
      const { data } = await supabase
        .from('interactions')
        .select(`*, contacts(id, name, company)`)
        .in('deal_id', notableDeals.map(d => d.id))
        .order('interaction_date', { ascending: false });
      
      return data || [];
    },
    enabled: notableDeals.length > 0,
  });

  return {
    data: { notableDeals, dealInteractions },
    isLoading,
  };
};

/**
 * Helper to check if a deal is new (within 7 days)
 */
export const isDealNew = (createdAt: string): boolean => {
  return isAfter(new Date(createdAt), SEVEN_DAYS_AGO);
};

/**
 * Format relative time for last updated display
 */
export const formatLastUpdated = (date: Date): string => {
  return formatDistanceToNow(date, { addSuffix: true });
};
