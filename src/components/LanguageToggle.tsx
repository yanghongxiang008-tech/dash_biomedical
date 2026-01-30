import React from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface LanguageToggleProps {
  className?: string;
  size?: 'sm' | 'md';
}

const LanguageToggle = ({ className, size = 'md' }: LanguageToggleProps) => {
  const { locale, setLocale, t } = useI18n();
  const baseSize = size === 'sm'
    ? "h-7 text-[11px] px-2"
    : "h-8 text-xs px-2.5";

  return (
    <div className={cn("inline-flex items-center rounded-full bg-muted/40 p-1", className)}>
      {(['en', 'zh'] as const).map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          aria-pressed={locale === lang}
          className={cn(
            "rounded-full font-medium transition-colors border-0 ring-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0",
            baseSize,
            locale === lang
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
          )}
        >
          {lang === 'en' ? t('English') : t('中文')}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
