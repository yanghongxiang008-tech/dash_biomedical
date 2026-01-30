import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PriorityBadge } from '@/components/ui/priority-badge';
import { ExternalLink, Trash2, RotateCw, Rss, Globe, FileText, Zap, Lightbulb, Headphones, FileBarChart2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ResearchSource } from '@/hooks/useResearch';
import { useI18n } from '@/i18n';

// Custom X (formerly Twitter) icon
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

interface SourceCardProps {
  source: ResearchSource;
  onClick: () => void;
  onDelete: () => void;
  onSync: () => void;
  isSyncing?: boolean;
}

// Reusable logo component with fallback chain
const SourceLogo: React.FC<{ source: ResearchSource; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }> = ({ source, size = 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  
  const sizeClasses = {
    xs: 'w-3 h-3 rounded text-[8px]',
    sm: 'w-8 h-8 rounded-lg text-sm',
    md: 'w-11 h-11 rounded-xl text-base',
    lg: 'w-14 h-14 rounded-lg text-lg',
    xl: 'w-[72px] h-[72px] rounded-xl text-lg'
  };
  
  const logoUrl = source.logo_url;
  const faviconUrl = source.favicon_url;
  
  // Show logo if available and not errored
  if (logoUrl && !imgError) {
    return (
      <div className={cn(sizeClasses[size], "bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0")}>
        <img 
          src={logoUrl} 
          alt={source.name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }
  
  // Show favicon if available and not errored
  if (faviconUrl && !faviconError) {
    return (
      <div className={cn(sizeClasses[size], "bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0")}>
        <img 
          src={faviconUrl} 
          alt="" 
          className={cn(size === 'xs' ? 'w-3 h-3' : 'w-6 h-6', 'object-contain')}
          onError={() => setFaviconError(true)}
        />
      </div>
    );
  }
  
  // Fallback to initial
  return (
    <div className={cn(sizeClasses[size], "bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm overflow-hidden flex-shrink-0")}>
      <span className="font-semibold text-foreground/70">
        {source.name.charAt(0).toUpperCase()}
      </span>
    </div>
  );
};

export { SourceLogo };

const getSourceIcon = (sourceType: string) => {
  switch (sourceType) {
    case 'rss':
      return Rss;
    case 'crawl':
      return Globe;
    default:
      return FileText;
  }
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'news':
      return <Zap className="h-3.5 w-3.5" />;
    case 'research':
      return <Lightbulb className="h-3.5 w-3.5" />;
    case 'podcast':
      return <Headphones className="h-3.5 w-3.5" />;
    case 'report':
      return <FileBarChart2 className="h-3.5 w-3.5" />;
    case 'twitter':
      return <XIcon className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
};

const getPriorityLabel = (priority: number | null | undefined) => {
  if (!priority || priority < 1) return null;
  return <PriorityBadge priority={priority} />;
};

export const SourceCard: React.FC<SourceCardProps> = ({
  source,
  onClick,
  onDelete,
  onSync,
  isSyncing
}) => {
  const { t } = useI18n();
  const SourceIcon = getSourceIcon(source.source_type);
  const hasUnread = (source.unread_count || 0) > 0;
  const isConnected = !!source.last_checked_at;
  const sourceTypeLabel = source.source_type === 'rss'
    ? 'RSS'
    : source.source_type === 'crawl'
      ? t('Web Crawl')
      : source.source_type === 'manual'
        ? t('Manual Only')
        : t('Unknown');

  return (
    <div
      className={cn(
        "group relative p-5 rounded-2xl bg-muted/30 cursor-pointer transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]",
        isSyncing && "ring-1 ring-primary/30"
      )}
      onClick={onClick}
    >
      
      {/* Unread indicator dot - top left */}
      {hasUnread && !isSyncing && (
        <span className="absolute top-3 left-3 w-2.5 h-2.5 rounded-full bg-destructive animate-pulse" />
      )}
      
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Header: Logo, Name, Priority */}
      <div className="relative flex items-start gap-3.5 mb-3">
        {/* Logo */}
        <SourceLogo source={source} size="md" />

        {/* Name and Priority */}
        <div className="flex-1 min-w-0 pr-16">
          <span className="text-sm font-semibold tracking-tight truncate block text-foreground">
            {source.name}
          </span>
          <div className="flex items-center gap-2 mt-1">
            {getPriorityLabel(source.priority)}
            {isConnected && (
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                {t('Connected')}
              </span>
            )}
          </div>
        </div>

        {/* Category icon - top right */}
        <span className="absolute top-0 right-0 text-muted-foreground/70">
          {getCategoryIcon(source.category)}
        </span>
      </div>

      {/* Separator and info area */}
      <div className="relative pt-3 border-t border-border/30">
        {/* Tags */}
        {source.tags && source.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {source.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {source.tags.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{source.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Latest article title */}
        {source.latest_item_title && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2 italic">
            {t('Latest:')} {source.latest_item_title}
          </p>
        )}

        {/* Description */}
        {source.description && !source.latest_item_title && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {source.description}
          </p>
        )}

        {/* Footer: Type, Unread count, Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SourceIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">
              {sourceTypeLabel}
            </span>
            {hasUnread && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground font-medium">
                {t('{count} new', { count: source.unread_count })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {source.source_type !== 'manual' && (
              isSyncing ? (
                <span 
                  className="text-[10px] font-medium animate-text-shimmer bg-clip-text text-transparent px-1"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, hsl(var(--muted-foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--muted-foreground)) 100%)',
                    backgroundSize: '200% auto'
                  }}
                >
                  {t('Working...')}
                </span>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSync();
                  }}
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
              )
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                window.open(source.url, '_blank');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
