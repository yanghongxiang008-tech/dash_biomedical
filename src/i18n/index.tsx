import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale, translations } from './strings';

interface I18nContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key) => key,
});

const resolveInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  // Force default to English, ignore any stored language setting
  return DEFAULT_LOCALE;
};

export const I18nProvider = ({ children }: { children: React.ReactNode }) => {
  const [locale, setLocale] = useState<Locale>(resolveInitialLocale);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  const t = useMemo(() => {
    return (key: string, vars?: Record<string, string | number>) => {
      const dict = translations[locale] || {};
      const fallback = translations.en || {};
      let template = dict[key] || fallback[key] || key;
      if (vars) {
        Object.entries(vars).forEach(([name, value]) => {
          template = template.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value));
        });
      }
      if (import.meta.env.DEV && dict[key] === undefined && fallback[key] === undefined) {
        console.warn(`[i18n] Missing key: ${key}`);
      }
      return template;
    };
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
