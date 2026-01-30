/**
 * Recent interactions section for dashboard
 * More layered design with better visual hierarchy
 * Enhanced empty state with guidance
 */

import React from 'react';
import { MessageSquare, ArrowUpRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { Interaction } from '@/types';
import { getInitials } from '@/lib/helpers';
import { useI18n } from '@/i18n';

interface InteractionWithDetails extends Interaction {
  contacts?: { id: string; name: string; company: string | null } | null;
  deals?: { id: string; project_name: string } | null;
}

interface RecentInteractionsProps {
  interactions: InteractionWithDetails[];
  onContactClick: (contactId: string) => void;
}

export const RecentInteractions: React.FC<RecentInteractionsProps> = ({
  interactions,
  onContactClick,
}) => {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          {t('Recent Interactions')}
        </h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {interactions.length}
        </span>
      </div>
      
      <ScrollArea className="h-64">
        <div className="space-y-3 pr-2">
          {interactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 rounded-xl bg-muted/20 border border-dashed border-border/50">
              <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t('No interactions this week')}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1 text-center">
                {t('Log an interaction with a contact to track your activity')}
              </p>
            </div>
          ) : (
            interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="group p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => interaction.contacts?.id && onContactClick(interaction.contacts.id)}
              >
                {/* Header with contact info */}
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8 ring-2 ring-background shadow-sm">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-violet-600 text-white text-[10px] font-medium">
                      {interaction.contacts?.name ? getInitials(interaction.contacts.name) : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {interaction.contacts?.name || t('Unknown')}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(interaction.interaction_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
                
                {/* Notes */}
                {interaction.notes && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-2 pl-11">
                    {interaction.notes}
                  </p>
                )}
                
                {/* Related project badge */}
                {interaction.deals?.project_name && (
                  <div className="pl-11">
                    <span className="inline-flex items-center text-[10px] font-medium text-primary/80 bg-primary/5 px-2 py-0.5 rounded-full">
                      {interaction.deals.project_name}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
