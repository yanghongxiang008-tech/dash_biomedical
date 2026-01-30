/**
 * Notable deals section for dashboard
 */

import React from 'react';
import { Sparkles, ArrowRight, MessageSquare, Calendar } from 'lucide-react';
import { format, isAfter, subDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Deal, Interaction } from '@/types';
import { getInitials } from '@/lib/helpers';
import { useI18n } from '@/i18n';

interface InteractionWithContacts extends Interaction {
  contacts?: { id: string; name: string; company: string | null } | null;
}

interface NotableDealsProps {
  deals: Deal[];
  dealInteractions: InteractionWithContacts[];
  onDealClick: (dealId: string) => void;
  onContactClick: (contactId: string) => void;
}

export const NotableDeals: React.FC<NotableDealsProps> = ({
  deals,
  dealInteractions,
  onDealClick,
  onContactClick,
}) => {
  const { t } = useI18n();
  const sevenDaysAgo = subDays(new Date(), 7);

  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">
          {t('Notable Deals')}
        </h3>
        <span className="text-xs text-muted-foreground">
          {t('DD stage & recent additions')}
        </span>
      </div>

      {deals.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          {t('No notable deals at the moment')}
        </p>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => {
            const interactions = dealInteractions.filter(i => i.deal_id === deal.id);
            const isNew = isAfter(new Date(deal.created_at), sevenDaysAgo);

            return (
              <div
                key={deal.id}
                className="group p-4 rounded-xl bg-muted/30 hover:bg-muted/50 cursor-pointer transition-all"
                onClick={() => onDealClick(deal.id)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10 rounded-xl flex-shrink-0">
                    <AvatarImage src={deal.logo_url || ''} alt={deal.project_name} />
                    <AvatarFallback className="rounded-xl bg-muted text-muted-foreground text-xs font-semibold">
                      {getInitials(deal.project_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold group-hover:text-primary transition-colors">
                        {deal.project_name}
                      </h3>
                      {deal.status === 'DD' && (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] px-1.5 py-0">
                          DD
                        </Badge>
                      )}
                      {isNew && deal.status !== 'DD' && (
                        <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] px-1.5 py-0">
                          {t('New')}
                        </Badge>
                      )}
                    </div>
                    {deal.sector && (
                      <p className="text-xs text-muted-foreground mt-0.5">{deal.sector}</p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </div>

                {/* Interactions */}
                {interactions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                      <MessageSquare className="h-3 w-3" />
                      <span>
                        {t('{count} interactions', { count: interactions.length })}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {interactions.slice(0, 2).map((interaction) => (
                        <div
                          key={interaction.id}
                          className="text-xs p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (interaction.contacts?.id) {
                              onContactClick(interaction.contacts.id);
                            }
                          }}
                        >
                          {interaction.notes && (
                            <p className="text-foreground/80 line-clamp-1 mb-1">
                              {interaction.notes}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-medium">{interaction.contacts?.name}</span>
                            <span className="flex items-center gap-1 ml-auto">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(interaction.interaction_date), 'MMM d')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
