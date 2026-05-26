"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  Monitor,
  Ticket,
  Search,
  Menu,
  X,
  Download,
  Hospital,
  CalendarCheck,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { CLINICS, buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession } from "@/components/navbar";
import { usePWAInstall } from "@/lib/use-pwa";

export function PatientBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeClinicId, activeClinic } = useClinic();
  const { t } = useLang();
  const { isInstallable, install, isIOS } = usePWAInstall();
  
  const [session, setSession] = useState(getStaffSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const [developerExpanded, setDeveloperExpanded] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const handleStorage = () => setSession(getStaffSession());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("staff-session-change", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("staff-session-change", handleStorage);
    };
  }, []);

  if (session) return null;

  const isActive = (path: string) => {
    if (path === "/" && (pathname === "/" || pathname === `/${activeClinicId}`)) return true;
    return pathname.startsWith(path) && path !== "/";
  };

  const hasBooking = activeClinic?.hasBooking;
  const tokenHref = hasBooking ? "/book" : "/walkin";
  const tokenIcon = hasBooking ? CalendarCheck : Ticket;
  const tokenLabel = hasBooking ? t("nav", "booking") : t("nav", "walkin");

  return (
    <>
      {/* Floating Bottom Pill */}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-1 rounded-full border border-white/60 bg-white/80 px-2 py-2 shadow-[0_8px_32px_rgba(15,107,99,0.15)] backdrop-blur-xl w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
        
        <Link
          href={`/?clinic=${activeClinicId}`}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all ${
            isActive("/") ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]" : "text-[rgba(19,49,58,0.55)] hover:text-[var(--accent)]"
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-bold">{t("nav", "home")}</span>
        </Link>

        <Link
          href={buildClinicHref("/live", activeClinicId)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all ${
            isActive("/live") ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]" : "text-[rgba(19,49,58,0.55)] hover:text-[var(--accent)]"
          }`}
        >
          <Monitor className="h-5 w-5" />
          <span className="text-[10px] font-bold">{t("nav", "live")}</span>
        </Link>

        <Link
          href={buildClinicHref(tokenHref, activeClinicId)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all shadow-sm ${
            isActive(tokenHref) ? "bg-[var(--accent-deep)] text-white shadow-md shadow-[var(--accent)]/30" : "bg-[var(--accent)] text-white shadow-[var(--accent)]/20 hover:scale-105"
          }`}
        >
          {hasBooking ? <CalendarCheck className="h-5 w-5" /> : <Ticket className="h-5 w-5" />}
          <span className="text-[10px] font-bold">{tokenLabel}</span>
        </Link>

        <button
          onClick={() => setMenuOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all ${
            menuOpen ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]" : "text-[rgba(19,49,58,0.55)] hover:text-[var(--accent)]"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-bold">Menu</span>
        </button>

      </div>

      {/* Bottom Sheet Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity animate-in fade-in" 
            onClick={() => setMenuOpen(false)} 
          />
          <div className="relative w-full rounded-t-3xl bg-[#fbf3e5] px-6 pb-24 pt-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/20" />
            
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-[var(--accent-strong)]">Patient Menu</h3>
                <p className="text-sm font-medium text-[rgba(19,49,58,0.6)]">
                  {activeClinic?.shortName} Clinic
                </p>
              </div>
              <button 
                onClick={() => setMenuOpen(false)} 
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)] transition-transform active:scale-90"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <Link
                href={buildClinicHref("/status", activeClinicId)}
                onClick={() => setMenuOpen(false)}
                className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors hover:bg-[rgba(15,107,99,0.05)]"
              >
                <Search className="h-6 w-6 text-[var(--accent)]" />
                <span className="text-xs font-bold text-[rgba(19,49,58,0.8)] text-center">{t("nav", "myToken")}</span>
              </Link>
              
              <button
                onClick={() => {
                  setMenuOpen(false);
                  if (isIOS) {
                    setShowIOSInstructions(true);
                  } else if (isInstallable) {
                    install();
                  }
                }}
                className={`flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors ${
                  isInstallable || isIOS ? "hover:bg-[rgba(15,107,99,0.05)] opacity-100" : "opacity-50 grayscale cursor-not-allowed"
                }`}
                disabled={!isInstallable && !isIOS}
              >
                <Download className={`h-6 w-6 ${isInstallable || isIOS ? "text-[var(--accent)]" : "text-gray-400"}`} />
                <span className="text-xs font-bold text-[rgba(19,49,58,0.8)] text-center">Install App</span>
              </button>
            </div>



            <Link
              href={buildClinicHref("/staff", activeClinicId)}
              onClick={() => setMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[rgba(15,107,99,0.05)] p-4 text-sm font-bold text-[var(--accent-strong)] transition-colors hover:bg-[rgba(15,107,99,0.1)] border border-[rgba(15,107,99,0.1)]"
            >
              <Hospital className="h-4 w-4" /> Staff Login
            </Link>

            {/* Developer Watermark */}
            <div className="mt-4 pt-4 border-t border-[rgba(19,49,58,0.1)] flex flex-col items-center">
              <button 
                onClick={() => setDeveloperExpanded(!developerExpanded)}
                className="text-[11px] font-medium text-[rgba(19,49,58,0.5)] transition-colors hover:text-[var(--accent)] flex items-center gap-1"
              >
                Designed & Developed by <span className="font-bold underline decoration-[rgba(19,49,58,0.2)] underline-offset-2">Kuldeep Panwar</span>
                {developerExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {developerExpanded && (
                <div className="mt-3 flex w-full flex-col gap-2 animate-in slide-in-from-top-2">
                  <a href="tel:+919358752147" className="flex items-center justify-center gap-2 rounded-xl bg-[rgba(15,107,99,0.03)] p-2.5 text-xs font-bold text-[var(--accent-strong)] transition-colors hover:bg-[rgba(15,107,99,0.08)]">
                    <Phone className="h-3.5 w-3.5" /> +91 9358752147
                  </a>
                  <a href="mailto:panwarkuldeep256@gmail.com" className="flex items-center justify-center gap-2 rounded-xl bg-[rgba(15,107,99,0.03)] p-2.5 text-xs font-bold text-[var(--accent-strong)] transition-colors hover:bg-[rgba(15,107,99,0.08)]">
                    <Mail className="h-3.5 w-3.5" /> panwarkuldeep256@gmail.com
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSInstructions && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm p-4 sm:items-center">
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
      )}
    </>
  );
}
