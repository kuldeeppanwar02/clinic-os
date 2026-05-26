"use client";

import { useState, useEffect } from "react";

export interface PWAInstallState {
  isInstallable: boolean;
  isIOS: boolean;
  isStandalone: boolean;
  install: () => Promise<void>;
  hasSeenBanner: boolean;
  markBannerSeen: () => void;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasSeenBanner, setHasSeenBanner] = useState(true); // default true to prevent flash

  useEffect(() => {
    // Check local storage for banner state
    const seen = localStorage.getItem("hasSeenAppPrompt");
    if (!seen) {
      setHasSeenBanner(false);
    }

    // Check if standalone (already installed)
    const isStandAloneMatch = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandAlone = (window.navigator as any).standalone === true;
    if (isStandAloneMatch || isIOSStandAlone) {
      setIsStandalone(true);
    }

    // Check if iOS
    const ua = window.navigator.userAgent;
    const webkit = !!ua.match(/WebKit/i);
    const isIPad = !!ua.match(/iPad/i);
    const isIPhone = !!ua.match(/iPhone/i);
    const isIOSDevice = isIPad || isIPhone;
    setIsIOS(isIOSDevice && webkit && !ua.match(/CriOS/i));

    // Listen for beforeinstallprompt for Android/Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const markBannerSeen = () => {
    localStorage.setItem("hasSeenAppPrompt", "true");
    setHasSeenBanner(true);
  };

  const install = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS && !isStandalone) {
      // Basic fallback alert if the UI modal isn't enough, 
      // but ideally the UI component handles the iOS instructions visually.
      alert("अपने iPhone में ऐप डालने के लिए:\n\n1. नीचे दिए गए Share [⍗] बटन को दबाएं\n2. 'Add to Home Screen' [+] को चुनें।");
    }
  };

  // It's considered installable if we have a prompt OR if it's iOS and not already installed
  const isInstallable = !!deferredPrompt || (isIOS && !isStandalone);

  return {
    isInstallable,
    isIOS,
    isStandalone,
    install,
    hasSeenBanner,
    markBannerSeen
  };
}
