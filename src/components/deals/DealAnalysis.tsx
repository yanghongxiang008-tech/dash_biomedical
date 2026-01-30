import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  FileText,
  Sparkles,
  ClipboardList,
  Map,
  FileEdit,
  Loader2,
  Check,
  X,
  Copy,
  Download,
  Save,
  Link2,
  Link2Off,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  Wand2,
  FileOutput,
  CheckCircle2,
  AlertCircle,
  Brain,
  Trash2,
  Search
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageSectionHeader from '@/components/PageSectionHeader';
import { useI18n } from '@/i18n';

interface Deal {
  id: string;
  project_name: string;
  folder_link: string | null;
  sector: string | null;
  status: string | null;
  logo_url?: string | null;
}

interface AnalysisResult {
  id?: string;
  content: string;
  notionConnected: boolean;
  dealName: string;
  analysisType: string;
  title: string;
  inputData: Record<string, any>;
  savedAt?: string;
}

const analysisTypeConfigs = [
  {
    id: 'interview_outline',
    label: 'Interview Outline',
    icon: ClipboardList,
    description: 'Generate interview outline for due diligence'
  },
  {
    id: 'investment_highlights',
    label: 'Investment Highlights',
    icon: Sparkles,
    description: 'Summarize key investment highlights'
  },
  {
    id: 'ic_memo',
    label: 'IC Memo Draft',
    icon: FileEdit,
    description: 'Draft sections of IC memo'
  },
  {
    id: 'industry_mapping',
    label: 'Industry Mapping',
    icon: Map,
    description: 'Create industry landscape mapping'
  },
  {
    id: 'notes_summary',
    label: 'Notes Summary',
    icon: FileText,
    description: 'Organize and summarize meeting notes'
  },
];

const icMemoSections = [
  'Executive Summary',
  'Industry Overview',
  'Company Overview',
  'Business Model',
  'Competitive Analysis',
  'Financial Analysis',
  'Management Team',
  'Investment Thesis',
  'Risk Factors',
  'Valuation',
];

const stepConfigs = [
  { id: 1, label: 'Select Project', icon: Building2 },
  { id: 2, label: 'Choose Analysis', icon: Wand2 },
  { id: 3, label: 'Confirm', icon: CheckCircle2 },
  { id: 4, label: 'Results', icon: FileOutput },
];

