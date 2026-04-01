"use client";

import { useState } from "react";
import { FiChevronDown, FiChevronUp, FiPlus } from "react-icons/fi";
import type { ActiveReservationOption, ServiceItemOption } from "@/lib/data";
import { AppSelect } from "@/components/ui/app-select";
import { AppModal } from "@/components/ui/app-modal";

type Props = {
  lang: "ar" | "en";
  reservations: ActiveReservationOption[];
  serviceItems: ServiceItemOption[];
  returnTo: string;
};

export function CreateRequestForm({ lang, reservations, serviceItems, returnTo }: Props) {
  const [open, setOpen] = useState(false);
  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);

  // Group service items by category
  const grouped = new Map<string, ServiceItemOption[]>();
  for (const item of serviceItems) {
    const cat = lang === "ar" ? item.category_name_ar : item.category_name_en;
    const arr = grouped.get(cat) ?? [];
    arr.push(item);
    grouped.set(cat, arr);
  }

  return (
    <section className="mt-4">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        <FiPlus className="h-4 w-4" />
        {t("إنشاء طلب جديد", "Create New Request")}
        {open ? <FiChevronUp className="h-4 w-4" /> : <FiChevronDown className="h-4 w-4" />}
      </button>

      <AppModal
        open={open}
        onClose={() => setOpen(false)}
        title={t("إنشاء طلب جديد", "Create New Request")}
        closeLabel={t("إلغاء", "Cancel")}
        maxWidthClass="max-w-3xl"
      >
        <form
          action="/api/service-requests"
          method="post"
          className="mt-1 rounded-2xl bg-white/5 p-2"
        >
          <input type="hidden" name="lang" value={lang} />
          <input type="hidden" name="action" value="create" />
          <input type="hidden" name="returnTo" value={returnTo} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Reservation */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("الحجز (الضيف / الغرفة)", "Reservation (Guest / Room)")}
              </label>
              <AppSelect
                name="reservationId"
                required
                className="w-full"
              >
                <option value="">{t("اختر حجزاً", "Select a reservation")}</option>
                {reservations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.guest_name} — {t("الغرفة", "Room")} {r.room_number}
                  </option>
                ))}
              </AppSelect>
            </div>

            {/* Service item */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("الخدمة", "Service")}
              </label>
              <AppSelect
                name="serviceItemId"
                required
                className="w-full"
              >
                <option value="">{t("اختر خدمة", "Select a service")}</option>
                {[...grouped.entries()].map(([category, items]) => (
                  <optgroup key={category} label={category}>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {lang === "ar" ? item.name_ar : item.name_en}
                        {item.estimated_cost ? ` ($${item.estimated_cost})` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </AppSelect>
            </div>

            {/* Quantity */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("الكمية", "Quantity")}
              </label>
              <input
                type="number"
                name="quantity"
                min={1}
                max={50}
                defaultValue={1}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>

            {/* Scheduled time */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("الوقت المجدول (اختياري)", "Scheduled Time (optional)")}
              </label>
              <input
                type="datetime-local"
                name="scheduledAt"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">
                {t("ملاحظات (اختياري)", "Notes (optional)")}
              </label>
              <input
                type="text"
                name="notes"
                maxLength={500}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                placeholder={t("ملاحظة إضافية...", "Additional note...")}
              />
            </div>
          </div>

          <div className="mt-4">
            <button className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
              {t("إنشاء الطلب", "Create Request")}
            </button>
          </div>
        </form>
      </AppModal>
    </section>
  );
}
