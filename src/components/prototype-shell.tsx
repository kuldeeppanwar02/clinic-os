"use client";

import Link from "next/link";
import { CLINICS, buildClinicHref } from "@/features/clinic/catalog";
import { useClinic } from "@/features/clinic/state/clinic-provider";

type PrototypeShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
};

const navItems = [
  { href: "/", label: "होम" },
  { href: "/book", label: "बुकिंग" },
  { href: "/walkin", label: "Walk-in" },
  { href: "/status", label: "मेरा टोकन" },
  { href: "/staff", label: "स्टाफ" },
  { href: "/live", label: "Live Queue" },
];

export function PrototypeShell({
  eyebrow,
  title,
  description,
  children,
  aside,
}: PrototypeShellProps) {
  const { activeClinic, activeClinicId, isOnline, syncInFlight, state } = useClinic();

  return (
    <div className="page-shell">
      <header className="section-shell pt-6">
        <div className="surface-panel rounded-[2rem] px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <Link href="/" className="display-type text-2xl text-[var(--accent-strong)]">
                PANWAR SMARTCARE HUB
              </Link>
              <p className="mt-1 text-sm text-[rgba(19,49,58,0.68)]">
                Hindi-first multi-clinic queue, booking aur pharmacy-ready PWA
              </p>
            </div>

            <nav className="flex flex-wrap gap-2 text-sm font-semibold text-[rgba(19,49,58,0.76)]">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={buildClinicHref(item.href, activeClinicId)}
                  className="focus-ring rounded-full border border-[var(--line)] px-3 py-2 transition hover:border-[var(--accent)] hover:text-[var(--accent-strong)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {CLINICS.map((clinic) => (
              <Link
                key={clinic.id}
                href={buildClinicHref("/", clinic.id)}
                className={`focus-ring rounded-full px-4 py-2 text-sm font-semibold transition ${
                  clinic.id === activeClinicId
                    ? "bg-[var(--accent)] text-white"
                    : "border border-[var(--line)] bg-white/60 hover:border-[var(--accent)]"
                }`}
              >
                {clinic.shortName}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="section-shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section className="surface-panel-strong rounded-[2.4rem] p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--accent)]">
              {eyebrow}
            </p>
            <h1 className="display-type balance-text mt-4 text-4xl leading-tight text-[var(--accent-strong)] sm:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-[rgba(19,49,58,0.76)]">
              {description}
            </p>
            <div className="mt-8">{children}</div>
          </section>

          <aside className="space-y-4">
            <div className="surface-panel rounded-[2rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Active Clinic
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[rgba(19,49,58,0.78)]">
                <p className="text-lg font-semibold text-[var(--accent-strong)]">
                  {activeClinic.title}
                </p>
                <p>{activeClinic.subtitle}</p>
                {activeClinic.metaLine && (
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                    {activeClinic.metaLine}
                  </p>
                )}
                <p>{activeClinic.locationLabel}</p>
                <p>क्लिनिक समय: {activeClinic.hoursLabel}</p>
                <p>फोन / WhatsApp: {activeClinic.phone}</p>
              </div>
            </div>

            <div className="surface-panel rounded-[2rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Sync Status
              </p>
              <div className="mt-4 space-y-3 text-sm leading-7 text-[rgba(19,49,58,0.78)]">
                <p>
                  Mode:{" "}
                  <strong>{isOnline ? "Online live sync" : "Offline cached view"}</strong>
                </p>
                <p>
                  Queue entries: <strong>{state.queue.length}</strong>
                </p>
                <p>
                  Background sync: <strong>{syncInFlight ? "चल रहा है" : "idle"}</strong>
                </p>
                <p>
                  Last updated:{" "}
                  <strong>
                    {new Date(state.lastUpdated).toLocaleTimeString("en-IN")}
                  </strong>
                </p>
              </div>
            </div>

            {aside}

            <div className="surface-panel rounded-[2rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--accent)]">
                Live Setup Note
              </p>
              <p className="mt-3 text-sm leading-7 text-[rgba(19,49,58,0.76)]">
                Patient aur staff dono same website use karte hain. Network weak hone par
                provisional local token save hota hai aur internet aate hi sync ho jata hai.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
