"use client";

import { createContext, use, useCallback, useEffect, useState } from "react";
import { type Lang, type TranslationKey, getTranslation } from "./translations";

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
  t: (section: TranslationKey, key: string) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

const STORAGE_KEY = "clinic-lang";

function readStoredLang(): Lang {
  if (typeof window === "undefined") return "hi";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" ? "en" : "hi";
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  useEffect(() => {
    document.documentElement.setAttribute("data-lang", lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.setAttribute("data-lang", next);
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "hi" ? "en" : "hi");
  }, [lang, setLang]);

  const t = useCallback(
    (section: TranslationKey, key: string) => getTranslation(section, key, lang),
    [lang],
  );

  return (
    <LangContext value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LangContext>
  );
}

export function useLang() {
  const context = use(LangContext);
  if (!context) {
    throw new Error("useLang must be used within LangProvider");
  }
  return context;
}
