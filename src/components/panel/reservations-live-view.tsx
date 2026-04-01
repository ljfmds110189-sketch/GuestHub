"use client";

import { useMemo, useState } from "react";
import { FiCheckCircle, FiClock, FiLogIn, FiUser, FiXCircle } from "react-icons/fi";
import { AppModal } from "@/components/ui/app-modal";
import { AppSelect } from "@/components/ui/app-select";

export type ReservationStatus = "booked" | "checked_in" | "checked_out" | "cancelled";

type Row = {
  id: number;
  guest_id: number;
  room_id: number;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  reservation_status: ReservationStatus;
};

type BoardItem = {
  id: number;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  reservation_status: ReservationStatus;
};

type Props = {
  lang: "ar" | "en";
  initialRows: Row[];
  allReservations: BoardItem[];
  guestOptions: Array<{ id: number; full_name: string }>;
  roomOptions: Array<{ id: number; room_number: string; room_type: string }>;
};

const statuses: ReservationStatus[] = ["booked", "checked_in", "checked_out", "cancelled"];

function statusMeta(lang: "ar" | "en") {
  return {
    booked: {
      label: lang === "ar" ? "محجوز" : "Booked",
      cardBg: "bg-[rgba(251,191,36,0.12)]",
      cardBorder: "border-amber-400/30",
      columnBg: "bg-[rgba(251,191,36,0.08)]",
      columnBorder: "border-amber-400/20",
      dotColor: "bg-amber-400",
      badgeClass: "bg-[rgba(251,191,36,0.22)] text-amber-50 ring-1 ring-amber-200/50",
      Icon: FiClock,
    },
    checked_in: {
      label: lang === "ar" ? "تم تسجيل الدخول" : "Checked In",
      cardBg: "bg-[rgba(59,130,246,0.12)]",
      cardBorder: "border-blue-400/30",
      columnBg: "bg-[rgba(59,130,246,0.08)]",
      columnBorder: "border-blue-400/20",
      dotColor: "bg-blue-400",
      badgeClass: "bg-[rgba(59,130,246,0.24)] text-blue-50 ring-1 ring-blue-200/50",
      Icon: FiLogIn,
    },
    checked_out: {
      label: lang === "ar" ? "مكتمل" : "Completed",
      cardBg: "bg-[rgba(16,185,129,0.12)]",
      cardBorder: "border-emerald-400/30",
      columnBg: "bg-[rgba(16,185,129,0.08)]",
      columnBorder: "border-emerald-400/20",
      dotColor: "bg-emerald-400",
      badgeClass: "bg-[rgba(16,185,129,0.24)] text-emerald-50 ring-1 ring-emerald-200/50",
      Icon: FiCheckCircle,
    },
    cancelled: {
      label: lang === "ar" ? "ملغي" : "Cancelled",
      cardBg: "bg-[rgba(244,63,94,0.12)]",
      cardBorder: "border-rose-400/30",
      columnBg: "bg-[rgba(244,63,94,0.08)]",
      columnBorder: "border-rose-400/20",
      dotColor: "bg-rose-400",
      badgeClass: "bg-[rgba(244,63,94,0.24)] text-rose-50 ring-1 ring-rose-200/50",
      Icon: FiXCircle,
    },
  } as const;
}

function StatusBadge({ status, lang }: { status: ReservationStatus; lang: "ar" | "en" }) {
  const meta = statusMeta(lang)[status];
  const Icon = meta.Icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.badgeClass}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

