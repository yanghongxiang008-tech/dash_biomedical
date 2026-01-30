import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  Plus, Search, Eye, Briefcase, ExternalLink,
  ArrowUpDown, ChevronRight, CheckCircle2, Clock, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import DealDetailCard from './DealDetailCard';
import DealFormDialog from './DealFormDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import PageSectionHeader from '@/components/PageSectionHeader';
import { useI18n } from '@/i18n';

export interface Deal {
  id: string;
  project_name: string;
  hq_location: string | null;
  sector: string | null;
  funding_round: string | null;
  funding_amount: string | null;
  valuation_terms: string | null;
  source: string | null;
  bu_category: string | null;
  description: string | null;
  benchmark_companies: string | null;
  followers: string | null;
  status: string | null;
  feedback_notes: string | null;
  financials: string | null;
  deal_date: string | null;
  leads: string | null;
  folder_link: string | null;
  key_contacts: string | null;
  pre_investors: string | null;
  logo_url?: string | null;
  created_at: string;
  updated_at: string;
}

interface Contact {
  id: string;
  name: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Invested': { bg: 'bg-success/15', text: 'text-success', dot: 'bg-success' },
  'Pass': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Reject': { bg: 'bg-destructive/15', text: 'text-destructive', dot: 'bg-destructive' },
  'Follow': { bg: 'bg-info/15', text: 'text-info', dot: 'bg-info' },
  'Due Diligence': { bg: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning' },
  'DD': { bg: 'bg-warning/15', text: 'text-warning', dot: 'bg-warning' },
};

interface DealFlowTrackerProps {
  initialDealId?: string | null;
  onDealOpened?: () => void;
}

const DealFlowTracker: React.FC<DealFlowTrackerProps> = ({ initialDealId, onDealOpened }) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roundFilter, setRoundFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'deal_date' | 'valuation_terms' | 'project_name' | 'updated_at' | null>('deal_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [projectNameSortCycle, setProjectNameSortCycle] = useState<0 | 1 | 2>(0); // 0: default, 1: asc, 2: desc
  const isMobile = useIsMobile();
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);

  // Use React Query for deals with caching
  const { data: deals = [], isLoading: loading, refetch: fetchDeals } = useQuery({
    queryKey: ['deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*')
        .order('deal_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
    gcTime: 1000 * 60 * 30, // 30 minutes - cache persists
  });

  // Fetch contacts for resolving key_contacts IDs to names
  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts-for-deals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name');
      if (error) throw error;
      return (data || []) as Contact[];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Create a map for quick contact ID -> name lookup
  const contactsMap = useMemo(() => {
    const map = new Map<string, string>();
    contacts.forEach(c => map.set(c.id, c.name));
    return map;
  }, [contacts]);

  // Helper function to resolve key_contacts IDs to names array
  const resolveKeyContactsArray = (keyContacts: string | null): string[] => {
    if (!keyContacts) return [];
    try {
      const ids = JSON.parse(keyContacts);
      if (Array.isArray(ids) && ids.length > 0) {
        return ids
          .map(id => contactsMap.get(id))
          .filter(Boolean) as string[];
      }
    } catch {
      // If it's not valid JSON, return the original value split by comma
      return keyContacts.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  // Get initials from a name
  const getNameInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Handle initial deal opening
  useEffect(() => {
    if (initialDealId && deals.length > 0) {
      const deal = deals.find(d => d.id === initialDealId);
      if (deal) {
        setSelectedDeal(deal);
        onDealOpened?.();
      }
    }
  }, [initialDealId, deals, onDealOpened]);

  // Get unique values for filters
  const sectors = useMemo(() => [...new Set(deals.map(d => d.sector).filter(Boolean))], [deals]);
  const statuses = useMemo(() => [...new Set(deals.map(d => d.status).filter(Boolean))], [deals]);
  const rounds = useMemo(() => [...new Set(deals.map(d => d.funding_round).filter(Boolean))], [deals]);

  // Stats
  const totalDeals = deals.length;
  const followingDeals = deals.filter(d => d.status === 'Follow').length;
  const activeDeals = deals.filter(d => d.status === 'Due Diligence' || d.status === 'DD').length;
  const closedDeals = deals.filter(d => d.status === 'Invested').length;

  // Filter and sort deals
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(d =>
        d.project_name.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query) ||
        d.sector?.toLowerCase().includes(query)
      );
    }

    if (sectorFilter !== 'all') {
      result = result.filter(d => d.sector === sectorFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(d => d.status === statusFilter);
    }

    if (roundFilter !== 'all') {
      result = result.filter(d => d.funding_round === roundFilter);
    }

    // Apply sorting
    if (sortField === 'project_name') {
      result.sort((a, b) => {
        const aVal = a.project_name.toLowerCase();
        const bVal = b.project_name.toLowerCase();
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      });
    } else if (sortField) {
      result.sort((a, b) => {
        let aVal: any, bVal: any;
        if (sortField === 'deal_date') {
          aVal = a.deal_date ? new Date(a.deal_date).getTime() : 0;
          bVal = b.deal_date ? new Date(b.deal_date).getTime() : 0;
        } else if (sortField === 'updated_at') {
          aVal = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          bVal = b.updated_at ? new Date(b.updated_at).getTime() : 0;
        } else {
          aVal = a.valuation_terms || '';
          bVal = b.valuation_terms || '';
        }
        return sortOrder === 'asc' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
      });
    }

    return result;
  }, [deals, searchQuery, sectorFilter, statusFilter, roundFilter, sortField, sortOrder]);

