import React from 'react';
import { Brain, LayoutDashboard, FolderKanban, Users, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/i18n';

interface PrivateNavigationProps {
  activeTab?: 'home' | 'dashboard' | 'projects' | 'access' | 'analysis';
  onTabChange?: (tab: 'home' | 'dashboard' | 'projects' | 'access' | 'analysis') => void;
}

const PrivateNavigation = ({ activeTab = 'home', onTabChange }: PrivateNavigationProps) => {
  const isMobile = useIsMobile();
  const { t } = useI18n();
  
  const tabs = [
    { id: 'home' as const, label: t('Cortex'), icon: Brain },
    { id: 'dashboard' as const, label: t('Dashboard'), icon: LayoutDashboard },
    { id: 'projects' as const, label: t('Pipeline'), icon: FolderKanban },
    { id: 'access' as const, label: t('Access'), icon: Users },
    { id: 'analysis' as const, label: t('Copilot'), icon: Sparkles },
  ];

  return (
    <nav className={cn(
      "fixed z-50 bg-background/70 backdrop-blur-2xl border border-border/25 rounded-xl shadow-lg shadow-black/5 flex items-center",
      isMobile 
        ? "bottom-4 left-1/2 -translate-x-1/2 px-2 py-1.5" 
        : "top-3 left-1/2 -translate-x-1/2 px-1.5 py-1"
    )}>
      <div className={cn("flex items-center", isMobile ? "gap-1" : "gap-0.5")}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "group flex items-center rounded-lg font-medium transition-all duration-200 focus-ring",
                isMobile ? "gap-2 px-4 py-2.5 text-sm" : "gap-1.5 px-3 py-1.5 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              title={tab.label}
            >
              <Icon className={cn(
                "transition-transform duration-200 group-hover:scale-110",
                isMobile ? "h-5 w-5" : "h-3.5 w-3.5"
              )} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default PrivateNavigation;
