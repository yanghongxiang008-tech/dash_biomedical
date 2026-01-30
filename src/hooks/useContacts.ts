/**
 * Custom hook for fetching and managing contacts data
 * Centralizes contact-related data fetching logic
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Contact, Interaction } from '@/types';

export const useContacts = () => {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchContacts = useCallback(async (): Promise<Contact[]> => {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const contactsList = (data || []) as Contact[];
      setContacts(contactsList);
      return contactsList;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch contacts';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchInteractions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('interactions')
        .select('*')
        .order('interaction_date', { ascending: false });

      if (error || !data) return;

      // Fetch deal names for interactions with deal_id
      const dealIds = [...new Set(data.filter(i => i.deal_id).map(i => i.deal_id))] as string[];
      let dealMap: Record<string, string> = {};

      if (dealIds.length > 0) {
        const { data: dealsData } = await supabase
          .from('deals')
          .select('id, project_name')
          .in('id', dealIds);

        if (dealsData) {
          dealMap = dealsData.reduce(
            (acc, d) => ({ ...acc, [d.id]: d.project_name }),
            {} as Record<string, string>
          );
        }
      }

      const interactionsWithDeals = data.map(i => ({
        ...i,
        deal: i.deal_id 
          ? { id: i.deal_id, project_name: dealMap[i.deal_id] || 'Unknown' } 
          : null,
      }));

      setInteractions(interactionsWithDeals as Interaction[]);
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  }, []);

  const deleteContact = useCallback(async (contactId: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', contactId);
      if (error) throw error;
      
      toast({ title: 'Success', description: 'Contact deleted' });
      await Promise.all([fetchContacts(), fetchInteractions()]);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete contact';
      toast({ title: 'Error', description: message, variant: 'destructive' });
      return false;
    }
  }, [fetchContacts, fetchInteractions, toast]);

  const refreshData = useCallback(async () => {
    await Promise.all([fetchContacts(), fetchInteractions()]);
  }, [fetchContacts, fetchInteractions]);

  // Initial fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    contacts,
    interactions,
    isLoading,
    deleteContact,
    refreshData,
    fetchContacts,
  };
};

/**
 * Hook for filtered contacts
 */
export const useFilteredContacts = (
  contacts: Contact[],
  interactions: Interaction[],
  filters: { searchQuery: string; activeType: string }
) => {
  const { searchQuery, activeType } = filters;

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
        ]
          .filter(Boolean)
          .map(f => f!.toLowerCase());

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

  return filteredContacts;
};