  const handleSort = (field: 'deal_date' | 'valuation_terms' | 'project_name' | 'updated_at') => {
    if (field === 'project_name') {
      // Cycle through: default -> asc -> desc -> default
      const nextCycle = ((projectNameSortCycle + 1) % 3) as 0 | 1 | 2;
      setProjectNameSortCycle(nextCycle);
      if (nextCycle === 0) {
        setSortField('deal_date');
        setSortOrder('desc');
      } else if (nextCycle === 1) {
        setSortField('project_name');
        setSortOrder('asc');
      } else {
        setSortField('project_name');
        setSortOrder('desc');
      }
    } else {
      setProjectNameSortCycle(0);
      if (sortField === field) {
        setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setSortField(field);
        setSortOrder('desc');
      }
    }
  };

  const handleEdit = (deal: Deal) => {
    setEditingDeal(deal);
    setSelectedDeal(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (dealId: string) => {
    try {
      const { error } = await supabase.from('deals').delete().eq('id', dealId);
      if (error) throw error;
      toast({ title: t('Success'), description: t('Deal deleted successfully') });
      setSelectedDeal(null);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-active-deals-count'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] });
    } catch (error: any) {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to delete deal'),
        variant: 'destructive',
      });
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDeal(null);
  };

  const handleFormSuccess = () => {
    handleFormClose();
    queryClient.invalidateQueries({ queryKey: ['deals'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-active-deals-count'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-recent-projects'] });
  };

  // Get initials from project name
  const getInitials = (name: string) => {
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) return '';
    if (status === 'Due Diligence' || status === 'DD') return t('DD');
    return t(status);
  };

