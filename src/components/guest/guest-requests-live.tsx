"use client";

import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiClock, FiLoader, FiRefreshCw, FiXCircle } from "react-icons/fi";

type Request = {
  id: number;
  item_name_en: string;
  item_name_ar: string;
  quantity: number;
  notes: string | null;
  request_status: string;
  created_at: string;
};

type Props = {
  token: string;
  lang: "ar" | "en";
  initialRequests: Request[];
};

const statusConfig: Record<string, { color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { color: "bg-amber-100 text-amber-800", icon: FiClock },
  accepted: { color: "bg-blue-100 text-blue-800", icon: FiClock },
  in_progress: { color: "bg-indigo-100 text-indigo-800", icon: FiLoader },
  completed: { color: "bg-emerald-100 text-emerald-800", icon: FiCheckCircle },
  cancelled: { color: "bg-slate-100 text-slate-500", icon: FiXCircle },
};

const statusLabels: Record<string, [string, string]> = {
  pending: ["معلّق", "Pending"],
  accepted: ["مقبول", "Accepted"],
  in_progress: ["قيد التنفيذ", "In Progress"],
  completed: ["مكتمل", "Completed"],
  cancelled: ["ملغى", "Cancelled"],
};

export function GuestRequestsLive({ token, lang, initialRequests }: Props) {
  const [requests, setRequests] = useState<Request[]>(initialRequests);
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await fetch(`/api/guest/requests?token=${encodeURIComponent(token)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
    } catch {
      // ignore network error
    }
  }, [token]);

  useEffect(() => {
    const interval = setInterval(fetchRequests, 5_000);
    const onNewRequest = () => fetchRequests();
    window.addEventListener("guest-request-change", onNewRequest);
    return () => {
      clearInterval(interval);
      window.removeEventListener("guest-request-change", onNewRequest);
    };
  }, [fetchRequests]);

  if (requests.length === 0) return null;

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">
          {t("طلباتي", "My Requests")}
        </h2>
        <button
          onClick={fetchRequests}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label={t("تحديث", "Refresh")}
        >
          <FiRefreshCw className="h-4 w-4" />
        </button>
      </div>
      <div className="space-y-2">
        {requests.map((r) => {
          const cfg = statusConfig[r.request_status] ?? statusConfig.pending;
          const Icon = cfg.icon;
          const label = statusLabels[r.request_status];
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 bg-white p-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {lang === "ar" ? r.item_name_ar : r.item_name_en}
                  {r.quantity > 1 ? (
                    <span className="ms-1 text-xs text-slate-400">×{r.quantity}</span>
                  ) : null}
                </p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.color}`}
                >
                  <Icon className="h-3 w-3" />
                  {label ? t(label[0], label[1]) : r.request_status}
                </span>
              </div>
              {/* Status timeline */}
              <div className="mt-2 flex items-center gap-1">
                {["pending", "accepted", "in_progress", "completed"].map((step, i) => {
                  const steps = ["pending", "accepted", "in_progress", "completed"];
                  const currentIdx = steps.indexOf(r.request_status);
                  const reached = r.request_status !== "cancelled" && i <= currentIdx;
                  return (
                    <div key={step} className="flex flex-1 items-center gap-1">
                      <div
                        className={`h-1.5 w-full rounded-full ${reached ? "bg-blue-500" : "bg-slate-200"}`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <p className="text-[10px] text-slate-400">
                  {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar" : "en", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
                {r.notes ? (
                  <p className="text-[10px] text-slate-400 truncate max-w-[50%]">{r.notes}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
