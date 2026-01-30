export interface Contact {
  id: string;
  name: string;
  company: string | null;
  role: string | null;
  contact_type: 'investor' | 'fa' | 'portco' | 'expert';
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
    logo_url?: string | null;
  } | null;
}

export const contactTypeConfig: Record<string, { label: string; color: string; bg: string }> = {
  investor: { label: 'Investor', color: 'text-contact-investor', bg: 'bg-contact-investor/15' },
  fa: { label: 'FA', color: 'text-contact-fa', bg: 'bg-contact-fa/15' },
  portco: { label: 'PortCo', color: 'text-contact-portco', bg: 'bg-contact-portco/15' },
  expert: { label: 'Expert', color: 'text-contact-expert', bg: 'bg-contact-expert/15' },
};