  // Show skeleton while loading instead of blocking spinner
  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center pb-3 border-b border-border">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-4 w-40 bg-muted/60 rounded" />
        </div>
        <div className="h-8 w-28 bg-muted rounded" />
      </div>
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-2.5 border-l-2 border-muted">
            <div className="h-4 w-16 bg-muted/60 rounded mb-1.5" />
            <div className="h-6 w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
      {/* List skeleton */}
      <div className="space-y-2 pt-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted/30 rounded" />
        ))}
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  // Empty state
  if (deals.length === 0 && !loading) {
    return (
      <div className="space-y-6">
        <PageSectionHeader
          title={t('Pipeline')}
          subtitle={t('Track the next unicorn')}
          actions={(
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-xs hover:shadow-sm transition-all duration-200 ease-out">
              <Plus className="h-3 w-3 mr-1" />
              {t('New Project')}
            </Button>
          )}
        />
        <div className="text-center py-16 space-y-4">
          <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium" >{t('No deals yet')}</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t('Start tracking your deal flow by adding your first project.')}
          </p>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" />
            {t('Add First Project')}
          </Button>
        </div>
        <DealFormDialog
          open={isFormOpen}
          onOpenChange={setIsFormOpen}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b border-border">
        <PageSectionHeader
          className="mb-0"
          title={t('Pipeline')}
          subtitle={t('Track the next unicorn')}
          actions={(
            <Button onClick={() => setIsFormOpen(true)} size="sm" className="bg-primary hover:bg-primary/90 text-xs hover:shadow-sm transition-all duration-200 ease-out">
              <Plus className="h-3 w-3 mr-1" />
              {t('New Project')}
            </Button>
          )}
        />
      </div>

      {/* Stat Cards - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-2.5 border-l-2 border-foreground/20">
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Total')}</p>
              <p className="text-lg font-semibold tabular-nums">{totalDeals}</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 border-l-2 border-blue-500">
          <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-blue-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Following')}</p>
              <p className="text-lg font-semibold tabular-nums">{followingDeals}</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 border-l-2 border-amber-500">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Active')}</p>
              <p className="text-lg font-semibold tabular-nums">{activeDeals}</p>
            </div>
          </div>
        </div>
        <div className="p-2.5 border-l-2 border-emerald-500">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Closed')}</p>
              <p className="text-lg font-semibold tabular-nums">{closedDeals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters - Compact row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-2 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder={t('Search deals...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-7 text-xs"
          />
        </div>
        <div className="flex gap-1.5 flex-shrink-0 flex-wrap">
          <Select value={sortField || 'deal_date'} onValueChange={(v) => { setSortField(v as any); setSortOrder('desc'); }}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={t('Sort by')} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="deal_date">{t('Date')}</SelectItem>
              <SelectItem value="updated_at">{t('Updated')}</SelectItem>
              <SelectItem value="project_name">{t('Name')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={t('Sector')} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">{t('All Sectors')}</SelectItem>
              {sectors.map(s => (
                <SelectItem key={s} value={s!}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={t('Status')} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">{t('All Statuses')}</SelectItem>
              {statuses.map(s => (
                <SelectItem key={s} value={s!}>{getStatusLabel(s)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roundFilter} onValueChange={setRoundFilter}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder={t('Round')} />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              <SelectItem value="all">{t('All Rounds')}</SelectItem>
              {rounds.map(r => (
                <SelectItem key={r} value={r!}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile Card View */}
      {isMobile && (
        <div className="space-y-3">
          {filteredDeals.map((deal) => {
            const status = statusConfig[deal.status || 'Follow'] || statusConfig['Follow'];
            return (
              <div
                key={deal.id}
                className="p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => setSelectedDeal(deal)}
              >
                <div className="flex items-start gap-3">
                  {deal.logo_url ? (
                    <img
                      src={deal.logo_url}
                      alt={deal.project_name}
                      className="w-10 h-10 rounded-lg object-contain bg-white border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground">
                      {getInitials(deal.project_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold truncate">{deal.project_name}</span>
                      {deal.folder_link && (
                        <a
                          href={deal.folder_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {deal.status && (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                          {getStatusLabel(deal.status)}
                        </div>
                      )}
                      {deal.sector && <span className="text-[10px] text-muted-foreground">{deal.sector}</span>}
                      {deal.funding_round && <span className="text-[10px] text-muted-foreground">· {deal.funding_round}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {deal.funding_amount && <span className="font-medium text-foreground">{deal.funding_amount}</span>}
                      {deal.deal_date && <span>{format(new Date(deal.deal_date), 'MMM d, yyyy')}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Deal List - Horizontal Scroll Table with ALL properties (Desktop only) */}
      {!isMobile && <ScrollArea className="w-full whitespace-nowrap">
        <div className="min-w-[2000px]">
          {/* Header Row - Project first, then Status, Key Contacts, then other fields (no Folder column) */}
          <div className="grid grid-cols-[minmax(160px,1fr)_90px_180px_90px_80px_100px_90px_90px_100px_90px_120px_100px_100px_80px_minmax(150px,1.5fr)] gap-2 px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium border-b border-border bg-muted/30 rounded-t-lg">
            <span
              className="cursor-pointer hover:text-foreground flex items-center gap-1"
              onClick={() => handleSort('project_name')}
            >
              {t('Project')} <ArrowUpDown className="w-3 h-3" />
              {sortField === 'project_name' && (
                <span className="text-[8px]">({sortOrder === 'asc' ? 'A-Z' : 'Z-A'})</span>
              )}
            </span>
            <span>{t('Status')}</span>
            <span>{t('Key Contacts')}</span>
            <span>{t('Sector')}</span>
            <span>{t('Round')}</span>
            <span>{t('Amount')}</span>
            <span>{t('Valuation')}</span>
            <span>{t('HQ')}</span>
            <span>{t('BU Category')}</span>
            <span>{t('Source')}</span>
            <span>{t('Benchmark')}</span>
            <span>{t('Pre-Investors')}</span>
            <span>{t('Leads')}</span>
            <span
              className="cursor-pointer hover:text-foreground flex items-center gap-1"
              onClick={() => handleSort('deal_date')}
            >
              {t('Date')} <ArrowUpDown className="w-3 h-3" />
            </span>
            <span>{t('Internal Notes')}</span>
          </div>

          {/* Deal Rows */}
          <div>
            {filteredDeals.map((deal) => {
              const status = statusConfig[deal.status || 'Follow'] || statusConfig['Follow'];
              const keyContactNames = resolveKeyContactsArray(deal.key_contacts);
              return (
                <div
                  key={deal.id}
                  className="group grid grid-cols-[minmax(160px,1fr)_90px_180px_90px_80px_100px_90px_90px_100px_90px_120px_100px_100px_80px_minmax(150px,1.5fr)] gap-2 px-3 py-2.5 border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors items-center"
                  onClick={() => setSelectedDeal(deal)}
                >
                  {/* Project Name & Logo + Folder Link */}
                  <div className="flex items-center gap-2 min-w-0">
                    {deal.logo_url ? (
                      <img
                        src={deal.logo_url}
                        alt={deal.project_name}
                        className="w-6 h-6 rounded object-contain bg-white border border-border flex-shrink-0"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-6 h-6 rounded bg-muted flex items-center justify-center flex-shrink-0 text-[9px] font-semibold text-muted-foreground ${deal.logo_url ? 'hidden' : ''}`}>
                      {getInitials(deal.project_name)}
                    </div>
                    <span className="text-sm font-medium truncate flex-1">{deal.project_name}</span>
                    {deal.folder_link && (
                      <a
                        href={deal.folder_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        title={t('Open Folder')}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div>
                    {deal.status && (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${status.bg} ${status.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                        {getStatusLabel(deal.status)}
                      </div>
                    )}
                  </div>

                  {/* Key Contacts with initials */}
                  <div className="flex items-center gap-1 min-w-0">
                    {keyContactNames.length > 0 ? (
                      <>
                        {keyContactNames.slice(0, 2).map((name, idx) => (
                          <div key={idx} className="flex items-center gap-1 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0 text-[8px] font-medium text-muted-foreground">
                              {getNameInitials(name)}
                            </div>
                            <span className="text-xs text-muted-foreground truncate max-w-[50px]">{name.split(' ')[0]}</span>
                          </div>
                        ))}
                        {keyContactNames.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{keyContactNames.length - 2}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>

                  {/* Sector */}
                  <span className="text-xs text-muted-foreground truncate">{deal.sector || '-'}</span>

                  {/* Round */}
                  <span className="text-xs text-muted-foreground truncate">{deal.funding_round || '-'}</span>

                  {/* Amount */}
                  <span className="text-xs font-medium tabular-nums truncate">{deal.funding_amount || '-'}</span>

                  {/* Valuation */}
                  <span className="text-xs text-muted-foreground tabular-nums truncate">{deal.valuation_terms || '-'}</span>

                  {/* HQ Location */}
                  <span className="text-xs text-muted-foreground truncate">{deal.hq_location || '-'}</span>

                  {/* BU Category */}
                  <span className="text-xs text-muted-foreground truncate">{deal.bu_category || '-'}</span>

                  {/* Source */}
                  <span className="text-xs text-muted-foreground truncate">{deal.source || '-'}</span>

                  {/* Benchmark Companies */}
                  <span className="text-xs text-muted-foreground truncate">{deal.benchmark_companies || '-'}</span>

                  {/* Pre-Investors */}
                  <span className="text-xs text-muted-foreground truncate">{deal.pre_investors || '-'}</span>

                  {/* Leads */}
                  <span className="text-xs text-muted-foreground truncate">{deal.leads || '-'}</span>

                  {/* Date */}
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {deal.deal_date ? format(new Date(deal.deal_date), 'yyyy/MM/dd') : '-'}
                  </span>

                  {/* Internal Notes / Feedback */}
                  <span className="text-xs text-muted-foreground truncate">{deal.feedback_notes || '-'}</span>
                </div>
              );
            })}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>}

      {/* No results state */}
      {filteredDeals.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">{t('No deals match your filters')}</p>
        </div>
      )}

      {/* Deal Detail Card */}
      <DealDetailCard
        deal={selectedDeal}
        onClose={() => setSelectedDeal(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Deal Form Dialog */}
      <DealFormDialog
        open={isFormOpen}
        onOpenChange={handleFormClose}
        deal={editingDeal}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default DealFlowTracker;
