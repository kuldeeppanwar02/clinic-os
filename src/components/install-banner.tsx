"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { usePWAInstall } from "@/lib/use-pwa";

export function InstallBanner() {
  const { isInstallable, isStandalone, install, hasSeenBanner, markBannerSeen, isIOS } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    if (!isStandalone && !hasSeenBanner && (isInstallable || isIOS)) {
      // Delay showing the banner slightly for better UX
      const showTimer = setTimeout(() => {
        setVisible(true);
      }, 1000);

      // Auto-hide after 6 seconds (1s delay + 5s visible)
      const hideTimer = setTimeout(() => {
        handleDismiss();
      }, 6000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [isStandalone, hasSeenBanner, isInstallable, isIOS]);

  const handleDismiss = () => {
    setVisible(false);
    markBannerSeen();
  };

  const handleInstallClick = () => {
    handleDismiss();
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      install();
    }
  };

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center">
        <div className="w-full max-w-sm rounded-[24px] bg-white p-6 shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-bold text-gray-900">ऐप इंस्टॉल करें</h3>
            <button onClick={() => setShowIOSInstructions(false)} className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4 text-gray-700 font-medium">
            <p>अपने iPhone में आसानी से ऐप डालने के लिए:</p>
            <ol className="list-decimal pl-5 space-y-3">
              <li>स्क्रीन के नीचे दिए गए <strong>Share</strong> बटन (चौकोर बॉक्स से ऊपर जाता हुआ तीर) को दबाएं।</li>
              <li>थोड़ा नीचे स्क्रॉल करें और <strong>"Add to Home Screen"</strong> चुनें।</li>
              <li>सबसे ऊपर दाईं ओर <strong>"Add"</strong> पर टैप करें।</li>
            </ol>
          </div>
          <button 
            onClick={() => setShowIOSInstructions(false)}
            className="mt-6 w-full rounded-2xl bg-[var(--accent)] py-3.5 font-bold text-white transition-transform active:scale-95 shadow-lg shadow-[var(--accent)]/30"
          >
            समझ गया
          </button>
        </div>
      </div>
    );
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 sm:bottom-6 sm:left-auto sm:right-6 sm:w-96 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="flex items-center gap-3 rounded-[20px] bg-[#1a2320] p-3 pl-4 shadow-2xl border border-[rgba(255,255,255,0.1)]">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(103,237,170,0.15)] text-[#67edaa]">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">आसानी से अपॉइंटमेंट के लिए</p>
          <p className="text-[11px] font-medium text-[rgba(255,255,255,0.6)]">क्लिनिक का ऐप फोन में रखें</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleInstallClick}
            className="rounded-full bg-[#67edaa] px-4 py-1.5 text-xs font-bold text-[#1a2320] transition-transform active:scale-95 shadow-[0_0_15px_rgba(103,237,170,0.3)]"
          >
            इंस्टॉल
          </button>
          <button 
            onClick={handleDismiss}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[rgba(255,255,255,0.4)] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
