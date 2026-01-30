import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus, Search, Users, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import type { Contact, Interaction } from './types';
import { contactTypeConfig } from './types';
import ContactFormDialog from './ContactFormDialog';
import ContactDetailCard from './ContactDetailCard';
import ContactStats from './ContactStats';
import ContactChart from './ContactChart';
import ConnectionMap from './ConnectionMap';
import PageSectionHeader from '@/components/PageSectionHeader';
import { useI18n } from '@/i18n';

const contactTypes = ['all', 'investor', 'fa', 'portco', 'expert'] as const;

interface AccessViewProps {
  initialContactId?: string | null;
  onContactOpened?: () => void;
}

const AccessView: React.FC<AccessViewProps> = ({ initialContactId, onContactOpened }) => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState<string>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  useEffect(() => {
    fetchContacts().then((fetchedContacts) => {
      // Handle initial contact opening
      if (initialContactId && fetchedContacts.length > 0) {
        const contact = fetchedContacts.find(c => c.id === initialContactId);
        if (contact) {
          setSelectedContact(contact);
          onContactOpened?.();
        }
      }
    });
    fetchAllInteractions();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContacts((data || []) as Contact[]);
      return (data || []) as Contact[];
    } catch (error: any) {
      toast({ title: t('Error'), description: error.message, variant: 'destructive' });
      return [];
    } finally {
      setLoading(false);
    }
  };

  const fetchAllInteractions = async () => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .order('interaction_date', { ascending: false });

      if (!error && data) {
        // Fetch deal info including logo_url for interactions that have deal_id
        const dealIds = [...new Set(data.filter(i => i.deal_id).map(i => i.deal_id))];
        let dealMap: Record<string, { project_name: string; logo_url: string | null }> = {};

        if (dealIds.length > 0) {
          const { data: dealsData } = await supabase
            .from('deals')
            .select('id, project_name, logo_url')
            .in('id', dealIds);

          if (dealsData) {
            dealMap = dealsData.reduce((acc, d) => ({
              ...acc,
              [d.id]: { project_name: d.project_name, logo_url: d.logo_url }
            }), {});
          }
        }

        const interactionsWithDeals = data.map(i => ({
          ...i,
          deal: i.deal_id ? {
            id: i.deal_id,
            project_name: dealMap[i.deal_id]?.project_name || t('Unknown'),
            logo_url: dealMap[i.deal_id]?.logo_url || null
          } : null,
        }));

        setInteractions(interactionsWithDeals as Interaction[]);
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  };

  const handleDelete = async (contactId: string) => {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);
      if (error) throw error;

      toast({ title: t('Success'), description: t('Contact deleted') });
      setSelectedContact(null);
      fetchContacts();
      fetchAllInteractions();
    } catch (error: any) {
      toast({ title: t('Error'), description: error.message, variant: 'destructive' });
    }
  };

  // Get last interaction date for each contact
  const getLastInteractionInfo = (contactId: string): { date: Date | null; daysAgo: number | null } => {
    const contactInteractions = interactions.filter(i => i.contact_id === contactId);
    if (contactInteractions.length === 0) {
      return { date: null, daysAgo: null };
    }
    const lastInteraction = contactInteractions[0]; // Already sorted by date desc
    const date = new Date(lastInteraction.interaction_date);
    const daysAgo = differenceInDays(new Date(), date);
    return { date, daysAgo };
  };

  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Type filter
      if (activeType !== 'all' && contact.contact_type !== activeType) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const searchFields = [
          contact.name,
          contact.company,
          contact.email,
          contact.notes,
          ...(contact.tags || []),
        ].filter(Boolean).map(f => f!.toLowerCase());

        // Also search in interactions
        const contactInteractions = interactions.filter(i => i.contact_id === contact.id);
        contactInteractions.forEach(i => {
          if (i.notes) searchFields.push(i.notes.toLowerCase());
        });

        return searchFields.some(f => f.includes(query));
      }

      return true;
    });
  }, [contacts, interactions, activeType, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-5">
      <PageSectionHeader
        title={t("Access")}
        subtitle={t("Navigate your professional network")}
        actions={(
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-xs hover:shadow-sm transition-all duration-200 ease-out"
            onClick={() => {
              setEditingContact(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-3 w-3 mr-1" />
            {t("New Contact")}
          </Button>
        )}
      />

      {/* Chart and Connection Map - hide on mobile for space */}
      <div className="hidden sm:grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            {t("Contact Growth (30 Days)")}
          </p>
          <div className="h-40 bg-gradient-to-br from-muted/30 to-muted/10 border border-border/40 rounded-2xl p-4 shadow-sm">
            <ContactChart contacts={contacts} />
          </div>
        </div>

        {/* Connection Map */}
        <div className="space-y-3">
          <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-widest">
            {t("Connection Network")}
          </p>
          <div className="h-40 bg-gradient-to-br from-muted/30 to-muted/10 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
            <ConnectionMap
              contacts={contacts}
              interactions={interactions}
              onContactClick={setSelectedContact}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <ContactStats contacts={contacts} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("Search contacts...")}
          className="pl-9 sm:pl-11 h-9 sm:h-11 text-sm bg-muted/20 border-border/30 rounded-xl focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:border-primary/30 transition-all"
        />
      </div>

      {/* Type Filters - horizontally scrollable on mobile */}
      <div className="flex gap-2 sm:gap-2.5 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none">
        {contactTypes.map(type => {
          const isActive = activeType === type;
          const config = type !== 'all' ? contactTypeConfig[type] : null;
          const count = type === 'all' ? contacts.length : contacts.filter(c => c.contact_type === type).length;

          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-semibold transition-colors duration-200 flex-shrink-0 border-0 ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 ${isActive
                  ? type === 'all'
                    ? 'bg-foreground text-background shadow-md'
                    : `${config?.bg} ${config?.color} shadow-sm`
                  : 'text-muted-foreground/70 hover:text-foreground hover:bg-muted/40'
                }`}
            >
              {type === 'all' ? t('All') : config ? t(config.label) : ''}
              <span className={`ml-1.5 sm:ml-2 ${isActive ? 'opacity-70' : 'opacity-40'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Contact List */}
      {loading ? (
        <div className="text-center py-16 text-muted-foreground/60">{t("Loading...")}</div>
      ) : filteredContacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-5">
            <Users className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <h2 className="text-lg font-medium mb-2 text-foreground/80" >
            {searchQuery || activeType !== 'all' ? t('No matching contacts') : t('No contacts yet')}
          </h2>
          <p className="text-sm text-muted-foreground/60 max-w-md">
            {searchQuery || activeType !== 'all'
              ? t('Try adjusting your search or filters')
              : t('Add your first contact to start building your network')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {filteredContacts.map(contact => {
            const typeConfig = contactTypeConfig[contact.contact_type];
            const contactInteractions = interactions.filter(i => i.contact_id === contact.id);
            const uniqueDealsMap = new Map<string, { id: string; project_name: string; logo_url: string | null }>();
            contactInteractions.forEach(i => {
              if (i.deal && i.deal.id && !uniqueDealsMap.has(i.deal.id)) {
                uniqueDealsMap.set(i.deal.id, {
                  id: i.deal.id,
                  project_name: i.deal.project_name,
                  logo_url: i.deal.logo_url || null
                });
              }
            });
            const uniqueDeals = Array.from(uniqueDealsMap.values());

            // Get last interaction info
            const lastInteraction = getLastInteractionInfo(contact.id);
            const isStale = lastInteraction.daysAgo !== null && lastInteraction.daysAgo > 30;

            return (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className="group relative p-5 rounded-2xl bg-muted/30 cursor-pointer transition-all duration-200 hover:bg-muted/50"
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                {/* Header: Avatar, Name, Type badge */}
                <div className="relative flex items-start gap-3.5 mb-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-sm font-semibold text-muted-foreground/80">
                      {contact.name.substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 pr-14">
                    <span className="text-sm font-semibold text-foreground tracking-tight truncate block">{contact.name}</span>
                    {(contact.role || contact.company) && (
                      <p className="text-xs text-foreground/70 truncate mt-0.5">
                        {contact.role}{contact.role && contact.company && ' @ '}{contact.company}
                      </p>
                    )}
                    {contact.email && (
                      <p className="text-[11px] text-muted-foreground/50 truncate mt-0.5">{contact.email}</p>
                    )}
                  </div>
                  {/* Type badge - top right */}
                  <span className={`absolute top-0 right-0 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ${typeConfig.bg} ${typeConfig.color}`}>
                    {typeConfig.label}
                  </span>
                </div>

                {/* Last Interaction Time */}
                <div className="relative flex items-center gap-2 mb-3 pt-3 border-t border-border/30">
                  {lastInteraction.date ? (
                    <div className={`flex items-center gap-1 text-[10px] ${isStale ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/70'}`}>
                      {isStale && <AlertCircle className="w-2.5 h-2.5" />}
                      <span>
                        {t('Last: {time}', { time: formatDistanceToNow(lastInteraction.date, { addSuffix: true }) })}
                      </span>
                      {lastInteraction.daysAgo !== null && lastInteraction.daysAgo > 0 && (
                        <span className="text-muted-foreground/40">
                          ({t('{count}d', { count: lastInteraction.daysAgo })})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-muted-foreground/40 italic">
                      {t('No interactions yet')}
                    </span>
                  )}
                </div>

                {/* Related Projects */}
                {uniqueDeals.length > 0 && (
                  <div className="mb-3 pt-3 border-t border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">{t('Related Projects')}</p>
                    <div className="flex flex-wrap gap-2">
                      {uniqueDeals.slice(0, 4).map(deal => (
                        <div
                          key={deal.id}
                          className="flex items-center gap-1.5"
                        >
                          {deal.logo_url ? (
                            <img
                              src={deal.logo_url}
                              alt={deal.project_name}
                              className="w-5 h-5 rounded-md object-cover flex-shrink-0 ring-1 ring-border/50"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <span className="text-[9px] font-semibold text-muted-foreground">
                                {deal.project_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-foreground/80 font-medium truncate max-w-[80px]">
                            {deal.project_name}
                          </span>
                        </div>
                      ))}
                      {uniqueDeals.length > 4 && (
                        <span className="text-[10px] text-muted-foreground/60 self-center ml-1">+{uniqueDeals.length - 4}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Recent Interactions */}
                {contactInteractions.length > 0 && (
                  <div className="relative pt-3 border-t border-border/30">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2">
                      {t('Interactions')}{contactInteractions.length > 2 && <span className="text-muted-foreground/40 ml-1">+{contactInteractions.length - 2}</span>}
                    </p>
                    <div className="space-y-1.5">
                      {contactInteractions.slice(0, 2).map(interaction => (
                        <p key={interaction.id} className="text-xs text-muted-foreground/70 line-clamp-1">
                          {interaction.deal && <span className="text-foreground/70 font-medium">[{interaction.deal.project_name}] </span>}
                          {interaction.notes || t('No notes')}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {contact.tags && contact.tags.length > 0 && (
                  <div className="relative flex items-center gap-1.5 mt-4 pt-3 border-t border-border/30">
                    {contact.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground/70 font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground/50">+{contact.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <ContactFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editingContact}
        onSuccess={() => {
          setFormOpen(false);
          setEditingContact(null);
          fetchContacts();
        }}
      />

      <ContactDetailCard
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onEdit={(contact) => {
          setSelectedContact(null);
          setEditingContact(contact);
          setFormOpen(true);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
};

export default AccessView;
