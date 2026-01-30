import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Link2, Link2Off, Copy, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import PageSkeleton from '@/components/PageSkeleton';
import { useI18n } from '@/i18n';

interface AnalysisData {
  id: string;
  title: string;
  analysis_type: string;
  result_content: string;
  notion_connected: boolean;
  created_at: string;
  deal: {
    id: string;
    project_name: string;
    sector: string | null;
  } | null;
}

interface LocationState {
  from?: 'deal-detail' | 'recent-analyses' | 'select-deal';
  dealId?: string;
}

const AnalysisView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useI18n();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const locationState = location.state as LocationState | null;

  useEffect(() => {
    if (id) {
      fetchAnalysis(id);
    }
  }, [id]);

  const fetchAnalysis = async (analysisId: string) => {
    try {
      const { data, error } = await supabase
        .from('deal_analyses')
        .select(`
          id,
          title,
          analysis_type,
          result_content,
          notion_connected,
          created_at,
          deals!deal_analyses_deal_id_fkey (
            id,
            project_name,
            sector
          )
        `)
        .eq('id', analysisId)
        .single();

      if (error) throw error;

      setAnalysis({
        ...data,
        deal: data.deals as any
      });
    } catch (error) {
      console.error('Error fetching analysis:', error);
      toast({
        title: t("Error"),
        description: t("Failed to load analysis"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const from = locationState?.from;
    
    if (from === 'deal-detail') {
      // Go back to private markets (deal detail will need to be reopened)
      navigate('/private');
    } else if (from === 'recent-analyses' || from === 'select-deal') {
      // Go back to analysis page
      navigate('/private', { state: { activeTab: 'analysis' } });
    } else {
      // Default: go back to private markets
      navigate('/private');
    }
  };

  const getBackLabel = () => {
    const from = locationState?.from;
    if (from === 'deal-detail') return t('Back to Deal');
    if (from === 'recent-analyses') return t('Back to Analysis');
    if (from === 'select-deal') return t('Back to Analysis');
    return t('Back');
  };

  const handleCopy = async () => {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis.result_content);
      toast({ title: t("Copied"), description: t("Content copied to clipboard") });
    } catch (error) {
      toast({ title: t("Error"), description: t("Failed to copy"), variant: "destructive" });
    }
  };

  const handleExport = () => {
    if (!analysis) return;
    const blob = new Blob([analysis.result_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${analysis.deal?.project_name || 'analysis'}-${analysis.title}.md`.replace(/[/\\?%*:|"<>]/g, '-');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: t("Exported"), description: t("File downloaded as Markdown") });
  };

  if (isLoading) {
    return <PageSkeleton containerClassName="max-w-4xl" rows={4} />;
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{t("Analysis not found")}</p>
        <Button variant="outline" onClick={() => navigate('/private')}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          {t("Back to Private Markets")}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleBack}
                className="h-8 text-xs gap-1.5"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                {getBackLabel()}
              </Button>
              <div className="h-4 w-px bg-border" />
              <div>
                <h1 className="text-sm font-medium">{analysis.title}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[11px] text-muted-foreground">
                    {analysis.deal?.project_name}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(analysis.created_at).toLocaleDateString()}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  {analysis.notion_connected ? (
                    <span className="text-[11px] text-green-600 flex items-center gap-1">
                      <Link2 className="h-2.5 w-2.5" />
                      {t("Connected")}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Link2Off className="h-2.5 w-2.5" />
                      {t("Database")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-[11px] px-2">
                <Copy className="h-2.5 w-2.5 mr-1" />
                {t("Copy")}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExport} className="h-7 text-[11px] px-2">
                <Download className="h-2.5 w-2.5 mr-1" />
                {t("Export")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <ScrollArea className="h-[calc(100vh-10rem)]">
          <div className="prose prose-sm dark:prose-invert max-w-none pr-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {analysis.result_content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default AnalysisView;
