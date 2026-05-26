"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Pill,
  Clock,
  CheckCircle2,
  Loader2,
  Eye,
  X,
  AlertTriangle,
  RefreshCw,
  Package,
} from "lucide-react";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { useLang } from "@/i18n/lang-provider";
import { getStaffSession } from "@/components/navbar";
import { supabase } from "@/lib/supabase/client";

type PrescriptionItem = {
  id: string;
  clinicId: string;
  tokenId: string;
  patientName: string;
  date: string;
  photoCount: number;
  status: "sent" | "preparing" | "ready" | "collected";
  createdAt: string;
};

type PrescriptionDetail = PrescriptionItem & {
  photoUrls: string[];
};

export default function PharmacyPage() {
  useClinic();
  const { t } = useLang();
  const [session, setSession] = useState<{ role: string } | null>(() => getStaffSession());
  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState<PrescriptionDetail | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => {
    const sync = () => setSession(getStaffSession());
    window.addEventListener("staff-session-change", sync);
    return () => window.removeEventListener("staff-session-change", sync);
  }, []);

  const isAuthorized = session?.role === "pharmacist" || session?.role === "doctor";

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await fetch("/api/prescriptions");
      if (res.ok) {
        const data = await res.json();
        // Filter out collected prescriptions so they don't clutter the main view
        const activePrescriptions = (data.prescriptions || []).filter(
          (p: PrescriptionItem) => p.status !== "collected"
        );
        setPrescriptions(activePrescriptions);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + WebSocket listener
  useEffect(() => {
    if (!isAuthorized) return;
    
    void fetchPrescriptions();

    const channel = supabase
      .channel(`pharmacy_rx_changes_${Math.random()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prescriptions" },
        () => {
          void fetchPrescriptions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthorized, fetchPrescriptions]);

  const viewPhotos = async (rx: PrescriptionItem) => {
    setViewLoading(true);
    try {
      const res = await fetch(`/api/prescriptions/${rx.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewing(data.prescription);
      }
    } catch {
      alert("Failed to load photos");
    } finally {
      setViewLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "preparing" | "ready" | "collected") => {
    try {
      await fetch("/api/prescriptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescriptionId: id, status }),
      });
      // Update locally
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p)),
      );
    } catch {
      alert("Failed to update status");
    }
  };

  // Not authorized
  if (!isAuthorized) {
    return (
      <div className="page-shell">
        <section className="section-shell pt-12 pb-12">
          <div className="card p-8 text-center max-w-md mx-auto">
            <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-[var(--warm-soft)]">
              <AlertTriangle className="h-8 w-8 text-[var(--warm)]" />
            </div>
            <h2 className="mt-4 text-xl font-bold text-[var(--accent-strong)]">
              {t("prescription", "pharmacyLogin") || "फार्मेसी लॉगिन आवश्यक"}
            </h2>
            <p className="mt-2 text-sm text-[rgba(19,49,58,0.6)]">
              {t("prescription", "loginPrompt") || "फार्मेसी PIN से स्टाफ लॉगिन करें"}
            </p>
            <a href="/staff" className="btn btn-primary mt-4 inline-flex">
              {t("nav", "staff") || "Staff Login"}
            </a>
          </div>
        </section>
      </div>
    );
  }

  const sentCount = prescriptions.filter((p) => p.status === "sent").length;
  const preparingCount = prescriptions.filter((p) => p.status === "preparing").length;
  const readyCount = prescriptions.filter((p) => p.status === "ready").length;

  return (
    <div className="page-shell">
      <section className="section-shell pt-6 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent)]">
              <Pill className="h-3.5 w-3.5" />
              {t("prescription", "pharmacyDashboard") || "फार्मेसी डैशबोर्ड"}
            </p>
            <h1 className="mt-1 text-2xl font-bold text-[var(--accent-strong)]">
              {t("prescription", "prescriptions") || "प्रिस्क्रिप्शन"}
            </h1>
          </div>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => { setLoading(true); void fetchPrescriptions(); }}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin-slow" : ""}`} />
          </button>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="card p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--warm)]">
              {t("prescription", "newLabel") || "नई"}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--warm)]">{sentCount}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--accent)]">
              <Package className="mx-auto mb-0.5 h-3 w-3" />
              {t("prescription", "preparing") || "तैयार हो रही"}
            </p>
            <p className="mt-1 text-2xl font-bold">{preparingCount}</p>
          </div>
          <div className="card p-3 text-center">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-[var(--success)]">
              <CheckCircle2 className="mx-auto mb-0.5 h-3 w-3" />
              {t("prescription", "ready") || "तैयार ✓"}
            </p>
            <p className="mt-1 text-2xl font-bold text-[var(--success)]">{readyCount}</p>
          </div>
        </div>

        {/* Prescription List */}
        <div className="mt-5 space-y-2 stagger-children">
          {loading ? (
            <div className="flex flex-col items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin-slow text-[var(--accent)]" />
              <p className="mt-3 text-sm text-[rgba(19,49,58,0.5)]">
                {t("common", "loading") || "लोड हो रहा है..."}
              </p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="card flex flex-col items-center py-10 text-center">
              <Pill className="h-10 w-10 text-[rgba(19,49,58,0.15)]" />
              <p className="mt-3 text-sm font-medium text-[rgba(19,49,58,0.45)]">
                {t("prescription", "noPhotos") || "आज कोई प्रिस्क्रिप्शन नहीं"}
              </p>
            </div>
          ) : (
            prescriptions.map((rx) => (
              <div
                key={rx.id}
                className={`card fade-up p-4 transition-all ${
                  rx.status === "sent"
                    ? "border-l-4 border-l-[var(--warm)]"
                    : rx.status === "preparing"
                      ? "border-l-4 border-l-[var(--accent)]"
                      : "border-l-4 border-l-[var(--success)] opacity-75"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-bold">{rx.tokenId}</span>
                      <span
                        className={`badge ${
                          rx.status === "sent"
                            ? "badge-walkin"
                            : rx.status === "preparing"
                              ? "badge-in-progress"
                              : "badge-done"
                        }`}
                      >
                        {rx.status === "sent"
                          ? "🔔 नई"
                          : rx.status === "preparing"
                            ? "🟡 तैयार हो रही"
                            : "✅ तैयार"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm font-medium">{rx.patientName}</p>
                    <p className="flex items-center gap-1 text-xs text-[rgba(19,49,58,0.5)]">
                      <Clock className="h-3 w-3" />
                      {new Date(rx.createdAt).toLocaleTimeString("hi-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · "}
                      {rx.photoCount} {t("prescription", "photoCount") || "फोटो"}
                    </p>
                  </div>

                  {/* View Photos Button */}
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={() => void viewPhotos(rx)}
                    disabled={viewLoading}
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Status Actions */}
                <div className="mt-3 flex gap-2">
                  {rx.status === "sent" && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm flex-1"
                      onClick={() => void updateStatus(rx.id, "preparing")}
                    >
                      <Package className="h-3 w-3" />
                      {t("prescription", "markPreparing") || "तैयार कर रहे हैं"}
                    </button>
                  )}
                  {(rx.status === "sent" || rx.status === "preparing") && (
                    <button
                      type="button"
                      className="btn btn-sm flex-1"
                      style={{ background: "var(--success)", color: "white" }}
                      onClick={() => void updateStatus(rx.id, "ready")}
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {t("prescription", "markReady") || "तैयार ✓"}
                    </button>
                  )}
                  {rx.status === "ready" && (
                    <button
                      type="button"
                      className="btn btn-sm flex-1"
                      style={{ background: "var(--accent-strong)", color: "white" }}
                      onClick={() => void updateStatus(rx.id, "collected")}
                    >
                      <Package className="h-3 w-3" />
                      {t("prescription", "markCollected") || "दे दी गई (Collected)"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Photo Viewer Modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.8)] px-4">
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
              onClick={() => setViewing(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <div className="card overflow-hidden">
              <div className="bg-[var(--accent-soft)] px-4 py-3">
                <p className="text-sm font-bold text-[var(--accent-strong)]">
                  {viewing.tokenId} — {viewing.patientName}
                </p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-4 space-y-3">
                {viewing.photoUrls.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Prescription ${i + 1}`}
                    className="w-full rounded-lg border border-[var(--line)]"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
