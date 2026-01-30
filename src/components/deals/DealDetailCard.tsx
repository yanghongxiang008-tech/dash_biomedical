import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  ExternalLink, Pencil, Trash2, MapPin, Users, Building2, 
  DollarSign, FileText, Lightbulb, Calendar, Tag, FolderOpen,
  Brain, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import type { Deal } from './DealFlowTracker';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useI18n } from '@/i18n';
import { contactTypeConfig } from '@/components/access/types';

interface Contact {
  id: string;
  name: string;
  role: string | null;
  company: string | null;
  contact_type: string;
}

interface DealAnalysis {
  id: string;
  title: string;
  analysis_type: string;
  created_at: string;
}

interface DealDetailCardProps {
  deal: Deal | null;
  onClose: () => void;
  onEdit: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  'Invested': { bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  'Pass': { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground' },
  'Follow': { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-400', dot: 'bg-blue-500' },
  'Due Diligence': { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
};

const InfoItem = ({ icon: Icon, label, value, className = '' }: { 
  icon?: React.ElementType; 
  label: string; 
  value: string | null | undefined;
  className?: string;
}) => {
  if (!value) return null;
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </div>
      <p className="text-sm">{value}</p>
    </div>
  );
};

// Get initials from project name
const getInitials = (name: string) => {
  return name.substring(0, 2).toUpperCase();
};

const DealDetailCard: React.FC<DealDetailCardProps> = ({ deal, onClose, onEdit, onDelete }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [confirmDeleteAnalysis, setConfirmDeleteAnalysis] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<DealAnalysis[]>([]);
  const [keyContacts, setKeyContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (deal?.id) {
      fetchAnalyses(deal.id);
      fetchKeyContacts(deal.key_contacts);
    }
  }, [deal?.id, deal?.key_contacts]);

  const fetchAnalyses = async (dealId: string) => {
    try {
      const { data, error } = await supabase
        .from('deal_analyses')
        .select('id, title, analysis_type, created_at')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error && data) {
        setAnalyses(data);
      }
    } catch (error) {
      console.error('Error fetching analyses:', error);
    }
  };

  const fetchKeyContacts = async (keyContactsJson: string | null) => {
    if (!keyContactsJson) {
      setKeyContacts([]);
      return;
    }
    try {
      const contactIds = JSON.parse(keyContactsJson);
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        setKeyContacts([]);
        return;
      }
      const { data } = await supabase
        .from('contacts')
        .select('id, name, role, company, contact_type')
        .in('id', contactIds);
      if (data) setKeyContacts(data);
    } catch {
      setKeyContacts([]);
    }
  };

  const deleteAnalysis = async (analysisId: string) => {
    try {
      const { error } = await supabase
        .from('deal_analyses')
        .delete()
        .eq('id', analysisId);
      
      if (!error) {
        setAnalyses(prev => prev.filter(a => a.id !== analysisId));
      }
    } catch (error) {
      console.error('Error deleting analysis:', error);
    }
  };

  if (!deal) return null;

  const status = statusConfig[deal.status || 'Follow'] || statusConfig['Follow'];
  const getStatusLabel = (status?: string | null) => {
    if (!status) return '';
    if (status === 'Due Diligence' || status === 'DD') return t('DD');
    return t(status);
  };

  const getContactTypeLabel = (type: string) => {
    const config = contactTypeConfig[type];
    return config ? t(config.label) : t('Other');
  };

