import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ExternalLink,
  Check,
  CheckCheck,
  Plus,
  Pencil,
  RotateCw,
  Rss,
  Globe,
  FileText,
  Zap,
  Lightbulb,
  Headphones,
  FileBarChart2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchSource, ResearchItem } from '@/hooks/useResearch';
import { format, formatDistanceToNow, isValid } from 'date-fns';
import { AddItemDialog } from './AddItemDialog';
import { EditSourceDialog } from './EditSourceDialog';
import { SourceLogo } from './SourceCard';
import { useI18n } from '@/i18n';

interface SourceDetailDialogProps {
  source: ResearchSource | null;
  items: ResearchItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFetchItems: (sourceId: string) => void | Promise<void>;
  onMarkAsRead: (itemId: string, sourceId: string) => void;
  onMarkAllAsRead: (sourceId: string) => void;
  onClearRecords: (sourceId: string) => void;
  onAddItem: (sourceId: string, item: { title: string; url?: string; summary?: string }) => Promise<any>;
  onUpdateSource: (id: string, updates: Partial<ResearchSource>) => void;
  onSync?: (id: string) => void;
  isSyncing?: boolean;
  initialItemId?: string | null;
}

const getPriorityLabel = (priority: number | null | undefined) => {
  if (!priority || priority < 1) return null;
  const colors: Record<number, string> = {
    5: "bg-red-500/10 text-red-600 dark:text-red-400",
    4: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    3: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    2: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    1: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn(
      "px-1.5 py-0 rounded-md text-[10px] font-medium",
      colors[priority] || colors[1]
    )}>
      P{priority}
    </span>
  );
};

const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'news':
      return <Zap className="h-3 w-3" />;
    case 'research':
      return <Lightbulb className="h-3 w-3" />;
    case 'podcast':
      return <Headphones className="h-3 w-3" />;
    case 'report':
      return <FileBarChart2 className="h-3 w-3" />;
    case 'twitter':
      return <XIcon className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

const getSourceTypeIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'rss':
      return <Rss className="h-3 w-3" />;
    case 'crawl':
      return <Globe className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
};

