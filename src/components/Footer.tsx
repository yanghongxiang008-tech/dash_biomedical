import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface FooterProps {
  className?: string;
}

const Footer = ({ className }: FooterProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isPrivate = location.pathname === '/private';
  const { t } = useI18n();

  const privateLinks = [
    { label: t('Cortex'), tab: 'home' },
    { label: t('Dashboard'), tab: 'dashboard' },
    { label: t('Pipeline'), tab: 'projects' },
    { label: t('Access'), tab: 'access' },
    { label: t('Copilot'), tab: 'analysis' },
  ];

  const publicLinks = [
    { label: t('Cortex'), tab: 'ai' },
    { label: t('Daily'), tab: 'home' },
    { label: t('Weekly'), tab: 'weekly' },
    { label: t('Chat'), tab: 'chat' },
  ];

  const accountLinks = [
    { label: t('Settings'), path: '/settings' },
  ];
  const linkClassName = "text-xs text-muted-foreground hover:text-foreground transition-colors story-link";

  const handleNavigate = (market: 'private' | 'public', tab: string) => {
    const path = market === 'private' ? '/private' : '/';
    navigate(path, { state: { activeTab: tab } });
  };

  return (
    <footer className={cn("w-full bg-muted/50 border-t border-border mt-24", className)}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Logo & About */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                AI
              </div>
              <span className="font-heading text-lg tracking-tight">Biomedical</span>
            </div>
            {/* About - Hidden */}
          </div>

          {/* Private Markets - Hidden */}

          {/* Public Markets */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-foreground">{t('Public')}</h4>
            <ul className="space-y-2">
              {publicLinks.map((link) => (
                <li key={link.tab}>
                  <button
                    onClick={() => handleNavigate('public', link.tab)}
                    className={linkClassName}
                  >
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Account - Hidden */}
        </div>

      </div>
    </footer>
  );
};

export default Footer;
