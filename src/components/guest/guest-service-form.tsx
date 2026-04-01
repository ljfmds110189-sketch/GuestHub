"use client";

import { useState } from "react";
import {
  FiBriefcase,
  FiCalendar,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiCoffee,
  FiDroplet,
  FiFileText,
  FiHeart,
  FiHome,
  FiMessageSquare,
  FiMonitor,
  FiNavigation,
  FiPackage,
  FiSettings,
  FiShield,
  FiStar,
  FiTool,
} from "react-icons/fi";
import type { ServiceCategory, ServiceItem } from "@/lib/data";
import type { AppLang } from "@/lib/i18n";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FiCoffee,
  FiHome,
  FiDroplet,
  FiCalendar,
  FiTool,
  FiNavigation,
  FiHeart,
  FiFileText,
  FiBriefcase,
  FiMonitor,
  FiMessageSquare,
  FiSettings,
  FiShield,
  FiPackage,
  FiStar,
};

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  food_beverage:   { bg: "bg-orange-100",  text: "text-orange-600",  ring: "hover:border-orange-300" },
  housekeeping:    { bg: "bg-sky-100",     text: "text-sky-600",     ring: "hover:border-sky-300" },
  laundry:         { bg: "bg-violet-100",  text: "text-violet-600",  ring: "hover:border-violet-300" },
  facilities:      { bg: "bg-emerald-100", text: "text-emerald-600", ring: "hover:border-emerald-300" },
  transport:       { bg: "bg-blue-100",    text: "text-blue-600",    ring: "hover:border-blue-300" },
  wellness:        { bg: "bg-pink-100",    text: "text-pink-600",    ring: "hover:border-pink-300" },
  stay_management: { bg: "bg-indigo-100",  text: "text-indigo-600",  ring: "hover:border-indigo-300" },
  maintenance:     { bg: "bg-amber-100",   text: "text-amber-600",   ring: "hover:border-amber-300" },
  business:        { bg: "bg-slate-100",   text: "text-slate-600",   ring: "hover:border-slate-400" },
  entertainment:   { bg: "bg-purple-100",  text: "text-purple-600",  ring: "hover:border-purple-300" },
  communication:   { bg: "bg-teal-100",    text: "text-teal-600",    ring: "hover:border-teal-300" },
  room_settings:   { bg: "bg-gray-100",    text: "text-gray-600",    ring: "hover:border-gray-400" },
  safety:          { bg: "bg-red-100",     text: "text-red-600",     ring: "hover:border-red-300" },
  convenience:     { bg: "bg-cyan-100",    text: "text-cyan-600",    ring: "hover:border-cyan-300" },
  feedback:        { bg: "bg-yellow-100",  text: "text-yellow-600",  ring: "hover:border-yellow-300" },
};
const defaultColor = { bg: "bg-blue-100", text: "text-blue-600", ring: "hover:border-blue-300" };

type CategoryWithItems = ServiceCategory & { items: ServiceItem[] };

type Props = {
  token: string;
  categories: CategoryWithItems[];
  lang: AppLang;
};

export function GuestServiceForm({ token, categories, lang }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithItems | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const t = (ar: string, en: string) => (lang === "ar" ? ar : en);
  const BackIcon = lang === "ar" ? FiChevronRight : FiChevronLeft;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    const form = new FormData(e.currentTarget);
    form.set("token", token);
    form.set("lang", lang);

    try {
      const res = await fetch("/api/guest/request", { method: "POST", body: form });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResult({ ok: true, message: data.message });
        (e.target as HTMLFormElement).reset();
        setSelectedCategory(null);
        window.dispatchEvent(new CustomEvent("guest-request-change"));
      } else {
        setResult({ ok: false, message: data.error ?? t("حدث خطأ", "Something went wrong") });
      }
    } catch {
      setResult({ ok: false, message: t("خطأ في الاتصال", "Connection error") });
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <FiCheck className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
        <p className="text-sm font-medium text-emerald-800">{result.message}</p>
        <button
          onClick={() => setResult(null)}
          className="mt-4 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white"
        >
          {t("طلب خدمة أخرى", "Request Another Service")}
        </button>
      </div>
    );
  }

  /* ─── Category picker ──────────────────────────────────────────── */
  if (!selectedCategory) {
    return (
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        {result && !result.ok ? (
          <p className="col-span-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {result.message}
          </p>
        ) : null}
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon ?? ""] ?? FiHome;
          const color = colorMap[cat.slug] ?? defaultColor;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat)}
              className={`flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-center transition hover:shadow ${color.ring}`}
            >
              <div className={`grid h-12 w-12 place-items-center rounded-xl ${color.bg} ${color.text}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {lang === "ar" ? cat.name_ar : cat.name_en}
                </p>
                <p className="text-[11px] text-slate-400">
                  {cat.items.length} {t("خدمة", "services")}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  /* ─── Service item selection & submission ─────────────────────── */
  return (
    <div>
      <button
        onClick={() => {
          setSelectedCategory(null);
          setResult(null);
        }}
        className="mb-3 inline-flex items-center gap-1 text-sm text-blue-600"
      >
        <BackIcon className="h-4 w-4" />
        {t("رجوع للفئات", "Back to categories")}
      </button>

      <h3 className="mb-3 text-base font-semibold text-slate-900">
        {lang === "ar" ? selectedCategory.name_ar : selectedCategory.name_en}
      </h3>

      {result && !result.ok ? (
        <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {result.message}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Service item */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t("اختر الخدمة", "Choose service")}
          </label>
          <div className="space-y-2">
            {selectedCategory.items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50"
              >
                <input
                  type="radio"
                  name="serviceItemId"
                  value={item.id}
                  required
                  className="mt-1 accent-blue-600"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">
                    {lang === "ar" ? item.name_ar : item.name_en}
                  </p>
                  {(lang === "ar" ? item.description_ar : item.description_en) ? (
                    <p className="text-xs text-slate-400">
                      {lang === "ar" ? item.description_ar : item.description_en}
                    </p>
                  ) : null}
                </div>
                {item.estimated_cost ? (
                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                    ${item.estimated_cost}
                  </span>
                ) : (
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-600">
                    {t("مجاني", "Free")}
                  </span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t("الكمية", "Quantity")}
          </label>
          <input
            type="number"
            name="quantity"
            defaultValue={1}
            min={1}
            max={10}
            className="w-24 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>

        {/* Scheduled time (optional) */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t("وقت التوصيل المفضل (اختياري)", "Preferred time (optional)")}
          </label>
          <input
            type="datetime-local"
            name="scheduledAt"
            className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t("ملاحظات إضافية", "Additional notes")}
          </label>
          <textarea
            name="notes"
            rows={2}
            maxLength={500}
            placeholder={t("مثال: بدون ملح، حار جداً", "e.g. no salt, extra spicy")}
            className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition disabled:opacity-50"
        >
          {submitting
            ? t("جارٍ الإرسال…", "Submitting…")
            : t("إرسال الطلب", "Submit Request")}
        </button>
      </form>
    </div>
  );
}