export const SourceDetailDialog: React.FC<SourceDetailDialogProps> = ({
  source,
  items,
  open,
  onOpenChange,
  onFetchItems,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearRecords,
  onAddItem,
  onUpdateSource,
  onSync,
  isSyncing,
  initialItemId
}) => {
  const { t } = useI18n();
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ResearchItem | null>(null);
  const [fetchedSourceId, setFetchedSourceId] = useState<string | null>(null);
  const sourceId = source?.id;
  const sourceItems = useMemo(() => {
    if (!sourceId) return [];
    return items.filter(item => item.source_id === sourceId);
  }, [items, sourceId]);

  const formatRelativeDate = (value: string | null) => {
    if (!value) return null;
    const date = new Date(value);
    if (!isValid(date)) return null;
    return formatDistanceToNow(date, { addSuffix: true });
  };

  const lastCheckedLabel = formatRelativeDate(source?.last_checked_at ?? null);

  useEffect(() => {
    if (!open) {
      setItemsLoading(false);
      setFetchedSourceId(null);
      return;
    }

    if (!source) return;

    let isCancelled = false;
    setSelectedItem(null);

    if (fetchedSourceId !== source.id) {
      if (sourceItems.length === 0) {
        setItemsLoading(true);
      }

      Promise.resolve(onFetchItems(source.id))
        .catch(() => { })
        .finally(() => {
          if (isCancelled) return;
          setItemsLoading(false);
          setFetchedSourceId(source.id);
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [open, source?.id, fetchedSourceId, onFetchItems, sourceItems.length]);

  useEffect(() => {
    if (!open || !source || !initialItemId) return;
    const match = sourceItems.find(item => item.id === initialItemId);
    if (match && selectedItem?.id !== match.id) {
      setSelectedItem(match);
      if (!match.is_read) {
        onMarkAsRead(match.id, source.id);
      }
    }
  }, [sourceItems, open, source?.id, initialItemId, selectedItem?.id, onMarkAsRead]);

  const unreadCount = source ? (
    sourceItems.length > 0
      ? sourceItems.filter(i => !i.is_read).length
      : (source.unread_count || 0)
  ) : 0;
  const isExpanded = selectedItem !== null;

  // Group items by date for timeline
  const groupedItems = useMemo(() => {
    const formatItemDate = (item: ResearchItem) => {
      const rawDate = item.published_at || item.created_at;
      const date = new Date(rawDate);
      if (!isValid(date)) return t('Unknown date');
      return format(date, 'MMM d, yyyy');
    };

    return sourceItems.reduce((acc, item) => {
      const date = formatItemDate(item);
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {} as Record<string, ResearchItem[]>);
  }, [sourceItems]);

  const handleSelectItem = (item: ResearchItem) => {
    setSelectedItem(item);
    // Mark as read when viewing content
    if (!item.is_read) {
      onMarkAsRead(item.id, source.id);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "h-[85vh] flex flex-col p-0 transition-all duration-300",
            isExpanded ? "sm:max-w-[1100px]" : "sm:max-w-[600px]"
          )}
        >
          {!source ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Skeleton className="w-12 h-12 rounded-lg mx-auto mb-4" />
                <Skeleton className="h-4 w-32 mx-auto mb-2" />
                <Skeleton className="h-3 w-24 mx-auto" />
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Left Panel - Article List */}
              <div className={cn(
                "flex flex-col h-full transition-all duration-300",
                isExpanded ? "w-[400px] border-r border-border" : "w-full"
              )}>
                {/* Header with Logo */}
                <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-4 min-w-0">
                      <SourceLogo source={source} size="xl" />

                      <div className="min-w-0 min-h-[72px] flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 w-full">
                            <DialogTitle className="text-base font-semibold leading-tight truncate">
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:underline underline-offset-2"
                              >
                                {source.name}
                              </a>
                            </DialogTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => setEditOpen(true)}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" />
                              {t('Edit')}
                            </Button>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] capitalize inline-flex items-center gap-1">
                              {getCategoryIcon(source.category)}
                              {source.category}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] capitalize inline-flex items-center gap-1" title={source.source_type}>
                              {getSourceTypeIcon(source.source_type)}
                              <span className="sr-only">{source.source_type}</span>
                            </Badge>
                            {getPriorityLabel(source.priority)}
                            {source.tags && source.tags.length > 0 && source.tags.map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {source.description && (
                            <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                              {source.description}
                            </p>
                          )}
                        </div>

                        {lastCheckedLabel && (
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {t('Synced {time}', { time: lastCheckedLabel })}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full">
                      {source.source_type !== 'manual' && onSync && (
                        isSyncing ? (
                          <span
                            className="text-[11px] font-medium animate-text-shimmer bg-clip-text text-transparent px-2 py-0.5"
                            style={{
                              backgroundImage: 'linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--muted-foreground)) 100%)',
                              backgroundSize: '200% auto'
                            }}
                          >
                            {t('Working...')}
                          </span>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-foreground bg-muted hover:bg-muted/80"
                            onClick={() => onSync(source.id)}
                          >
                            <RotateCw className="h-3.5 w-3.5 mr-1" />
                            {t('Sync')}
                          </Button>
                        )
                      )}
                      {source.source_type === 'manual' && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 px-2 text-[11px]"
                          onClick={() => setAddItemOpen(true)}
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          {t('Add Article')}
                        </Button>
                      )}
                      {sourceItems.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] text-destructive hover:text-destructive"
                          onClick={() => onClearRecords(source.id)}
                        >
                          {t('Clear')}
                        </Button>
                      )}
                      {unreadCount > 0 && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 text-[11px] ml-auto"
                          onClick={() => onMarkAllAsRead(source.id)}
                        >
                          <CheckCheck className="h-3.5 w-3.5 mr-1" />
                          {t('Mark All Read')}
                        </Button>
                      )}
                    </div>
                  </div>
                </DialogHeader>

                {/* Timeline Content */}
                <ScrollArea className="flex-1 overflow-y-auto">
                  <div className="px-6 py-4">
                    {unreadCount > 0 && (
                      <div className="mb-3 flex items-center justify-between">
                        <Badge variant="default" className="text-[10px]">
                          {t('{count} new', { count: unreadCount })}
                        </Badge>
                      </div>
                    )}
                    {itemsLoading ? (
                      // Skeleton loading for timeline
                      <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                          <div key={i}>
                            <div className="flex items-center gap-3 mb-3">
                              <Skeleton className="w-4 h-4 rounded-full" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="ml-7 space-y-2">
                              {[...Array(2)].map((_, j) => (
                                <div key={j} className="p-3 rounded-lg bg-muted/30">
                                  <Skeleton className="h-4 w-3/4 mb-2" />
                                  <Skeleton className="h-3 w-full" />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : sourceItems.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>{t('No articles yet')}</p>
                        {source.source_type === 'manual' && (
                          <Button
                            variant="link"
                            onClick={() => setAddItemOpen(true)}
                            className="mt-2"
                          >
                            {t('Add your first article')}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                        {Object.entries(groupedItems).map(([date, dateItems]) => (
                          <div key={date} className="mb-6">
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex-shrink-0 z-10" />
                              <span className="text-sm font-medium text-muted-foreground">{date}</span>
                            </div>

                            {/* Items for this date */}
                            <div className="ml-7 space-y-1">
                              {dateItems.map((item) => {
                                const isSelected = selectedItem?.id === item.id;

                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleSelectItem(item)}
                                    className={cn(
                                      "p-3 rounded-lg cursor-pointer transition-all",
                                      isSelected
                                        ? "bg-primary/10 border border-primary/30"
                                        : "hover:bg-muted/50",
                                      !item.is_read && !isSelected && "bg-accent/20"
                                    )}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-foreground line-clamp-2">
                                          {item.title}
                                          {!item.is_read && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                                              {t('New')}
                                            </span>
                                          )}
                                        </h4>

                                        {!isExpanded && item.summary && (
                                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                            {item.summary}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex gap-1 flex-shrink-0">
                                        {item.url && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              window.open(item.url!, '_blank');
                                              if (!item.is_read) {
                                                onMarkAsRead(item.id, source.id);
                                              }
                                            }}
                                          >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                        {!item.is_read && (
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onMarkAsRead(item.id, source.id);
                                            }}
                                          >
                                            <Check className="h-3.5 w-3.5" />
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Right Panel - Article Content */}
              {isExpanded && selectedItem && (
                <div className="flex-1 flex flex-col h-full min-w-0">
                  {/* Content Header */}
                  <div className="px-6 py-4 border-b flex-shrink-0">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-foreground mb-2">
                        {selectedItem.title}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {selectedItem.published_at && (
                          <span>{format(new Date(selectedItem.published_at), 'MMM d, yyyy h:mm a')}</span>
                        )}
                        {selectedItem.url && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => window.open(selectedItem.url!, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            {t('Open in browser')}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Body */}
                  <ScrollArea className="flex-1 overflow-y-auto">
                    <div className="px-6 py-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        {selectedItem.content ? (
                          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {selectedItem.content}
                          </div>
                        ) : selectedItem.summary ? (
                          <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                            {selectedItem.summary}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>{t('No content available')}</p>
                            {selectedItem.url && (
                              <Button
                                variant="link"
                                onClick={() => window.open(selectedItem.url!, '_blank')}
                                className="mt-2"
                              >
                                {t('View original article')}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {source && (
        <>
          <AddItemDialog
            open={addItemOpen}
            onOpenChange={setAddItemOpen}
            onAdd={(item) => onAddItem(source.id, item)}
          />

          <EditSourceDialog
            source={source}
            open={editOpen}
            onOpenChange={setEditOpen}
            onSave={onUpdateSource}
          />
        </>
      )}
    </>
  );
};
