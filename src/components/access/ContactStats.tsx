import React, { useMemo } from 'react';
import type { Contact } from './types';
import { contactTypeConfig } from './types';
import { TrendingUp, Users } from 'lucide-react';
import { useI18n } from '@/i18n';

interface ContactStatsProps {
  contacts: Contact[];
}

const ContactStats: React.FC<ContactStatsProps> = ({ contacts }) => {
  const { t } = useI18n();
  const stats = useMemo(() => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    
    const ytdContacts = contacts.filter(c => new Date(c.created_at) >= startOfYear);
    
    const byType = {
      investor: contacts.filter(c => c.contact_type === 'investor').length,
      fa: contacts.filter(c => c.contact_type === 'fa').length,
      portco: contacts.filter(c => c.contact_type === 'portco').length,
      expert: contacts.filter(c => c.contact_type === 'expert').length,
    };
    
    // Calculate last year same period for comparison
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearSameDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const lastYearContacts = contacts.filter(c => {
      const date = new Date(c.created_at);
      return date >= lastYearStart && date <= lastYearSameDate;
    });
    
    const growth = lastYearContacts.length > 0 
      ? ((ytdContacts.length - lastYearContacts.length) / lastYearContacts.length * 100).toFixed(0)
      : ytdContacts.length > 0 ? '+100' : '0';
    
    return {
      total: contacts.length,
      ytd: ytdContacts.length,
      growth,
      byType,
    };
  }, [contacts]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-0 divide-x divide-border/50">
      {/* Total */}
      <div className="p-3 pl-0 first:pl-0">
        <span className="text-xs text-muted-foreground/70 font-medium">{t('Total')}</span>
        <p className="text-xl font-light text-foreground mt-0.5">{stats.total}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
            {t('+{count} YTD', { count: stats.ytd })}
          </span>
        </div>
      </div>
      
      {/* By Type */}
      {Object.entries(contactTypeConfig).map(([type, config]) => {
        const count = stats.byType[type as keyof typeof stats.byType];
        return (
          <div key={type} className="p-3">
            <span className={`text-xs font-medium ${config.color}`}>
              {t(config.label)}
            </span>
            <p className="text-xl font-light text-foreground mt-0.5">{count}</p>
          </div>
        );
      })}
    </div>
  );
};

export default ContactStats;