function formatTime(value: string) {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${ampm}`;
}

export function ReservationsLiveView({ lang, initialRows, allReservations, guestOptions, roomOptions }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [boardItems, setBoardItems] = useState<BoardItem[]>(allReservations);
  const [editReservation, setEditReservation] = useState<Row | null>(null);
  const [deleteReservation, setDeleteReservation] = useState<Row | null>(null);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);

  const meta = useMemo(() => statusMeta(lang), [lang]);

  const columns = useMemo(() => {
    return statuses.map((status) => ({
      status,
      items: boardItems.filter((item) => item.reservation_status === status),
    }));
  }, [boardItems]);

  async function handleStatusChange(itemId: number, newStatus: ReservationStatus) {
    setStatusChanging(itemId);
    try {
      const res = await fetch("/api/reservations/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ id: itemId, reservation_status: newStatus, sort_order: 0 }],
        }),
      });
      if (res.ok) {
        setBoardItems((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, reservation_status: newStatus } : it)),
        );
        setRows((prev) =>
          prev.map((r) => (r.id === itemId ? { ...r, reservation_status: newStatus } : r)),
        );
      }
    } finally {
      setStatusChanging(null);
    }
  }

  return (
    <>
      {/* Status Board */}
      <section className="mb-4 rounded-2xl bg-[rgba(255,255,255,0.10)] p-4 shadow-[0_10px_24px_rgba(2,6,23,0.24)] backdrop-blur-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">
          {lang === "ar" ? "لوحة الحجوزات" : "Reservations Board"}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const sm = meta[col.status];
            return (
              <div
                key={col.status}
                className={`rounded-2xl border ${sm.columnBorder} ${sm.columnBg} p-3 backdrop-blur-sm`}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${sm.dotColor}`} />
                  <h3 className="text-sm font-semibold text-white">{sm.label}</h3>
                  <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/70">
                    {col.items.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {col.items.length === 0 && (
                    <p className="py-6 text-center text-xs text-white/40">
                      {lang === "ar" ? "لا توجد حجوزات" : "No reservations"}
                    </p>
                  )}
                  {col.items.map((item) => (
                    <article
                      key={item.id}
                      className={`rounded-xl border ${sm.cardBorder} ${sm.cardBg} p-3 backdrop-blur-sm transition hover:bg-white/[0.08]`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-white/80">
                          <FiUser className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.guest_name}</p>
                          <p className="text-xs text-white/60">#{item.room_number}</p>
                        </div>
                      </div>
                      <div className="mt-2.5 space-y-1 text-xs text-white/65">
                        <div className="flex items-center justify-between">
                          <span>{lang === "ar" ? "الدخول" : "In"}</span>
                          <span className="text-white/80">{formatDate(item.check_in)} · {formatTime(item.check_in)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{lang === "ar" ? "الخروج" : "Out"}</span>
                          <span className="text-white/80">{formatDate(item.check_out)} · {formatTime(item.check_out)}</span>
                        </div>
                      </div>

                      {/* Quick status change */}
                      <div className="mt-3 flex flex-wrap gap-1">
                        {statuses
                          .filter((s) => s !== col.status)
                          .map((s) => {
                            const target = meta[s];
                            return (
                              <button
                                key={s}
                                type="button"
                                disabled={statusChanging === item.id}
                                onClick={() => handleStatusChange(item.id, s)}
                                className={`rounded-lg px-2 py-1 text-[10px] font-medium text-white/80 transition ${target.cardBg} border ${target.cardBorder} hover:bg-white/15 disabled:opacity-40`}
                              >
                                {target.label}
                              </button>
                            );
                          })}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Table */}
      <section className="mb-4 overflow-hidden rounded-2xl bg-[rgba(255,255,255,0.14)] shadow-[0_10px_24px_rgba(2,6,23,0.24)] backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-[rgba(255,255,255,0.18)] text-white/80">
              <tr>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "الضيف" : "Guest"}</th>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "الغرفة" : "Room"}</th>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "الدخول" : "Check in"}</th>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "الخروج" : "Check out"}</th>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "الحالة" : "Status"}</th>
                <th className="px-4 py-3 text-left">{lang === "ar" ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((reservation) => (
                <tr key={reservation.id} className="text-white/90 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
                  <td className="px-4 py-3 font-medium">{reservation.guest_name}</td>
                  <td className="px-4 py-3">#{reservation.room_number}</td>
                  <td className="px-4 py-3 text-xs text-white/85">{new Date(reservation.check_in).toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-white/85">{new Date(reservation.check_out).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={reservation.reservation_status} lang={lang} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setEditReservation(reservation)}
                        className="rounded-lg bg-cyan-400/25 px-3 py-1.5 text-xs font-semibold text-cyan-50 transition hover:bg-cyan-400/35"
                      >
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteReservation(reservation)}
                        className="rounded-lg bg-rose-400/25 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/35"
                      >
                        {lang === "ar" ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Modal */}
      <AppModal
        open={Boolean(editReservation)}
        onClose={() => setEditReservation(null)}
        title={lang === "ar" ? "تعديل الحجز" : "Edit Reservation"}
        closeLabel={lang === "ar" ? "إلغاء" : "Cancel"}
      >
        {editReservation ? (
          <form action="/api/reservations" method="post" className="mt-4 grid gap-3 md:grid-cols-2">
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="returnTo" value={`/${lang}/reservations`} />
            <input type="hidden" name="action" value="update" />
            <input type="hidden" name="reservationId" value={editReservation.id} />

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{lang === "ar" ? "الضيف" : "Guest"}</span>
              <AppSelect name="guestId" defaultValue={editReservation.guest_id} required>
                {guestOptions.map((guest) => (
                  <option key={guest.id} value={guest.id} className="text-slate-900">
                    {guest.full_name}
                  </option>
                ))}
              </AppSelect>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{lang === "ar" ? "الغرفة" : "Room"}</span>
              <AppSelect name="roomId" defaultValue={editReservation.room_id} required>
                {roomOptions.map((room) => (
                  <option key={room.id} value={room.id} className="text-slate-900">
                    {room.room_number} - {room.room_type}
                  </option>
                ))}
              </AppSelect>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{lang === "ar" ? "الدخول" : "Check in"}</span>
              <input
                name="checkIn"
                type="datetime-local"
                defaultValue={toInputDateTime(editReservation.check_in)}
                required
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-white/80">{lang === "ar" ? "الخروج" : "Check out"}</span>
              <input
                name="checkOut"
                type="datetime-local"
                defaultValue={toInputDateTime(editReservation.check_out)}
                required
                className="w-full rounded-xl bg-white/15 px-3 py-2 text-sm text-white outline-none"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-medium text-white/80">{lang === "ar" ? "الحالة" : "Status"}</span>
              <AppSelect name="status" defaultValue={editReservation.reservation_status}>
                <option value="booked" className="text-slate-900">{lang === "ar" ? "محجوز" : "Booked"}</option>
                <option value="checked_in" className="text-slate-900">{lang === "ar" ? "تم تسجيل الدخول" : "Checked In"}</option>
                <option value="checked_out" className="text-slate-900">{lang === "ar" ? "مكتمل" : "Completed"}</option>
                <option value="cancelled" className="text-slate-900">{lang === "ar" ? "ملغي" : "Cancelled"}</option>
              </AppSelect>
            </label>

            <div className="md:col-span-2 flex justify-end">
              <button className="rounded-xl bg-cyan-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-500">
                {lang === "ar" ? "حفظ" : "Save"}
              </button>
            </div>
          </form>
        ) : null}
      </AppModal>

      {/* Delete Modal */}
      <AppModal
        open={Boolean(deleteReservation)}
        onClose={() => setDeleteReservation(null)}
        title={lang === "ar" ? "تأكيد حذف الحجز" : "Confirm Reservation Deletion"}
        closeLabel={lang === "ar" ? "إلغاء" : "Cancel"}
        maxWidthClass="max-w-md"
      >
        {deleteReservation ? (
          <>
            <p className="text-sm text-white/80">
              {lang === "ar" ? "هل أنت متأكد من حذف هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء." : "Are you sure you want to delete this reservation? This action cannot be undone."}
            </p>
            <div className="mt-4 flex justify-end">
              <form action="/api/reservations" method="post">
                <input type="hidden" name="lang" value={lang} />
                <input type="hidden" name="returnTo" value={`/${lang}/reservations`} />
                <input type="hidden" name="action" value="delete" />
                <input type="hidden" name="reservationId" value={deleteReservation.id} />
                <button className="rounded-xl bg-rose-500/85 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500">
                  {lang === "ar" ? "تأكيد الحذف" : "Confirm Delete"}
                </button>
              </form>
            </div>
          </>
        ) : null}
      </AppModal>
    </>
  );
}
