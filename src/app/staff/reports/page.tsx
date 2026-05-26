"use client";

import { useEffect, useState } from "react";
import { useClinic } from "@/features/clinic/state/clinic-provider";
import { CalendarDays, Search, Users, Activity, FileText } from "lucide-react";
import type { PatientVisit } from "@/lib/db/patient-history";
import { getStaffSession } from "@/components/navbar";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const router = useRouter();
  const { activeClinicId } = useClinic();
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  
  const [loading, setLoading] = useState(false);
  const [visits, setVisits] = useState<PatientVisit[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const session = getStaffSession();
    if (!session || (session.role !== "doctor" && session.role !== "staff")) {
      router.replace("/staff");
    } else {
      fetchReports();
    }
  }, [activeClinicId]);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports?clinicId=${activeClinicId}&startDate=${startDate}&endDate=${endDate}`);
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setVisits(data.visits || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPatients = visits.length;
  const walkIns = visits.filter(v => v.source === "walk-in").length;
  const bookings = visits.filter(v => v.source === "booking").length;

  return (
    <div className="page-shell">
      <div className="section-shell py-6">
        <div>
          <h1 className="display-type text-xl text-[var(--accent-strong)] flex items-center gap-2">
            <FileText className="h-5 w-5" /> Analytics & Reports
          </h1>
          <p className="mt-1 text-xs text-[rgba(19,49,58,0.6)]">
            Purane patient records aur total checkup counts dekhein.
          </p>
        </div>

        <div className="mt-6 card p-4 flex flex-col sm:flex-row gap-3 items-end">
          <label className="block w-full sm:w-auto">
            <span className="mb-1 text-xs font-medium text-[rgba(19,49,58,0.6)]">Start Date</span>
            <input 
              type="date" 
              className="input w-full" 
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
            />
          </label>
          <label className="block w-full sm:w-auto">
            <span className="mb-1 text-xs font-medium text-[rgba(19,49,58,0.6)]">End Date</span>
            <input 
              type="date" 
              className="input w-full" 
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
            />
          </label>
          <button 
            type="button" 
            className="btn btn-primary w-full sm:w-auto"
            onClick={fetchReports}
            disabled={loading}
          >
            <Search className="h-4 w-4" /> {loading ? "Searching..." : "Search"}
          </button>
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="card bg-[var(--accent-soft)] p-4 border border-[var(--accent)]/20">
            <p className="text-[10px] uppercase font-bold text-[var(--accent)]"><Users className="inline h-3 w-3 mr-1" />Total</p>
            <p className="mt-1 text-2xl font-bold text-[var(--accent-strong)]">{totalPatients}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] uppercase font-bold text-[rgba(19,49,58,0.5)]">Walk-ins</p>
            <p className="mt-1 text-xl font-bold">{walkIns}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] uppercase font-bold text-[rgba(19,49,58,0.5)]">Bookings</p>
            <p className="mt-1 text-xl font-bold">{bookings}</p>
          </div>
        </div>

        <div className="mt-6 card p-4 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-[var(--line)] text-[rgba(19,49,58,0.5)] text-xs">
                <th className="pb-2 font-semibold">Date</th>
                <th className="pb-2 font-semibold">Token</th>
                <th className="pb-2 font-semibold">Patient Name</th>
                <th className="pb-2 font-semibold">Mobile</th>
                <th className="pb-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {visits.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-gray-500">No records found for this date range.</td>
                </tr>
              )}
              {visits.map((v) => (
                <tr key={v.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--accent-soft)] transition-colors">
                  <td className="py-2.5 text-xs text-[rgba(19,49,58,0.7)]">{new Date(v.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                  <td className="py-2.5 font-bold text-[var(--accent)]">{v.token}</td>
                  <td className="py-2.5 font-medium">{v.name}</td>
                  <td className="py-2.5 text-xs">{v.mobile || "N/A"}</td>
                  <td className="py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.source === 'walk-in' ? 'bg-[#e2f1eb] text-[#1f7a54]' : 'bg-[#e7eff9] text-[#2c5f99]'}`}>
                      {v.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
