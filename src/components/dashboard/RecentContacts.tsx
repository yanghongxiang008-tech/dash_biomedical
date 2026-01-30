/**
 * Recent contacts section for dashboard
 * Shows name, role @ company format with more depth
 * Enhanced empty state with guidance
 */

import React from 'react';
import { Users, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Contact } from '@/types';
import { getInitials } from '@/lib/helpers';
import { useI18n } from '@/i18n';

interface RecentContactsProps {
  contacts: Contact[];
  onContactClick: (contactId: string) => void;
}

export const RecentContacts: React.FC<RecentContactsProps> = ({
  contacts,
  onContactClick,
}) => {
  const { t } = useI18n();
  // Format role and company display
  const formatRoleCompany = (contact: Contact) => {
    const parts: string[] = [];
    if (contact.role) parts.push(contact.role);
    if (contact.company) parts.push(contact.company);
    
    if (parts.length === 2) {
      return `${parts[0]} @ ${parts[1]}`;
    }
    return parts[0] || null;
  };

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          {t('New Contacts')}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {contacts.length}
        </span>
      </div>
      
      <ScrollArea className="h-52">
        <div className="space-y-2 pr-2">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-muted/20 border border-dashed border-border/50">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('No new contacts this week')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                {t('Add a contact in Access to see it here')}
              </p>
            </div>
          ) : (
            contacts.map((contact) => {
              const roleCompany = formatRoleCompany(contact);
              return (
                <div
                  key={contact.id}
                  className="group flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
                  onClick={() => onContactClick(contact.id)}
                >
                  <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs font-medium">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {contact.name}
                    </p>
                    {roleCompany && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {roleCompany}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