  return (
    <>
      <Dialog open={!!deal} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
          {/* Header */}
          <div className="p-5 pb-4 border-b border-border">
            <div className="flex items-start gap-3">
              {deal.logo_url ? (
                <img 
                  src={deal.logo_url} 
                  alt={deal.project_name}
                  className="w-12 h-12 rounded-lg object-contain bg-white border border-border flex-shrink-0"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-sm font-semibold text-muted-foreground ${deal.logo_url ? 'hidden' : ''}`}>
                {getInitials(deal.project_name)}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-medium truncate" >{deal.project_name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {deal.status && (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`}></span>
                      {getStatusLabel(deal.status)}
                    </div>
                  )}
                  {deal.deal_date && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(deal.deal_date), 'MMM d, yyyy')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-4">
              {deal.folder_link && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
                  onClick={() => window.open(deal.folder_link!, '_blank')}
               >
                  <FolderOpen className="w-3.5 h-3.5" />
                  {t('Open Folder')}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs gap-1.5"
                onClick={() => onEdit(deal)}
             >
                <Pencil className="w-3.5 h-3.5" />
                {t('Edit')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={() => setConfirmDelete(true)}
             >
                <Trash2 className="w-3.5 h-3.5" />
                {t('Delete')}
              </Button>
            </div>
          </div>

          {/* Content - Show ALL fields */}
          <div className="overflow-y-auto p-5 space-y-5 max-h-[calc(85vh-180px)]">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 border-l-2 border-primary">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Amount')}</p>
                <p className="text-sm font-semibold mt-0.5">{deal.funding_amount || '-'}</p>
              </div>
              <div className="p-3 border-l-2 border-muted-foreground/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Valuation')}</p>
                <p className="text-sm font-semibold mt-0.5">{deal.valuation_terms || '-'}</p>
              </div>
              <div className="p-3 border-l-2 border-muted-foreground/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Round')}</p>
                <p className="text-sm font-semibold mt-0.5">{deal.funding_round || '-'}</p>
              </div>
              <div className="p-3 border-l-2 border-muted-foreground/30">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Sector')}</p>
                <p className="text-sm font-semibold mt-0.5">{deal.sector || '-'}</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="w-3.5 h-3.5" />
                {t('Description')}
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">{deal.description || t('No description provided')}</p>
            </div>

            {/* Overview Grid - Show all fields */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <MapPin className="w-3 h-3" />
                  {t('HQ Location')}
                </div>
                <p className="text-sm">{deal.hq_location || '-'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Users className="w-3 h-3" />
                  {t('Key Contacts')}
                </div>
                {keyContacts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {keyContacts.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          onClose();
                          navigate('/private', { state: { openContactId: contact.id, activeTab: 'access' } });
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50 border border-border/50 text-xs hover:bg-muted hover:border-primary/30 transition-colors"
                     >
                        <span className="font-medium">{contact.name}</span>
                        {contact.role && contact.company && (
                          <span className="text-muted-foreground">
                            ({contact.role} @ {contact.company})
                          </span>
                        )}
                        <span className="text-[9px] px-1 py-0.5 rounded bg-background text-muted-foreground">
                          {getContactTypeLabel(contact.contact_type)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm">-</p>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Building2 className="w-3 h-3" />
                  {t('BU Category')}
                </div>
                <p className="text-sm">{deal.bu_category || '-'}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  <Tag className="w-3 h-3" />
                  {t('Source')}
                </div>
                <p className="text-sm">{deal.source || '-'}</p>
              </div>
            </div>

            {/* Financials */}
            <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <DollarSign className="w-3.5 h-3.5" />
                {t('Financials')}
              </div>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{deal.financials || t('No financial data provided')}</p>
            </div>

            {/* Related Parties */}
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                {t('Related Parties')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Leads')}</p>
                  <p className="text-sm">{deal.leads || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Benchmark')}</p>
                  <p className="text-sm">{deal.benchmark_companies || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Followers')}</p>
                  <p className="text-sm">{deal.followers || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Pre-Investors')}</p>
                  <p className="text-sm">{deal.pre_investors || '-'}</p>
                </div>
              </div>
            </div>

            {/* Intelligence - Internal Notes & AI Analyses */}
            <div className="space-y-4 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lightbulb className="w-3.5 h-3.5" />
                {t('Intelligence')}
              </div>
              
              {/* Internal Notes */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('Internal Notes')}</p>
                {deal.feedback_notes ? (
                  <div className="bg-muted/50 rounded-lg p-3 border border-border">
                    <p className="text-sm whitespace-pre-wrap">{deal.feedback_notes}</p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('No internal notes')}</p>
                )}
              </div>

              {/* AI Analyses */}
              {analyses.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{t('AI Analyses')}</p>
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium px-1.5 py-0.5 rounded bg-primary/5">{t('AI Generated')}</span>
                  </div>
                  <div className="rounded-lg bg-gradient-to-br from-primary/5 via-primary/3 to-transparent border border-primary/10 p-3 space-y-1.5">
                    {analyses.map(analysis => (
                      <div
                        key={analysis.id}
                        className="flex items-center gap-2 p-2 rounded-md hover:bg-background/60 transition-colors group"
                     >
                        <button
                          onClick={() => {
                            onClose();
                            navigate(`/private/analysis/${analysis.id}`, { state: { from: 'deal-detail', dealId: deal.id } });
                          }}
                          className="flex-1 text-left flex items-center justify-between min-w-0"
                       >
                          <div className="min-w-0">
                            <span className="text-xs font-medium">{analysis.title}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              {format(new Date(analysis.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteAnalysis(analysis.id)}
                          className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                       >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Folder Link */}
            {deal.folder_link && (
              <div className="space-y-2 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ExternalLink className="w-3.5 h-3.5" />
                {t('Folder Link')}
              </div>
              <a 
                href={deal.folder_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
               >
                  {deal.folder_link}
                </a>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('Delete Deal')}
        description={t('Are you sure you want to delete "{name}"? This action cannot be undone.', { name: deal.project_name })}
        confirmText={t('Delete')}
        onConfirm={() => {
          onDelete(deal.id);
          setConfirmDelete(false);
        }}
      />

      <ConfirmDialog
        open={!!confirmDeleteAnalysis}
        onOpenChange={(open) => !open && setConfirmDeleteAnalysis(null)}
        title={t('Delete Analysis')}
        description={t('Are you sure you want to delete this analysis? This action cannot be undone.')}
        confirmText={t('Delete')}
        onConfirm={() => {
          if (confirmDeleteAnalysis) {
            deleteAnalysis(confirmDeleteAnalysis);
            setConfirmDeleteAnalysis(null);
          }
        }}
      />
    </>
  );
};

export default DealDetailCard;
