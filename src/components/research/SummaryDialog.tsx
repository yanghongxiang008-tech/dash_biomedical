import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  History, 
  Sparkles, 
  ChevronRight,
  Calendar,
  FileText,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n } from '@/i18n';

export interface SummaryHistoryEntry {
  id: string;
  title: string | null;
  preview: string | null;
  summary: string | null;
  created_at: string;
  item_count: number | null;
  source_count: number | null;
}

interface SummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showHistoryByDefault?: boolean;
  stats: {
    totalUnread: number;
    sourceCount: number;
  };
  history: SummaryHistoryEntry[];
  onGenerateSummary: () => Promise<{ summary?: string; metadata?: any; error?: string }>;
}

export const SummaryDialog = ({ 
  open, 
  onOpenChange,
  showHistoryByDefault = false,
  stats,
  history,
  onGenerateSummary
}: SummaryDialogProps) => {
  const { t, locale } = useI18n();
  const [showHistory, setShowHistory] = useState(showHistoryByDefault);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<any | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setShowHistory(showHistoryByDefault);
      setSelectedHistoryId(null);
      setIsGenerating(false);
      setSummaryText(null);
      setSummaryMeta(null);
      setSummaryError(null);
    }
  }, [open, showHistoryByDefault]);

  const handleGenerateSummary = async () => {
    setIsGenerating(true);
    setSummaryError(null);
    try {
      const result = await onGenerateSummary();
      if (result.error) {
        setSummaryError(result.error);
        setSummaryText(null);
        setSummaryMeta(null);
      } else {
        setSummaryText(result.summary || '');
        setSummaryMeta(result.metadata || null);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('Failed to generate summary');
      setSummaryError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedHistory = history.find(h => h.id === selectedHistoryId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] p-0 gap-0 overflow-hidden flex flex-col">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg font-medium">
              <Sparkles className="h-5 w-5 text-primary" />
              {showHistory ? t('Summary History') : t('Research Summary')}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowHistory(!showHistory);
                  setSelectedHistoryId(null);
                }}
                className={cn(
                  "text-xs h-8",
                  showHistory && "bg-muted"
                )}
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                {showHistory ? t('New Summary') : t('History')}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - History List */}
          {showHistory && (
            <div className="w-72 border-r bg-muted/20 flex flex-col">
              <div className="px-4 py-3 border-b">
                <h3 className="text-sm font-medium text-muted-foreground">{t('Past Summaries')}</h3>
              </div>
              <ScrollArea className="flex-1">
                {history.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title={t('No history yet')}
                    description={t('Generated summaries will appear here')}
                    compact
                    className="h-full"
                  />
                ) : (
                  <div className="p-2 space-y-1">
                    {history.map((summary) => (
                      <button
                        key={summary.id}
                        onClick={() => setSelectedHistoryId(summary.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          selectedHistoryId === summary.id 
                            ? "bg-primary/10 border border-primary/20" 
                            : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{summary.title || t('Research Summary')}</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">
                                {new Date(summary.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            {summary.preview && (
                              <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                                {summary.preview}
                              </p>
                            )}
                          </div>
                          <ChevronRight className={cn(
                            "h-4 w-4 text-muted-foreground flex-shrink-0 transition-colors",
                            selectedHistoryId === summary.id && "text-primary"
                          )} />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {showHistory && selectedHistoryId ? (
                  // Show selected historical summary
                  <div>
                    <div className="mb-4">
                      <h2 className="text-xl font-semibold">{selectedHistory?.title || t('Research Summary')}</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('Generated on {date}', {
                          date: selectedHistory
                            ? new Date(selectedHistory.created_at).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '',
                        })}
                      </p>
                    </div>
                    <Separator className="my-4" />
                    {selectedHistory?.summary ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-3">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {selectedHistory.summary}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('No content available.')}</p>
                    )}
                  </div>
                ) : showHistory ? (
                  // History view but no selection
                  <EmptyState
                    icon={History}
                    title={t('Select a Summary')}
                    description={t('Choose a past summary from the list to view its content')}
                    className="h-full min-h-[300px]"
                  />
                ) : (
                  // New summary generation view
                  <div className="flex flex-col h-full min-h-[400px]">
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        </div>
                        <h3 className="text-lg font-medium mb-2">{t('Generating Summary...')}</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          {t('Analyzing your research sources and creating an intelligent summary')}
                        </p>
                      </div>
                    ) : summaryText ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-lg font-semibold">{t('Latest Summary')}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('Based on {items} unread articles from {sources} sources', {
                                items: summaryMeta?.itemCount ?? stats.totalUnread,
                                sources: summaryMeta?.sourceCount ?? stats.sourceCount,
                              })}
                            </p>
                          </div>
                          <Button onClick={handleGenerateSummary} variant="outline" size="sm" className="gap-2">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t('Regenerate')}
                          </Button>
                        </div>

                        {summaryError && (
                          <div className="text-sm text-red-500">{summaryError}</div>
                        )}

                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed prose-p:my-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-headings:my-3 prose-h1:text-lg prose-h1:font-semibold prose-h2:text-base prose-h2:font-semibold prose-h3:text-sm prose-h3:font-medium">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {summaryText}
                          </ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                          <Sparkles className="h-10 w-10 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">{t('Generate Research Summary')}</h3>
                        <p className="text-sm text-muted-foreground max-w-md mb-6">
                          {t('AI will analyze all unread articles from your research sources and create a comprehensive summary with key insights.')}
                        </p>
                        <Button 
                          onClick={handleGenerateSummary}
                          className="gap-2"
                          size="lg"
                          disabled={stats.totalUnread === 0}
                        >
                          <Sparkles className="h-4 w-4" />
                          {t('Generate Summary')}
                        </Button>
                        <p className="text-xs text-muted-foreground mt-4">
                          {stats.totalUnread === 0
                            ? t('No unread articles available')
                            : t('Based on {items} unread articles from {sources} sources', {
                                items: stats.totalUnread,
                                sources: stats.sourceCount,
                              })}
                        </p>
                        {summaryError && (
                          <p className="text-xs text-red-500 mt-2">{summaryError}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SummaryDialog;
