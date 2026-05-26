"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Home,
  CalendarCheck,
  Ticket,
  Search,
  Monitor,
  LayoutDashboard,
  CalendarDays,
  Users,
  LogOut,
  Menu,
  X,
  Globe,
  Hospital,
  Pill,
  BarChart,
  Download,
  Code,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CLINICS, buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { usePWAInstall } from "@/lib/use-pwa";

type StaffSession = {
  id: string;
  name: string;
  role: "doctor" | "staff" | "pharmacist";
  designation: string;
  clinicAccess: string[];
} | null;

const SESSION_KEY = "clinic-staff-session";
const TOKEN_KEY = "clinic-staff-jwt";

export function getStaffSession(): StaffSession {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StaffSession;
  } catch {
    return null;
  }
}

export function setStaffSession(session: StaffSession) {
  if (typeof window === "undefined") return;
  if (session) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function setStaffAuthToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    window.sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function clearStaffSession() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SESSION_KEY);
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function Navbar() {
  const router = useRouter();
  const { activeClinicId, activeClinic, isOnline } = useClinic();
  const { lang, toggleLang, t } = useLang();
  const [session, setSession] = useState<StaffSession>(() => getStaffSession());

  useEffect(() => {
    const handleStorage = () => setSession(getStaffSession());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("staff-session-change", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("staff-session-change", handleStorage);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best effort; local cleanup still happens below.
    } finally {
      clearStaffSession();
      setSession(null);
      window.dispatchEvent(new Event("staff-session-change"));
      router.replace(buildClinicHref("/", activeClinicId));
    }
  };

  const isDoctor = session?.role === "doctor";
  const isPharmacist = session?.role === "pharmacist";

  /* Patient links */
  const patientLinks = [
    { href: "/", label: t("nav", "home"), icon: Home },
    ...(activeClinic?.hasBooking
      ? [{ href: "/book", label: t("nav", "booking"), icon: CalendarCheck }]
      : []),
    { href: "/walkin", label: t("nav", "walkin"), icon: Ticket },
    { href: "/status", label: t("nav", "myToken"), icon: Search },
    { href: "/live", label: t("nav", "live"), icon: Monitor },
  ];

  /* Staff quick-nav */
  const staffQuickNav = session
    ? [
        { href: "/", label: t("nav", "home"), icon: Home },
        ...(isPharmacist
          ? [{ href: "/pharmacy", label: t("nav", "pharmacy") || "Pharmacy", icon: Pill }]
          : [{ href: "/staff", label: t("nav", "staff"), icon: LayoutDashboard }]),
        { href: "/live", label: t("nav", "live"), icon: Monitor },
        ...(isDoctor
          ? [
              { href: "/pharmacy", label: t("nav", "pharmacy") || "Pharmacy", icon: Pill },
              { href: "/staff/schedule", label: t("nav", "schedule"), icon: CalendarDays },
              { href: "/staff/manage", label: t("nav", "staffMgmt"), icon: Users },
              { href: "/staff/reports", label: t("nav", "reports") || "Reports", icon: BarChart },
              { href: "/staff/settings", label: "Settings", icon: Hospital },
            ]
          : []),
        ...(!isPharmacist && !isDoctor
          ? [
              { href: "/staff/schedule", label: t("nav", "schedule"), icon: CalendarDays },
              { href: "/staff/reports", label: t("nav", "reports") || "Reports", icon: BarChart },
            ]
          : []),
      ]
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(247,239,225,0.88)] backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      {/* Main bar */}
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-4 py-2.5">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-[var(--accent-strong)]"
        >
          <img src="/logo-wide.png" alt="Panwar Health Care" className="h-8 w-auto sm:h-9 object-contain drop-shadow-sm" />
        </Link>

        {/* Clinic Switcher — desktop */}
        <div className="hidden items-center gap-1 md:flex">
          {CLINICS.map((clinic) => (
            <Link
              key={clinic.id}
              href={buildClinicHref("/", clinic.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                clinic.id === activeClinicId
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[rgba(19,49,58,0.55)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              }`}
            >
              {clinic.shortName}
            </Link>
          ))}
        </div>

        {/* Desktop nav (patient) */}
        {!session && (
          <nav className="hidden items-center gap-0.5 lg:flex">
            {patientLinks.map((item) => (
              <Link
                key={item.href}
                href={
                  item.href === "/"
                    ? `/?clinic=${activeClinicId}`
                    : buildClinicHref(item.href, activeClinicId)
                }
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[rgba(19,49,58,0.62)] transition-all hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2">
          {/* Online status indicator */}
          <div 
            className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] font-semibold transition-colors ${
              isOnline 
                ? "border-[rgba(73,181,109,0.3)] bg-[rgba(220,250,228,0.6)] text-[var(--success)]" 
                : "border-[rgba(192,57,43,0.3)] bg-[rgba(250,220,220,0.6)] text-[var(--danger)]"
            }`}
            title={isOnline ? "System is Online & Syncing" : "Offline Cached Mode"}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse-dot" : "bg-red-500"}`} />
            <span className="hidden xs:inline">{isOnline ? "Online" : "Offline"}</span>
          </div>

          <button
            type="button"
            onClick={toggleLang}
            className="btn btn-ghost btn-sm"
            aria-label="Toggle language"
            title={lang === "hi" ? "Switch to English" : "हिंदी में बदलें"}
          >
            <Globe className="h-3.5 w-3.5" />
            {lang === "hi" ? "EN" : "हि"}
          </button>

          {!session && (
            <a
              href="tel:+919636243621"
              className="flex items-center gap-1.5 rounded-full bg-[rgba(15,107,99,0.1)] px-3 py-1.5 text-xs font-bold text-[var(--accent-strong)] transition-colors hover:bg-[rgba(15,107,99,0.2)] border border-[rgba(15,107,99,0.2)]"
              aria-label="Call Clinic"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Call Clinic</span>
            </a>
          )}

          {session && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <span className="badge badge-booking">
                {session.role === "doctor" ? "👨‍⚕️" : "👤"} {session.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  void handleLogout();
                }}
                className="btn btn-danger btn-sm"
              >
                <LogOut className="h-3 w-3" />
                {t("nav", "logout")}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Clinic Pill Scroller (Telegram Style) */}
      <div className="border-t border-[rgba(19,49,58,0.05)] bg-[rgba(247,239,225,0.6)] backdrop-blur-md overflow-x-auto scrollbar-hide md:hidden">
        <div className="flex gap-2 px-4 py-2 min-w-max">
          <span className="flex items-center text-[10px] font-bold text-[rgba(19,49,58,0.5)] uppercase tracking-wider pr-1">Clinics</span>
          {CLINICS.map((clinic) => (
            <Link
              key={clinic.id}
              href={buildClinicHref("/", clinic.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                clinic.id === activeClinicId
                  ? "bg-[linear-gradient(135deg,var(--accent-deep),var(--accent))] text-white shadow-md shadow-[var(--accent)]/30"
                  : "bg-white/60 border border-[var(--line)] text-[rgba(19,49,58,0.7)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
              }`}
            >
              {clinic.shortName}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
