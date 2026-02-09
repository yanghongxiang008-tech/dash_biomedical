import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Brain, CalendarDays, TrendingUp, MessageSquare, BookOpen, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/i18n';

interface NavigationProps {
  activeTab?: 'ai' | 'home' | 'weekly' | 'chat' | 'admin' | 'research' | 'summary';
  onTabChange?: (tab: 'ai' | 'home' | 'weekly' | 'chat' | 'admin') => void;
  isAdmin?: boolean;
}

const Navigation = ({ activeTab = 'home', onTabChange, isAdmin = false }: NavigationProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const [showResearch, setShowResearch] = React.useState(() => {
    return localStorage.getItem('showResearchTab') === 'true';
  });
  const [showCortex, setShowCortex] = React.useState(() => {
    return localStorage.getItem('showCortexTab') === 'true';
  });

  React.useEffect(() => {
    const handleToggle = () => {
      setShowResearch(localStorage.getItem('showResearchTab') === 'true');
      setShowCortex(localStorage.getItem('showCortexTab') === 'true');
    };
    window.addEventListener('toggle-navigation-tabs', handleToggle);
    window.addEventListener('toggle-research', handleToggle); // For backward compatibility
    return () => {
      window.removeEventListener('toggle-navigation-tabs', handleToggle);
      window.removeEventListener('toggle-research', handleToggle);
    };
  }, []);

  // Determine the current effective active tab
  const isResearchPage = location.pathname === '/research';
  const isSummaryPage = location.pathname === '/summary';
  const currentActiveTab = isResearchPage ? 'research' : isSummaryPage ? 'summary' : activeTab;

  const showChat = false;
  const tabs = [
    { id: 'home' as const, label: t('Daily'), icon: CalendarDays },
    { id: 'weekly' as const, label: t('Weekly'), icon: TrendingUp },
    { id: 'summary' as const, label: t('Summary'), icon: Sparkles },
    ...(showCortex ? [{ id: 'ai' as const, label: t('Cortex'), icon: Brain }] : []),
    ...(showResearch ? [{ id: 'research' as const, label: t('Research'), icon: BookOpen }] : []),
    ...(!isAdmin && showChat ? [
      { id: 'chat' as const, label: t('Chat'), icon: MessageSquare },
    ] : []),
  ];

  const handleTabClick = (tabId: string) => {
    if (tabId === 'research') {
      navigate('/research');
    } else if (tabId === 'summary') {
      navigate('/summary');
    } else {
      if (isResearchPage || isSummaryPage) {
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
                isMobile ? "gap-2 px-4 py-3 min-h-[44px] text-sm" : "gap-1.5 px-3 py-1.5 text-xs",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : tab.id === 'summary'
                    ? "bg-gradient-to-r from-amber-200/70 via-fuchsia-200/60 to-sky-200/70 text-foreground/90 hover:from-amber-200/80 hover:via-fuchsia-200/70 hover:to-sky-200/80 opacity-90"
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
