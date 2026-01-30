import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type MarketType = 'public' | 'private';

interface MarketSwitcherProps {
  currentMarket: MarketType;
  onMarketChange: (market: MarketType) => void;
}

const MarketSwitcher = ({ currentMarket, onMarketChange }: MarketSwitcherProps) => {
  const { t } = useI18n();
  const currentLabel = currentMarket === 'public' ? t('Public') : t('Private');
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors outline-none">
          <span>{currentLabel}</span>
          <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="min-w-[80px] p-1 bg-popover border border-border shadow-lg">
        <DropdownMenuItem
          onClick={() => onMarketChange('public')}
          className={cn(
            "text-xs cursor-pointer px-2 py-1",
            currentMarket === 'public' ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          {t('Public')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onMarketChange('private')}
          className={cn(
            "text-xs cursor-pointer px-2 py-1",
            currentMarket === 'private' ? "text-foreground font-medium" : "text-muted-foreground"
          )}
        >
          {t('Private')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MarketSwitcher;
