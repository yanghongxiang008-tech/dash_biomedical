/**
 * Centralized type definitions for the application
 * All shared types should be defined here to ensure consistency
 */

// Re-export database types for convenience
export type { Database, Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

// ============= Deal Types =============
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

export type DealStatus = 'Invested' | 'Pass' | 'Reject' | 'Follow' | 'Due Diligence' | 'DD';

// ============= Contact Types =============
export type ContactType = 'investor' | 'fa' | 'portco' | 'expert';

export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  contact_type: ContactType;
  email: string | null;
  tags: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Interaction {
  id: string;
  contact_id: string;
  deal_id: string | null;
  interaction_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deal?: {
    id: string;
    project_name: string;
  } | null;
}

// ============= Chat Types =============
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  isThinking?: boolean;
}

export interface ConnectionStatus {
  hasDatabase: boolean;
  hasNotion: boolean;
  hasWeb: boolean;
}

// ============= Navigation Types =============
export type PrivateTab = 'home' | 'dashboard' | 'projects' | 'access' | 'analysis';
export type MarketType = 'public' | 'private';

// ============= UI Config Types =============
export interface StatusConfig {
  bg: string;
  text: string;
  dot: string;
}

export interface ContactTypeConfig {
  label: string;
  color: string;
  bg: string;
}
