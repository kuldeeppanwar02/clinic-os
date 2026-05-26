"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  CalendarDays,
  Menu,
  Pill,
  Users,
  BarChart,
  Hospital,
  LogOut,
  X,
  Code,
  Phone,
  Mail,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CLINICS, buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession, clearStaffSession } from "@/components/navbar";

export function StaffBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { activeClinicId } = useClinic();
  const { t } = useLang();
  
  const [session, setSession] = useState(getStaffSession());
  const [menuOpen, setMenuOpen] = useState(false);
  const [developerExpanded, setDeveloperExpanded] = useState(false);

  useEffect(() => {
    const handleStorage = () => setSession(getStaffSession());
    window.addEventListener("storage", handleStorage);
    window.addEventListener("staff-session-change", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("staff-session-change", handleStorage);
    };
  }, []);

  if (!session) return null;

  const isDoctor = session.role === "doctor";
  const isPharmacist = session.role === "pharmacist";

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearStaffSession();
    setSession(null);
    window.dispatchEvent(new Event("staff-session-change"));
    setMenuOpen(false);
    router.replace(buildClinicHref("/", activeClinicId));
  };

  const isActive = (path: string) => {
    if (path === "/" && (pathname === "/" || pathname === `/${activeClinicId}`)) return true;
    return pathname.startsWith(path) && path !== "/";
  };

  // Main 3 icons based on role
  const mainNav = [
    { href: "/", label: t("nav", "home"), icon: Home },
    ...(isPharmacist
      ? [{ href: "/pharmacy", label: t("nav", "pharmacy") || "Pharmacy", icon: Pill }]
      : [{ href: "/staff", label: t("nav", "staff"), icon: LayoutDashboard }]),
    ...(isDoctor
      ? [{ href: "/staff/schedule", label: t("nav", "schedule"), icon: CalendarDays }]
      : !isPharmacist 
        ? [{ href: "/staff/schedule", label: t("nav", "schedule"), icon: CalendarDays }]
        : []),
  ];

  return (
    <>
      {/* Floating Bottom Pill */}
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center justify-between gap-1 rounded-full border border-white/60 bg-white/80 px-2 py-2 shadow-[0_8px_32px_rgba(15,107,99,0.15)] backdrop-blur-xl w-[calc(100%-2rem)] max-w-sm sm:max-w-md">
        {mainNav.map((item) => (
          <Link
            key={item.href}
            href={
              item.href === "/"
                ? `/?clinic=${activeClinicId}`
                : buildClinicHref(item.href, activeClinicId)
            }
            className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all ${
              isActive(item.href)
                ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]"
                : "text-[rgba(19,49,58,0.55)] hover:text-[var(--accent)]"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold">{item.label}</span>
          </Link>
        ))}

        {/* Menu Button */}
        <button
          onClick={() => setMenuOpen(true)}
          className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-full py-1.5 transition-all ${
            menuOpen
              ? "bg-[rgba(15,107,99,0.1)] text-[var(--accent-strong)]"
              : "text-[rgba(19,49,58,0.55)] hover:text-[var(--accent)]"
          }`}
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-bold">More</span>
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
                <h3 className="text-xl font-bold text-[var(--accent-strong)]">Menu</h3>
                <p className="text-sm font-medium text-[rgba(19,49,58,0.6)]">
                  {session.role === "doctor" ? "👨‍⚕️" : "👤"} {session.name}
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
              {isDoctor && (
                <>
                  <Link
                    href={buildClinicHref("/pharmacy", activeClinicId)}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors hover:bg-[rgba(15,107,99,0.05)]"
                  >
                    <Pill className="h-6 w-6 text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[rgba(19,49,58,0.8)]">Pharmacy</span>
                  </Link>
                  <Link
                    href={buildClinicHref("/staff/manage", activeClinicId)}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors hover:bg-[rgba(15,107,99,0.05)]"
                  >
                    <Users className="h-6 w-6 text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[rgba(19,49,58,0.8)]">Staff Mgmt</span>
                  </Link>
                  <Link
                    href={buildClinicHref("/staff/settings", activeClinicId)}
                    onClick={() => setMenuOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors hover:bg-[rgba(15,107,99,0.05)]"
                  >
                    <Hospital className="h-6 w-6 text-[var(--accent)]" />
                    <span className="text-xs font-bold text-[rgba(19,49,58,0.8)]">Settings</span>
                  </Link>
                </>
              )}
              {(!isPharmacist) && (
                <Link
                  href={buildClinicHref("/staff/reports", activeClinicId)}
                  onClick={() => setMenuOpen(false)}
                  className="flex flex-col items-center gap-2 rounded-2xl bg-white p-4 shadow-sm border border-[rgba(19,49,58,0.05)] transition-colors hover:bg-[rgba(15,107,99,0.05)]"
                >
                  <BarChart className="h-6 w-6 text-[var(--accent)]" />
                  <span className="text-xs font-bold text-[rgba(19,49,58,0.8)]">Reports</span>
                </Link>
              )}
            </div>

            {/* Developer Section */}
            <div className="mb-4 rounded-2xl bg-white border border-[rgba(19,49,58,0.05)] overflow-hidden">
              <button
                onClick={() => setDeveloperExpanded(!developerExpanded)}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-[rgba(19,49,58,0.02)]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                    <Code className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-[rgba(19,49,58,0.8)]">Developer Contact</span>
                </div>
                {developerExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
              </button>

              {developerExpanded && (
                <div className="flex flex-col gap-2 px-4 pb-4 animate-in slide-in-from-top-2">
                  <a href="tel:+919358752147" className="flex items-center gap-3 rounded-xl bg-green-50 p-3 text-sm font-bold text-green-700">
                    <Phone className="h-4 w-4" /> 9358752147
                  </a>
                  <a href="mailto:panwarkuldeep256@gmail.com" className="flex items-center gap-3 rounded-xl bg-blue-50 p-3 text-sm font-bold text-blue-700">
                    <Mail className="h-4 w-4" /> panwarkuldeep256@gmail.com
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => void handleLogout()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fff0f0] p-4 text-sm font-bold text-red-600 transition-colors hover:bg-[#ffe5e5]"
            >
              <LogOut className="h-4 w-4" /> {t("nav", "logout")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