// Thinking indicator component for generation
const ThinkingIndicator = ({ thinkingContent, isOpen, onOpenChange }: {
  thinkingContent?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={onOpenChange}>
        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <div className="relative">
            <Brain className="w-4 h-4 text-primary" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
          </div>
          <span className="font-medium">{t('Analyzing...')}</span>
          {thinkingContent && (
            isOpen ? <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" /> : <ChevronRight className="w-3 h-3 opacity-50 group-hover:opacity-100" />
          )}
        </CollapsibleTrigger>
        {thinkingContent && (
          <CollapsibleContent>
            <div className="mt-2 pl-5 text-xs text-muted-foreground/80 border-l border-primary/30 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed">
              {thinkingContent}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

const DealAnalysis = () => {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0); // Start at 0 for start screen
  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notionStatus, setNotionStatus] = useState<'unchecked' | 'checking' | 'connected' | 'disconnected'>('unchecked');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<AnalysisResult[]>([]);
  const [allRecentAnalyses, setAllRecentAnalyses] = useState<any[]>([]);
  const [thinkingContent, setThinkingContent] = useState('');
  const [thinkingOpen, setThinkingOpen] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Input states
  const [interviewee, setInterviewee] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [icMemoSection, setIcMemoSection] = useState('');
  const [industrySector, setIndustrySector] = useState('');
  const [meetingNotes, setMeetingNotes] = useState('');

  const analysisTypes = React.useMemo(
    () =>
      analysisTypeConfigs.map(type => ({
        ...type,
        label: t(type.label),
        description: t(type.description),
      })),
    [t]
  );

  const steps = React.useMemo(
    () =>
      stepConfigs.map(step => ({
        ...step,
        label: t(step.label),
      })),
    [t]
  );

  const icMemoSectionLabels = React.useMemo(
    () => ({
      'Executive Summary': t('Executive Summary'),
      'Industry Overview': t('Industry Overview'),
      'Company Overview': t('Company Overview'),
      'Business Model': t('Business Model'),
      'Competitive Analysis': t('Competitive Analysis'),
      'Financial Analysis': t('Financial Analysis'),
      'Management Team': t('Management Team'),
      'Investment Thesis': t('Investment Thesis'),
      'Risk Factors': t('Risk Factors'),
      'Valuation': t('Valuation'),
    }),
    [t]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter deals based on search
  const filteredDeals = deals.filter(deal =>
    deal.project_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (deal.sector && deal.sector.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    fetchDeals();
    fetchAllRecentAnalyses();
  }, []);

  const fetchAllRecentAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_analyses')
        .select(`
          id,
          title,
          analysis_type,
          created_at,
          deal_id,
          deals!inner(project_name, logo_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAllRecentAnalyses(data);
      }
    } catch (error) {
      console.error('Error fetching recent analyses:', error);
    }
  };

  useEffect(() => {
    if (selectedDeal) {
      fetchSavedAnalyses(selectedDeal.id);
    }
  }, [selectedDeal]);

  const fetchDeals = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('deals')
        .select('id, project_name, folder_link, sector, status, logo_url')
        .order('project_name');

      if (error) throw error;
      setDeals(data || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast({
        title: t('Error'),
        description: t('Failed to load deals'),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedAnalyses = async (dealId: string) => {
    try {
      const { data, error } = await supabase
        .from('deal_analyses')
        .select('*')
        .eq('deal_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSavedAnalyses((data || []).map(item => ({
        id: item.id,
        content: item.result_content,
        notionConnected: item.notion_connected || false,
        dealName: selectedDeal?.project_name || '',
        analysisType: item.analysis_type,
        title: item.title,
        inputData: item.input_data as Record<string, any> || {},
        savedAt: item.created_at
      })));
    } catch (error) {
      console.error('Error fetching saved analyses:', error);
    }
  };

  const deleteAnalysis = async (analysisId: string) => {
    try {
      const { error } = await supabase
        .from('deal_analyses')
        .delete()
        .eq('id', analysisId);

      if (error) throw error;

      setSavedAnalyses(prev => prev.filter(a => a.id !== analysisId));
      setAllRecentAnalyses(prev => prev.filter(a => a.id !== analysisId));
      toast({
        title: t('Deleted'),
        description: t('Analysis deleted successfully')
      });
    } catch (error) {
      console.error('Error deleting analysis:', error);
      toast({
        title: t('Error'),
        description: t('Failed to delete analysis'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteWithConfirm = (analysisId: string) => {
    setConfirmDeleteId(analysisId);
  };

  const confirmDelete = () => {
    if (confirmDeleteId) {
      deleteAnalysis(confirmDeleteId);
      setConfirmDeleteId(null);
    }
  };

  const testNotionConnection = async (folderLink: string): Promise<boolean> => {
    try {
      // Extract Notion page ID from the folder link
      const hexPattern = /([a-f0-9]{32})|([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
      const match = folderLink.match(hexPattern);

      if (!match) {
        console.log('Could not extract Notion page ID from:', folderLink);
        return false;
      }

      const pageId = (match[1] || match[2]).replace(/-/g, '');
      console.log('Testing Notion connection for pageId:', pageId);

      // Create an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const { data, error } = await supabase.functions.invoke('sync-to-notion', {
          body: {
            action: 'test',
            pageId: pageId,
          },
        });

        clearTimeout(timeoutId);

        console.log('Notion connection test response:', { data, error });

        if (error) {
          console.log('Notion connection test error:', error);
          return false;
        }

        return data?.success === true;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Notion connection fetch error:', fetchError);
        return false;
      }
    } catch (error) {
      console.error('Notion connection test error:', error);
      return false;
    }
  };

  const handleDealSelect = async (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    setSelectedDeal(deal || null);
    setResult(null);
    setSelectedAnalysis(null);
    resetInputs();

    if (deal?.folder_link) {
      setNotionStatus('checking');
      const isConnected = await testNotionConnection(deal.folder_link);
      setNotionStatus(isConnected ? 'connected' : 'disconnected');
    } else {
      setNotionStatus('disconnected');
    }
  };

  const resetInputs = () => {
    setInterviewee('');
    setFocusAreas('');
    setIcMemoSection('');
    setIndustrySector('');
    setMeetingNotes('');
  };

  const getInputData = (): Record<string, any> => {
    switch (selectedAnalysis) {
      case 'interview_outline':
        return { interviewee, focusAreas };
      case 'ic_memo':
        return { section: icMemoSection };
      case 'industry_mapping':
        return { sector: industrySector || selectedDeal?.sector };
      case 'notes_summary':
        return { meetingNotes };
      default:
        return {};
    }
  };

  const getAnalysisTitle = (): string => {
    const analysisLabel = analysisTypes.find(a => a.id === selectedAnalysis)?.label || '';
    switch (selectedAnalysis) {
      case 'interview_outline':
        return `${analysisLabel} - ${interviewee || t('General')}`;
      case 'ic_memo':
        return `${analysisLabel} - ${icMemoSection}`;
      case 'industry_mapping':
        return `${analysisLabel} - ${industrySector || selectedDeal?.sector || t('General')}`;
      default:
        return analysisLabel;
    }
  };

  const canGenerate = (): boolean => {
    if (!selectedDeal || !selectedAnalysis) return false;

    switch (selectedAnalysis) {
      case 'interview_outline':
        return true;
      case 'ic_memo':
        return !!icMemoSection;
      case 'industry_mapping':
        return true;
      case 'notes_summary':
        return !!meetingNotes.trim();
      default:
        return true;
    }
  };

  const handleGenerate = async () => {
    if (!selectedDeal || !selectedAnalysis) return;

    setIsGenerating(true);
    setResult(null);
    setThinkingContent('');
    setThinkingOpen(true);
    setCurrentStep(4);

    try {
      const inputData = getInputData();

      const response = await fetch(
        `https://cfawoyegqqigthbtoyan.supabase.co/functions/v1/deal-analysis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dealId: selectedDeal.id,
            analysisType: selectedAnalysis,
            inputData,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('Failed to generate analysis'));
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error(t('No response body'));

      const decoder = new TextDecoder();
      let content = '';
      let metadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.metadata) {
                metadata = parsed.metadata;
                setNotionStatus(metadata.notionConnected ? 'connected' : 'disconnected');
              } else if (parsed.choices?.[0]?.delta?.content) {
                content += parsed.choices[0].delta.content;
                setResult({
                  content,
                  notionConnected: metadata?.notionConnected || false,
                  dealName: metadata?.dealName || selectedDeal.project_name,
                  analysisType: selectedAnalysis,
                  title: getAnalysisTitle(),
                  inputData,
                });
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      const finalResult = {
        content,
        notionConnected: metadata?.notionConnected || false,
        dealName: metadata?.dealName || selectedDeal.project_name,
        analysisType: selectedAnalysis,
        title: getAnalysisTitle(),
        inputData,
      };

      setResult(finalResult);

      // Auto-save to database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('deal_analyses')
            .insert({
              deal_id: selectedDeal.id,
              analysis_type: finalResult.analysisType,
              title: finalResult.title,
              input_data: finalResult.inputData,
              result_content: finalResult.content,
              notion_connected: finalResult.notionConnected,
              user_id: user.id,
            })
            .select()
            .single();

          if (!error && data) {
            setResult({
              ...finalResult,
              id: data.id,
              savedAt: data.created_at
            });
            fetchSavedAnalyses(selectedDeal.id);
          }
        }
      } catch (saveError) {
        console.error('Auto-save error:', saveError);
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: t('Error'),
        description: error instanceof Error ? error.message : t('Failed to generate analysis'),
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!result || !selectedDeal) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('You must be logged in'));

      const { data, error } = await supabase
        .from('deal_analyses')
        .insert({
          deal_id: selectedDeal.id,
          analysis_type: result.analysisType,
          title: result.title,
          input_data: result.inputData,
          result_content: result.content,
          notion_connected: result.notionConnected,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: t('Saved'),
        description: t('Analysis saved successfully')
      });

      fetchSavedAnalyses(selectedDeal.id);

      setResult({
        ...result,
        id: data.id,
        savedAt: data.created_at
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: t('Error'),
        description: t('Failed to save analysis'),
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;

    try {
      await navigator.clipboard.writeText(result.content);
      toast({
        title: t('Copied'),
        description: t('Content copied to clipboard')
      });
    } catch (error) {
      toast({
        title: t('Error'),
        description: t('Failed to copy'),
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    if (!result) return;

    const blob = new Blob([result.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.dealName}-${result.title}.md`.replace(/[/\\?%*:|"<>]/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: t('Exported'),
      description: t('File downloaded as Markdown')
    });
  };

  const loadSavedAnalysis = (analysis: AnalysisResult) => {
    setResult(analysis);
    setSelectedAnalysis(analysis.analysisType);
    setCurrentStep(4);
  };

  const canProceedToStep2 = selectedDeal !== null;
  const canProceedToStep3 = canGenerate();

  const getSelectedAnalysisInfo = () => {
    return analysisTypes.find(a => a.id === selectedAnalysis);
  };

  const getInputSummary = (): { label: string; value: string }[] => {
    const summary: { label: string; value: string }[] = [];
    const inputData = getInputData();

    switch (selectedAnalysis) {
      case 'interview_outline':
        if (inputData.interviewee) summary.push({ label: t('Interviewee'), value: inputData.interviewee });
        if (inputData.focusAreas) summary.push({ label: t('Focus Areas'), value: inputData.focusAreas });
        break;
      case 'ic_memo':
        if (inputData.section) summary.push({ label: t('Section'), value: inputData.section });
        break;
      case 'industry_mapping':
        summary.push({ label: t('Sector'), value: inputData.sector || t('General') });
        break;
      case 'notes_summary':
        if (inputData.meetingNotes) summary.push({ label: t('Notes'), value: `${inputData.meetingNotes.slice(0, 100)}...` });
        break;
    }

    return summary;
  };

  const renderInputForm = () => {
    if (!selectedAnalysis) return null;

    switch (selectedAnalysis) {
      case 'interview_outline':
        return (
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('Interviewee Info')}</label>
              <Input
                placeholder={t('e.g., CEO, CTO, Sales Director...')}
                value={interviewee}
                onChange={(e) => setInterviewee(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('Focus Areas')}</label>
              <Textarea
                placeholder={t('e.g., Product roadmap, competitive landscape, unit economics...')}
                value={focusAreas}
                onChange={(e) => setFocusAreas(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>
          </div>
        );

      case 'ic_memo':
        return (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('Memo Section')} *</label>
            <Select value={icMemoSection} onValueChange={setIcMemoSection}>
              <SelectTrigger>
                <SelectValue placeholder={t('Select section')} />
              </SelectTrigger>
              <SelectContent>
                {icMemoSections.map(section => (
                  <SelectItem key={section} value={section}>
                    {icMemoSectionLabels[section] || section}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'industry_mapping':
        return (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('Sector/Track')}</label>
            <Input
              placeholder={selectedDeal?.sector || t('e.g., Enterprise SaaS, Fintech...')}
              value={industrySector}
              onChange={(e) => setIndustrySector(e.target.value)}
              className="h-9 text-sm"
            />
            {selectedDeal?.sector && !industrySector && (
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("Will use deal's sector: {sector}", { sector: selectedDeal.sector })}
              </p>
            )}
          </div>
        );

      case 'notes_summary':
        return (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('Meeting Notes/Transcript')} *</label>
            <Textarea
              placeholder={t('Paste your meeting notes or transcript here...')}
              value={meetingNotes}
              onChange={(e) => setMeetingNotes(e.target.value)}
              className="min-h-[140px] text-sm"
            />
          </div>
        );

      default:
        return (
          <p className="text-xs text-muted-foreground">
            {t('No additional input required. Click "Continue" to proceed.')}
          </p>
        );
    }
  };

  return (
    <div className="min-h-[calc(100vh-12rem)] flex flex-col">
      <div className="pb-4 border-b border-border">
        <PageSectionHeader
          className="mb-0"
          title={t('Copilot')}
          subtitle={t('Structure the logic')}
        />
      </div>

      {/* Progress Bar - only show when not on start screen */}
      {currentStep > 0 && (
        <div className="py-5 border-b border-border/30">
          <div className="flex items-center justify-between relative">
            {/* Progress line background */}
            <div className="absolute top-4 left-0 right-0 h-px bg-border/40" />

            {/* Active progress line */}
            <div
              className="absolute top-4 left-0 h-px bg-primary/60 transition-all duration-700 ease-out"
              style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
            />

            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isClickable = step.id === 1 ||
                (step.id === 2 && canProceedToStep2) ||
                (step.id === 3 && canProceedToStep3) ||
                (step.id === 4 && result);

              return (
                <button
                  key={step.id}
                  onClick={() => isClickable && setCurrentStep(step.id)}
                  disabled={!isClickable}
                  className="relative z-10 flex flex-col items-center gap-1.5 group"
                >
                  <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-200
                      ${isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                      ${isCompleted ? 'bg-primary/80 text-primary-foreground' : ''}
                      ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                    {isCompleted ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Icon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className={`
                      text-xs font-medium transition-colors
                      ${isActive ? 'text-foreground' : 'text-muted-foreground'}
                    `}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 py-8">

        {/* Step 0: Start Screen */}
        {currentStep === 0 && (
          <div className="animate-fade-in">

            {/* Start New Analysis Button */}
            <div className="flex justify-center mb-10 mt-4">
              <Button
                onClick={() => setCurrentStep(1)}
                size="lg"
                className="gap-2 px-8 h-11"
              >
                <Sparkles className="w-4 h-4" />
                {t('Start New Analysis')}
              </Button>
            </div>

            {/* Recent Analyses */}
            {allRecentAnalyses.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="text-xs text-muted-foreground font-medium">{t('My Recent Analyses')}</span>
                  <div className="h-px flex-1 bg-border/40" />
                </div>

                <div className="space-y-0.5">
                  {allRecentAnalyses.map((analysis) => {
                    const dealInfo = analysis.deals as any;
                    const logoUrl = dealInfo?.logo_url;
                    const projectName = dealInfo?.project_name || t('Unknown');

                    return (
                      <div
                        key={analysis.id}
                        className="group flex items-center gap-3 py-2.5 px-2 rounded-md hover:bg-muted/30 transition-colors"
                      >
                        {/* Project Logo */}
                        <div className="w-7 h-7 rounded-md bg-muted/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {logoUrl ? (
                            <img
                              src={logoUrl}
                              alt={projectName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xs font-medium text-muted-foreground">
                              {projectName.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => navigate(`/private/analysis/${analysis.id}`, { state: { from: 'recent-analyses' } })}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm truncate">{analysis.title}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {new Date(analysis.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {projectName}
                          </p>
                        </button>
                        <button
                          onClick={() => handleDeleteWithConfirm(analysis.id)}
                          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Select Deal */}
        {currentStep === 1 && (
          <div className="animate-fade-in space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-heading tracking-tight">{t('Select Project')}</h2>
              <p className="text-sm text-muted-foreground">{t('Select the project to analyze')}</p>
            </div>

            <div className="space-y-3">
              {/* Search Input */}
              <div ref={searchRef} className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search project name...')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    className="h-10 pl-9 bg-transparent border-0 border-b border-border/40 rounded-none hover:border-border/60 focus:border-primary/50 focus-visible:ring-0 shadow-none"
                  />
                </div>

                {/* Dropdown Results */}
                {showDropdown && searchQuery && filteredDeals.length > 0 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border/40 rounded-md shadow-lg max-h-[240px] overflow-y-auto">
                    {filteredDeals.slice(0, 8).map(deal => (
                      <button
                        key={deal.id}
                        onClick={() => {
                          handleDealSelect(deal.id);
                          setSearchQuery(deal.project_name);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-center gap-3"
                      >
                        {/* Project Logo */}
                        <div className="w-6 h-6 rounded-md bg-muted/50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {deal.logo_url ? (
                            <img
                              src={deal.logo_url}
                              alt={deal.project_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {deal.project_name.substring(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 flex items-center justify-between min-w-0">
                          <span className="text-sm truncate">{deal.project_name}</span>
                          {deal.sector && (
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">{deal.sector}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Connection Status - directly below search */}
              {selectedDeal && (
                <div className="flex items-center gap-2 pt-1">
                  {notionStatus === 'checking' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('Testing Connection...')}
                    </span>
                  ) : notionStatus === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-600 text-white text-xs font-medium">
                      <Link2 className="h-3.5 w-3.5" />
                      {t('Project Connected')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs">
                      <Link2Off className="h-3.5 w-3.5" />
                      {t('Database Only')}
                    </span>
                  )}
                </div>
              )}

              {/* Saved Analyses with delete */}
              {selectedDeal && savedAnalyses.length > 0 && (
                <div className="pt-4 border-t border-border/30">
                  <h3 className="text-xs font-medium text-muted-foreground mb-2">{t('Previous Analyses')}</h3>
                  <div className="space-y-1">
                    {savedAnalyses.slice(0, 5).map(analysis => (
                      <div
                        key={analysis.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-muted/30 transition-colors group"
                      >
                        <button
                          onClick={() => navigate(`/private/analysis/${analysis.id}`, { state: { from: 'select-deal', dealId: selectedDeal?.id } })}
                          className="flex-1 text-left flex items-center justify-between min-w-0"
                        >
                          <div className="truncate">
                            <span className="text-sm font-medium">{analysis.title}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {analysis.savedAt && new Date(analysis.savedAt).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US')}
                            </span>
                          </div>
                          <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (analysis.id) handleDeleteWithConfirm(analysis.id);
                          }}
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

            <div className="flex justify-end pt-3">
              <Button
                onClick={() => setCurrentStep(2)}
                disabled={!canProceedToStep2 || notionStatus === 'checking'}
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                {t('Continue')}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Choose Analysis */}
        {currentStep === 2 && (
          <div className="animate-fade-in space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-heading tracking-tight">{t('Choose Analysis')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('Analyze')} <span className="font-medium text-foreground">{selectedDeal?.project_name}</span>
              </p>
            </div>

            {/* Compact Analysis Type List - refined animation */}
            <div className="space-y-1">
              {analysisTypes.map(type => {
                const Icon = type.icon;
                const isSelected = selectedAnalysis === type.id;

                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedAnalysis(type.id)}
                    className={`
                        w-full flex items-center gap-2.5 px-3 py-2 rounded text-left transition-colors duration-150
                        ${isSelected
                        ? 'bg-primary/8 text-foreground'
                        : 'hover:bg-muted/30 text-foreground/70'
                      }
                      `}
                  >
                    <div className={`
                        w-7 h-7 rounded flex items-center justify-center shrink-0 transition-colors duration-150
                        ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground'}
                      `}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-medium ${isSelected ? 'text-foreground' : ''}`}>
                        {type.label}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">{type.description}</p>
                    </div>
                    <div className={`
                        w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-150
                        ${isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border/60'
                      }
                      `}>
                      {isSelected && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Input Form - more refined layout */}
            {selectedAnalysis && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border/30" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('Additional Details')}</span>
                  <div className="h-px flex-1 bg-border/30" />
                </div>
                {renderInputForm()}
              </div>
            )}

            <div className="flex justify-between pt-3">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(1)}
                className="gap-1.5 h-8 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                {t('Back')}
              </Button>
              <Button
                onClick={() => setCurrentStep(3)}
                disabled={!canProceedToStep3}
                size="sm"
                className="gap-1.5 h-8 text-xs"
              >
                {t('Continue')}
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm Details */}
        {currentStep === 3 && (
          <div className="animate-fade-in space-y-5">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-heading tracking-tight">{t('Confirm')}</h2>
              <p className="text-sm text-muted-foreground">{t('Confirm to start generating analysis')}</p>
            </div>

            <div className="space-y-3">
              {/* Deal Info */}
              <div className="p-4 rounded-lg bg-muted/20 border border-border/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('Project')}</span>
                  <span className="text-sm font-medium">{selectedDeal?.project_name}</span>
                </div>

                {selectedDeal?.sector && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{t('Sector')}</span>
                    <span className="text-sm">{selectedDeal.sector}</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('Data Source')}</span>
                  {notionStatus === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-600 text-white text-xs font-medium">
                      <Link2 className="h-3.5 w-3.5" />
                      {t('Project Connected')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/60 text-muted-foreground text-xs">
                      <Link2Off className="h-3.5 w-3.5" />
                      {t('Database Only')}
                    </span>
                  )}
                </div>
              </div>

              {/* Analysis Type */}
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{t('Analysis Type')}</span>
                  <div className="flex items-center gap-1.5">
                    {getSelectedAnalysisInfo() && (
                      <>
                        {React.createElement(getSelectedAnalysisInfo()!.icon, { className: 'h-3.5 w-3.5 text-primary' })}
                        <span className="text-sm font-medium">{getSelectedAnalysisInfo()?.label}</span>
                      </>
                    )}
                  </div>
                </div>

                {getInputSummary().map((item, index) => (
                  <div key={index} className="flex items-start justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-sm text-right max-w-[60%] line-clamp-2">{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Connection Status Warning */}
              {notionStatus !== 'connected' && (
                <div className="p-2.5 rounded bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-600 leading-relaxed">
                    {t('This project is not connected to Notion. The analysis will use database data only. Add a Notion folder link for richer context.')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-3">
              <Button
                variant="ghost"
                onClick={() => setCurrentStep(2)}
                className="gap-1.5 h-8 text-xs"
              >
                <ChevronLeft className="h-3 w-3" />
                {t('Back')}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                size="sm"
                className="gap-2 rounded-lg px-6 shadow-sm text-foreground border-0 bg-transparent bg-gradient-to-r from-amber-200/70 via-fuchsia-200/60 to-sky-200/70 hover:bg-transparent hover:from-amber-200/80 hover:via-fuchsia-200/70 hover:to-sky-200/80 hover:brightness-100"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t('Generating...')}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('Generate Analysis')}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Results */}
        {currentStep === 4 && (
          <div className="animate-fade-in space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-heading tracking-tight">{result?.title || t('Generating...')}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {result?.dealName || selectedDeal?.project_name}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  {notionStatus === 'connected' ? (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {t('Project Connected')}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2Off className="h-3 w-3" />
                      {t('Database Only')}
                    </span>
                  )}
                </div>
              </div>

              {result && !isGenerating && (
                <div className="flex items-center gap-1.5">
                  {result.id ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-600/10 text-green-600 text-xs font-medium">
                      <Check className="h-3 w-3" />
                      {t('Saved')}
                    </span>
                  ) : isSaving ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 text-muted-foreground text-xs">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {t('Saving...')}
                    </span>
                  ) : null}
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-8 text-xs px-2.5">
                    <Copy className="h-3 w-3 mr-1" />
                    {t('Copy')}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleExport} className="h-8 text-xs px-2.5">
                    <Download className="h-3 w-3 mr-1" />
                    {t('Export')}
                  </Button>
                </div>
              )}
            </div>

            <div className="border-t border-border/30" />

            {/* Result Content */}
            <div ref={resultRef}>
              {result ? (
                <ScrollArea className="h-[calc(100vh-16rem)]">
                  <div className="prose prose-sm dark:prose-invert max-w-none pr-4 text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.content}
                    </ReactMarkdown>
                  </div>

                  {isGenerating && (
                    <div className="mt-3 pb-4">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.15s' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.3s' }} />
                        <span className="text-xs ml-1">{t('Continuing to generate...')}</span>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              ) : (
                <div className="h-[calc(100vh-16rem)] pt-6">
                  <ThinkingIndicator
                    thinkingContent={
                      thinkingContent ||
                      t('Analyzing {project}...\n\n• Reading project database info\n{notionLine}• Building analysis framework\n• Generating {analysis}...', {
                        project: selectedDeal?.project_name || '',
                        notionLine: notionStatus === 'connected' ? t('• Fetching Notion folder content\n') : '',
                        analysis: getSelectedAnalysisInfo()?.label || t('Analysis'),
                      })
                    }
                    isOpen={thinkingOpen}
                    onOpenChange={setThinkingOpen}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border/30">
              <Button
                onClick={() => {
                  setResult(null);
                  setSelectedAnalysis(null);
                  setCurrentStep(2);
                  resetInputs();
                }}
                className="gap-1.5 h-8 text-xs"
              >
                <Sparkles className="h-3 w-3" />
                {t('New Analysis')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(open) => !open && setConfirmDeleteId(null)}
        title={t('Delete Analysis')}
        description={t('Are you sure you want to delete this analysis? This action cannot be undone.')}
        confirmText={t('Delete')}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default DealAnalysis;
