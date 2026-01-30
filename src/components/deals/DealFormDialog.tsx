import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, DollarSign, Lightbulb, Upload, Building2, Loader2 } from 'lucide-react';
import type { Deal } from './DealFlowTracker';
import ContactSelector from './ContactSelector';
import { useI18n } from '@/i18n';

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deal?: Deal | null;
  onSuccess: () => void;
}

const statusOptions = ['Follow', 'Due Diligence', 'Invested', 'Pass'];
const roundOptions = ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Series C', 'Series D+', 'Growth'];
const buCategoryOptions = ['Seed', 'Venture', 'Growth'];

// Try to fetch company logo from Clearbit
const fetchCompanyLogo = async (companyName: string): Promise<string | null> => {
  try {
    // Clean company name and create domain guess
    const cleanName = companyName.toLowerCase()
      .replace(/\s+(ai|inc|corp|ltd|llc|co|company|technologies|tech)\.?$/i, '')
      .replace(/\s+/g, '')
      .trim();
    
    // Try common domain patterns
    const domains = [
      `${cleanName}.com`,
      `${cleanName}.ai`,
      `${cleanName}.io`,
      `get${cleanName}.com`,
      `${cleanName}app.com`,
    ];
    
    for (const domain of domains) {
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      try {
        const response = await fetch(logoUrl, { method: 'HEAD' });
        if (response.ok) {
          return logoUrl;
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
};

// Get initials from project name
const getInitials = (name: string) => {
  return name.substring(0, 2).toUpperCase();
};

const DealFormDialog: React.FC<DealFormDialogProps> = ({ open, onOpenChange, deal, onSuccess }) => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fetchingLogo, setFetchingLogo] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoAreaRef = useRef<HTMLDivElement>(null);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    project_name: '',
    hq_location: '',
    sector: '',
    funding_round: '',
    funding_amount: '',
    valuation_terms: '',
    source: '',
    bu_category: '',
    description: '',
    benchmark_companies: '',
    followers: '',
    status: 'Follow',
    feedback_notes: '',
    financials: '',
    deal_date: '',
    leads: '',
    folder_link: '',
    key_contacts: '',
    pre_investors: '',
    logo_url: '',
  });

  useEffect(() => {
    if (deal) {
      setFormData({
        project_name: deal.project_name || '',
        hq_location: deal.hq_location || '',
        sector: deal.sector || '',
        funding_round: deal.funding_round || '',
        funding_amount: deal.funding_amount || '',
        valuation_terms: deal.valuation_terms || '',
        source: deal.source || '',
        bu_category: deal.bu_category || '',
        description: deal.description || '',
        benchmark_companies: deal.benchmark_companies || '',
        followers: deal.followers || '',
        status: deal.status || 'Follow',
        feedback_notes: deal.feedback_notes || '',
        financials: deal.financials || '',
        deal_date: deal.deal_date || '',
        leads: deal.leads || '',
        folder_link: deal.folder_link || '',
        key_contacts: deal.key_contacts || '',
        pre_investors: deal.pre_investors || '',
        logo_url: deal.logo_url || '',
      });
      // Parse contact IDs from key_contacts if stored as JSON array
      try {
        const parsed = JSON.parse(deal.key_contacts || '[]');
        if (Array.isArray(parsed)) {
          setSelectedContactIds(parsed);
        } else {
          setSelectedContactIds([]);
        }
      } catch {
        setSelectedContactIds([]);
      }
    } else {
      setFormData({
        project_name: '',
        hq_location: '',
        sector: '',
        funding_round: '',
        funding_amount: '',
        valuation_terms: '',
        source: '',
        bu_category: '',
        description: '',
        benchmark_companies: '',
        followers: '',
        status: 'Follow',
        feedback_notes: '',
        financials: '',
        deal_date: '',
        leads: '',
        folder_link: '',
        key_contacts: '',
        pre_investors: '',
        logo_url: '',
      });
      setSelectedContactIds([]);
    }
    setActiveTab('basic');
  }, [deal, open]);

  const handleChange = (field: string, value: string) => {
    // Auto-clean Notion links by removing ?source=copy_link
    if (field === 'folder_link' && value.includes('?source=copy_link')) {
      value = value.replace(/\?source=copy_link.*$/, '');
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFetchLogo = async () => {
    if (!formData.project_name.trim()) {
      toast({
        title: t('Enter project name first'),
        description: t('We need the company name to search for logo'),
        variant: 'destructive',
      });
      return;
    }

    setFetchingLogo(true);
    try {
      const logoUrl = await fetchCompanyLogo(formData.project_name);
      if (logoUrl) {
        setFormData(prev => ({ ...prev, logo_url: logoUrl }));
        toast({ title: t('Logo found'), description: t('Company logo was found and added') });
      } else {
        toast({ 
          title: t('Logo not found'), 
          description: t('Could not find logo automatically. You can upload manually.'),
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({ 
        title: t('Error'), 
        description: t('Failed to fetch logo'),
        variant: 'destructive',
      });
    } finally {
      setFetchingLogo(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ title: t('Invalid file'), description: t('Please paste an image file'), variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setFormData(prev => ({ ...prev, logo_url: base64 }));
      toast({ title: t('Logo uploaded'), description: t('Logo has been added') });
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) processImageFile(file);
        return;
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_name.trim()) {
      toast({
        title: t('Error'),
        description: t('Project name is required'),
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: t('Error'), description: t('You must be logged in'), variant: 'destructive' });
        return;
      }

      const payload = {
        ...formData,
        deal_date: formData.deal_date || null,
        logo_url: formData.logo_url || null,
        key_contacts: selectedContactIds.length > 0 ? JSON.stringify(selectedContactIds) : null,
      };

      let dealId: string;
      let previousContactIds: string[] = [];

      if (deal) {
        // Get previous contact IDs for comparison
        try {
          previousContactIds = JSON.parse(deal.key_contacts || '[]');
        } catch { previousContactIds = []; }

        const { error } = await supabase
          .from('deals')
          .update(payload)
          .eq('id', deal.id);
        if (error) throw error;
        dealId = deal.id;
        toast({ title: t('Success'), description: t('Project updated successfully') });
      } else {
        // Try to fetch logo if not provided
        if (!payload.logo_url && formData.project_name) {
          const logoUrl = await fetchCompanyLogo(formData.project_name);
          if (logoUrl) {
            payload.logo_url = logoUrl;
          }
        }
        
        const { data, error } = await supabase.from('deals').insert([{ ...payload, user_id: user.id }]).select().single();
        if (error) throw error;
        dealId = data.id;
        toast({ title: t('Success'), description: t('Project created successfully') });
      }

      // Create interactions for newly added contacts (bidirectional link)
      const newContactIds = selectedContactIds.filter(id => !previousContactIds.includes(id));
      if (newContactIds.length > 0) {
        const interactionsToCreate = newContactIds.map(contactId => ({
          contact_id: contactId,
          deal_id: dealId,
          interaction_date: new Date().toISOString(),
          notes: t('Initiated interaction automatically (linked from project)'),
          user_id: user.id,
        }));
        
        await supabase.from('interactions').insert(interactionsToCreate);
      }

      onSuccess();
    } catch (error: any) {
      toast({
        title: t('Error'),
        description: error.message || t('Failed to save project'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Due Diligence' || status === 'DD') return t('DD');
    return t(status);
  };

  const tabs = [
    { id: 'basic', label: t('Basic'), icon: FileText },
    { id: 'terms', label: t('Terms'), icon: DollarSign },
    { id: 'analysis', label: t('Related Parties'), icon: Lightbulb },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-xl max-h-[85vh] p-0 gap-0 flex flex-col"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
     >
        {/* Header */}
        <div className="flex items-center p-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-medium" >
            {deal ? t('Edit Project') : t('New Project')}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-2 border-b border-border flex-shrink-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  activeTab === tab.id 
                    ? 'bg-muted text-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
             >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="overflow-y-auto p-4 flex-1 min-h-0">
            {/* Basic Info */}
            {activeTab === 'basic' && (
              <div className="space-y-4">
                {/* Logo Section */}
                <div 
                  ref={logoAreaRef}
                  onPaste={handlePaste}
                  className="flex items-start gap-4 p-3 border border-border rounded-lg focus-within:ring-2 focus-within:ring-primary/20 cursor-pointer"
                  tabIndex={0}
                  title={t('Click and paste (Ctrl+V) to add logo')}
               >
                  <div className="flex-shrink-0">
                    {formData.logo_url ? (
                      <img 
                        src={formData.logo_url} 
                        alt={t('Logo')}
                        className="w-14 h-14 rounded-lg object-contain bg-white border border-border"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {formData.project_name ? getInitials(formData.project_name) : <Building2 className="w-6 h-6" />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs font-medium">
                      {t('Company Logo')}{' '}
                      <span className="text-muted-foreground font-normal">{t('(or Ctrl+V to paste)')}</span>
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleFetchLogo}
                        disabled={fetchingLogo}
                     >
                        {fetchingLogo ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : null}
                        {t('Auto-fetch')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        <Upload className="w-3 h-3 mr-1" />
                        {t('Upload')}
                      </Button>
                      {formData.logo_url && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() => handleChange('logo_url', '')}
                       >
                          {t('Remove')}
                        </Button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Project Name')} *</Label>
                    <Input
                      value={formData.project_name}
                      onChange={(e) => handleChange('project_name', e.target.value)}
                      placeholder={t('Enter name')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Status')}</Label>
                    <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {statusOptions.map(s => (
                          <SelectItem key={s} value={s}>{getStatusLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('HQ Location')}</Label>
                    <Input
                      value={formData.hq_location}
                      onChange={(e) => handleChange('hq_location', e.target.value)}
                      placeholder={t('e.g., San Francisco')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Sector')}</Label>
                    <Input
                      value={formData.sector}
                      onChange={(e) => handleChange('sector', e.target.value)}
                      placeholder={t('e.g., AI, Fintech')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Deal Date')}</Label>
                    <Input
                      type="date"
                      value={formData.deal_date}
                      onChange={(e) => handleChange('deal_date', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <ContactSelector
                  selectedContactIds={selectedContactIds}
                  onChange={setSelectedContactIds}
                />
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Description')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    placeholder={t('Brief description')}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Folder Link')}</Label>
                  <Input
                    value={formData.folder_link}
                    onChange={(e) => handleChange('folder_link', e.target.value)}
                    placeholder={t('Notion share link (without ?source=copy_link)')}
                    className="h-8 text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("Use Notion page's share link. The")} <span className="font-mono bg-muted px-1 rounded">?source=copy_link</span> {t('part will be auto-removed.')}
                  </p>
                </div>
              </div>
            )}

            {/* Deal Terms */}
            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Funding Round')}</Label>
                    <Select value={formData.funding_round} onValueChange={(v) => handleChange('funding_round', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select')} />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {roundOptions.map(r => (
                          <SelectItem key={r} value={r}>{t(r)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Funding Amount')}</Label>
                    <Input
                      value={formData.funding_amount}
                      onChange={(e) => handleChange('funding_amount', e.target.value)}
                      placeholder={t('e.g., $5M')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Valuation')}</Label>
                    <Input
                      value={formData.valuation_terms}
                      onChange={(e) => handleChange('valuation_terms', e.target.value)}
                      placeholder={t('e.g., $20M pre')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('BU Category')}</Label>
                    <Select value={formData.bu_category} onValueChange={(v) => handleChange('bu_category', v)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select')} />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        {buCategoryOptions.map(b => (
                          <SelectItem key={b} value={b}>{t(b)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Financials')}</Label>
                  <Textarea
                    value={formData.financials}
                    onChange={(e) => handleChange('financials', e.target.value)}
                    placeholder={t('Revenue, MRR, metrics...')}
                    rows={2}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Pre-Investors')}</Label>
                  <Input
                    value={formData.pre_investors}
                    onChange={(e) => handleChange('pre_investors', e.target.value)}
                    placeholder={t('Previous investors')}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            {/* Analysis */}
            {activeTab === 'analysis' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Source')}</Label>
                    <Input
                      value={formData.source}
                      onChange={(e) => handleChange('source', e.target.value)}
                      placeholder={t('How found?')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Leads')}</Label>
                    <Input
                      value={formData.leads}
                      onChange={(e) => handleChange('leads', e.target.value)}
                      placeholder={t('Who introduced?')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Benchmark')}</Label>
                    <Input
                      value={formData.benchmark_companies}
                      onChange={(e) => handleChange('benchmark_companies', e.target.value)}
                      placeholder={t('Comparable companies')}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t('Co-investors')}</Label>
                    <Input
                      value={formData.followers}
                      onChange={(e) => handleChange('followers', e.target.value)}
                      placeholder={t('Other investors')}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t('Internal Notes')}</Label>
                  <Textarea
                    value={formData.feedback_notes}
                    onChange={(e) => handleChange('feedback_notes', e.target.value)}
                    placeholder={t('Team feedback, concerns...')}
                    rows={3}
                    className="text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer - Always visible */}
          <div className="flex justify-end gap-2 p-4 border-t border-border flex-shrink-0 bg-background">
            <Button 
              type="button" 
              variant="ghost" 
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => onOpenChange(false)}
           >
              {t('Cancel')}
            </Button>
            <Button type="submit" size="sm" className="h-8 px-4 text-xs" disabled={loading}>
              {loading ? t('Saving...') : deal ? t('Update') : t('Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DealFormDialog;
