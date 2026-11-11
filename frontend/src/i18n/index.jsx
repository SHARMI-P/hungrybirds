// Tiny i18n layer: English + Kannada, no extra library needed.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import en from './en';
import kn from './kn';

const DICTS = { en, kn };
const KEY = 'hungrybirds_lang';
// eslint-disable-next-line react-refresh/only-export-components
export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'kn', label: 'ಕನ್ನಡ', short: 'ಕ' },
];

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => en[k] ?? k });

const initial = () => {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && DICTS[saved]) return saved;
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.startsWith('kn') ? 'kn' : 'en';
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(initial);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key, vars) => {
      const text = DICTS[lang][key] ?? en[key] ?? key;
      return vars ? text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')) : text;
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang: setLangState, t, locale: lang === 'kn' ? 'kn-IN' : 'en-IN' }), [lang, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useT = () => useContext(LanguageContext);
