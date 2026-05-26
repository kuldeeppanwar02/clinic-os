"use client";

import { useEffect, useState } from "react";
import { useClinic } from "@/features/clinic/state/clinic-provider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

const PWA_PROMPT_STORAGE_KEY = "clinic-pwa-prompt-dismissed-until";
const PWA_PROMPT_SHOW_DELAY_MS = 1400;
const PWA_PROMPT_AUTO_HIDE_MS = 9000;
const PWA_PROMPT_COOLDOWN_MS = 12 * 60 * 60 * 1000;

function readDismissedUntil() {
  if (typeof window === "undefined") {
    return 0;
  }

  return Number(window.localStorage.getItem(PWA_PROMPT_STORAGE_KEY) ?? 0);
}

function rememberDismissal(durationMs = PWA_PROMPT_COOLDOWN_MS) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    PWA_PROMPT_STORAGE_KEY,
    String(Date.now() + durationMs),
  );
}

export function PwaShell() {
  const { isOnline, syncInFlight } = useClinic();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const displayMode = window.matchMedia("(display-mode: standalone)");

    const updateMode = () => {
      const standaloneNavigator = window.navigator as Navigator & {
        standalone?: boolean;
      };

      setIsStandalone(displayMode.matches || standaloneNavigator.standalone === true);
    };

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    updateMode();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    displayMode.addEventListener("change", updateMode);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      displayMode.removeEventListener("change", updateMode);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isStandalone) {
      return;
    }

    if (readDismissedUntil() > Date.now()) {
      return;
    }

    const showTimer = window.setTimeout(() => {
      setIsPromptVisible(true);
    }, PWA_PROMPT_SHOW_DELAY_MS);

    const hideTimer = window.setTimeout(() => {
      setIsPromptVisible(false);
      rememberDismissal();
    }, PWA_PROMPT_SHOW_DELAY_MS + PWA_PROMPT_AUTO_HIDE_MS);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isStandalone]);

  const dismissPrompt = () => {
    setIsPromptVisible(false);
    rememberDismissal();
  };

  const installApp = async () => {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    dismissPrompt();
  };

  return (
    <>
      {!isOnline ? (
        <div className="fixed left-1/2 top-4 z-50 w-[min(92vw,52rem)] -translate-x-1/2 rounded-full border border-[#b65d36]/25 bg-[#fff3ea]/95 px-4 py-3 text-sm text-[#7a3b20] shadow-[0_14px_40px_rgba(182,93,54,0.16)] backdrop-blur">
          Internet abhi available nahi hai. App shell aur recent queue data cache se
          dikh raha hai. Form submit karne par entry local pending state mein save hogi.
        </div>
      ) : null}

      {!isStandalone && isPromptVisible ? (
        <div className="fixed bottom-4 right-4 z-40 w-[min(92vw,24rem)] rounded-[1.5rem] border border-[var(--line)] bg-[rgba(255,248,238,0.96)] p-4 text-sm text-[var(--foreground)] shadow-[0_22px_70px_rgba(19,49,58,0.16)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                PWA Shortcut
              </p>
              <p className="mt-2 text-base font-semibold">
                Add to Home Screen se app jaisa use kar sakte hain.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close PWA popup"
              onClick={dismissPrompt}
              className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 text-sm font-semibold text-[rgba(19,49,58,0.72)] transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
            >
              Close
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-[rgba(19,49,58,0.76)]">
            Chrome ya Safari menu se shortcut add ho jayega. Agar abhi nahi karna ho to
            popup khud hide ho jayega.
          </p>

          {syncInFlight ? (
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--accent)]">
              Syncing cached actions...
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            {installPrompt ? (
              <button
                className="focus-ring rounded-full bg-[var(--accent)] px-4 py-2 font-semibold text-white transition hover:bg-[var(--accent-strong)] active:scale-[0.98]"
                onClick={installApp}
                type="button"
              >
                Home Screen par jodein
              </button>
            ) : (
              <span className="rounded-full bg-[rgba(15,107,99,0.1)] px-4 py-2 font-semibold text-[var(--accent-strong)]">
                Menu &gt; Add to Home Screen
              </span>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
