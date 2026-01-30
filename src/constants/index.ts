/**
 * Application-wide constants and configuration
 * Centralized location for magic strings and config objects
 */

import type { StatusConfig, ContactTypeConfig, ContactType, DealStatus } from '@/types';

// ============= API Configuration =============
export const API_CONFIG = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
} as const;

export const getEdgeFunctionUrl = (functionName: string): string => 
  `${API_CONFIG.SUPABASE_URL}/functions/v1/${functionName}`;

// ============= Deal Status Configuration =============
export const DEAL_STATUS_CONFIG: Record<DealStatus | string, StatusConfig> = {
  'Invested': { 
    bg: 'bg-emerald-500/15', 
    text: 'text-emerald-700 dark:text-emerald-400', 
    dot: 'bg-emerald-500' 
  },
  'Pass': { 
    bg: 'bg-muted', 
    text: 'text-muted-foreground', 
    dot: 'bg-muted-foreground' 
  },
  'Reject': { 
    bg: 'bg-red-500/15', 
    text: 'text-red-700 dark:text-red-400', 
    dot: 'bg-red-500' 
  },
  'Follow': { 
    bg: 'bg-blue-500/15', 
    text: 'text-blue-700 dark:text-blue-400', 
    dot: 'bg-blue-500' 
  },
  'Due Diligence': { 
    bg: 'bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-400', 
    dot: 'bg-amber-500' 
  },
  'DD': { 
    bg: 'bg-amber-500/15', 
    text: 'text-amber-700 dark:text-amber-400', 
    dot: 'bg-amber-500' 
  },
} as const;

export const getStatusConfig = (status: string | null): StatusConfig => 
  DEAL_STATUS_CONFIG[status || 'Follow'] || DEAL_STATUS_CONFIG['Follow'];

// ============= Contact Type Configuration =============
export const CONTACT_TYPE_CONFIG: Record<ContactType, ContactTypeConfig> = {
  investor: { 
    label: 'Investor', 
    color: 'text-blue-700 dark:text-blue-400', 
    bg: 'bg-blue-500/15' 
  },
  fa: { 
    label: 'FA', 
    color: 'text-purple-700 dark:text-purple-400', 
    bg: 'bg-purple-500/15' 
  },
  portco: { 
    label: 'PortCo', 
    color: 'text-emerald-700 dark:text-emerald-400', 
    bg: 'bg-emerald-500/15' 
  },
  expert: { 
    label: 'Expert', 
    color: 'text-amber-700 dark:text-amber-400', 
    bg: 'bg-amber-500/15' 
  },
} as const;

export const CONTACT_TYPES = ['all', 'investor', 'fa', 'portco', 'expert'] as const;

// ============= Time Constants =============
export const TIME_CONSTANTS = {
  SEVEN_DAYS_MS: 7 * 24 * 60 * 60 * 1000,
  FOURTEEN_DAYS_MS: 14 * 24 * 60 * 60 * 1000,
  THIRTY_DAYS_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

// ============= Query Cache Configuration =============
export const QUERY_CONFIG = {
  STALE_TIME: 1000 * 60 * 5, // 5 minutes
  GC_TIME: 1000 * 60 * 30,   // 30 minutes
} as const;

// ============= Query Keys =============
export const QUERY_KEYS = {
  // Dashboard
  DASHBOARD_CONTACTS_COUNT: 'dashboard-contacts-count',
  DASHBOARD_LAST_WEEK_CONTACTS: 'dashboard-last-week-contacts-count',
  DASHBOARD_ACTIVE_DEALS: 'dashboard-active-deals-count',
  DASHBOARD_LAST_WEEK_DEALS: 'dashboard-last-week-deals-count',
  DASHBOARD_RECENT_PROJECTS: 'dashboard-recent-projects',
  DASHBOARD_RECENT_CONTACTS: 'dashboard-recent-contacts',
  DASHBOARD_RECENT_INTERACTIONS: 'dashboard-recent-interactions',
  DASHBOARD_NOTABLE_DEALS: 'dashboard-notable-deals',
  DASHBOARD_DEAL_INTERACTIONS: 'dashboard-deal-interactions',
  
  // Core entities
  DEALS: 'deals',
  CONTACTS: 'contacts',
  INTERACTIONS: 'interactions',
} as const;
