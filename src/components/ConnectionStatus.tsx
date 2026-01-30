import React from 'react';
import { Database, Globe, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import NotionIcon from './NotionIcon';
import GeminiIcon from './GeminiIcon';
import { useI18n } from '@/i18n';

interface ConnectionStatusProps {
  hasDatabase: boolean;
  hasNotion: boolean;
  hasWeb: boolean;
  onToggleDatabase?: () => void;
  onToggleNotion?: () => void;
  onToggleWeb?: () => void;
}

const StatusItem = ({ 
  icon: Icon, 
  label, 
  connected, 
  customIcon,
  onClick,
  disabled,
}: { 
  icon?: React.ElementType; 
  label: string; 
  connected: boolean;
  customIcon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all",
      connected 
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
        : "bg-muted text-muted-foreground hover:bg-muted/80",
      onClick && !disabled && "cursor-pointer hover:opacity-80",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {customIcon || (Icon && <Icon className="w-3.5 h-3.5" />)}
    <span className="font-medium">{label}</span>
    {connected ? (
      <Check className="w-3 h-3 ml-auto" />
    ) : (
      <X className="w-3 h-3 ml-auto opacity-50" />
    )}
  </button>
);

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  hasDatabase,
  hasNotion,
  hasWeb,
  onToggleDatabase,
  onToggleNotion,
  onToggleWeb,
}) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* Model on the left */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <GeminiIcon size={14} />
        <span>Gemini 3 Pro</span>
        <span className="text-[10px] opacity-60">· ~$0.02/query</span>
      </div>
      
      {/* Connections on the right */}
      <div className="flex items-center gap-2">
        <StatusItem 
          icon={Database} 
          label={t('Database')}
          connected={hasDatabase}
          disabled={true}
        />
        <StatusItem 
          label="Notion" 
          connected={hasNotion}
          customIcon={<NotionIcon size={14} />}
          onClick={onToggleNotion}
        />
        <StatusItem 
          icon={Globe} 
          label={t('Web')}
          connected={hasWeb}
          onClick={onToggleWeb}
        />
      </div>
    </div>
  );
};

export default ConnectionStatus;
