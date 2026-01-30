import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, CalendarDays, TrendingUp, MessageSquare, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/i18n';

interface NavigationProps {
  activeTab?: 'ai' | 'home' | 'weekly' | 'chat' | 'admin' | 'research';
  onTabChange?: (tab: 'ai' | 'home' | 'weekly' | 'chat' | 'admin') => void;
  isAdmin?: boolean;
}

const Navigation = ({ activeTab = 'ai', onTabChange, isAdmin = false }: NavigationProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  // Determine if we're on the research page
  const isResearchPage = location.pathname === '/research';
  const currentActiveTab = isResearchPage ? 'research' : activeTab;
  
  const showChat = false;
  const tabs = [
    { id: 'ai' as const, label: t('Cortex'), icon: Brain },
    { id: 'home' as const, label: t('Daily'), icon: CalendarDays },
    { id: 'weekly' as const, label: t('Weekly'), icon: TrendingUp },
    { id: 'research' as const, label: t('Research'), icon: BookOpen },
    ...(!isAdmin && showChat ? [
      { id: 'chat' as const, label: t('Chat'), icon: MessageSquare },
    ] : []),
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'research') {
      navigate('/research');
    } else {
      if (isResearchPage) {
        // Navigate back to main page with the selected tab
        navigate('/', { state: { activeTab: tabId } });
      } else {
        onTabChange?.(tabId as 'ai' | 'home' | 'weekly' | 'chat' | 'admin');
      }
    }
  };

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
          const isActive = currentActiveTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "group flex items-center rounded-lg font-medium transition-all duration-200 focus-ring",
                // Ensure minimum 44px touch target on mobile for accessibility
                isMobile ? "gap-2 px-4 py-3 min-h-[44px] text-sm" : "gap-1.5 px-3 py-1.5 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 active:scale-95"
              )}
            >
              <Icon className={cn(
                "transition-transform duration-200 group-hover:scale-110 group-active:scale-95",
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

export default Navigation;
