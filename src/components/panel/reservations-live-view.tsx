"use client";

import { useMemo, useState } from "react";
import { FiCheckCircle, FiClock, FiLogIn, FiXCircle } from "react-icons/fi";
import {
  ReservationsBoardDnd,
  type ReservationBoardItem,
  type ReservationStatus,
} from "@/components/panel/reservations-board-dnd";
import { AppModal } from "@/components/ui/app-modal";
import { AppSelect } from "@/components/ui/app-select";

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

type Props = {
  lang: "ar" | "en";
  initialRows: Row[];
  initialBoard: ReservationBoardItem[];
  guestOptions: Array<{ id: number; full_name: string }>;
  roomOptions: Array<{ id: number; room_number: string; room_type: string }>;
};

function statusMeta(lang: "ar" | "en") {
  return {
    booked: {
      label: lang === "ar" ? "محجوز" : "Booked",
      className: "bg-[rgba(251,191,36,0.22)] text-amber-50 ring-1 ring-amber-200/50",
      Icon: FiClock,
    },
    checked_in: {
      label: lang === "ar" ? "تم تسجيل الدخول" : "Checked In",
      className: "bg-[rgba(59,130,246,0.24)] text-blue-50 ring-1 ring-blue-200/50",
      Icon: FiLogIn,
    },
    checked_out: {
      label: lang === "ar" ? "مكتمل" : "Completed",
      className: "bg-[rgba(16,185,129,0.24)] text-emerald-50 ring-1 ring-emerald-200/50",
      Icon: FiCheckCircle,
    },
    cancelled: {
      label: lang === "ar" ? "ملغي" : "Cancelled",
      className: "bg-[rgba(244,63,94,0.24)] text-rose-50 ring-1 ring-rose-200/50",
      Icon: FiXCircle,
    },
  } as const;
}

function StatusBadge({ status, lang }: { status: ReservationStatus; lang: "ar" | "en" }) {
  const meta = statusMeta(lang)[status];
  const Icon = meta.Icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </span>
  );
}

function toInputDateTime(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function ReservationsLiveView({ lang, initialRows, initialBoard, guestOptions, roomOptions }: Props) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [editReservation, setEditReservation] = useState<Row | null>(null);
  const [deleteReservation, setDeleteReservation] = useState<Row | null>(null);

  const rowMap = useMemo(() => {
    const map = new Map<number, Row>();
    for (const row of rows) map.set(row.id, row);
    return map;
  }, [rows]);

  function handleBoardChange(nextBoard: ReservationBoardItem[]) {
    const statusById = new Map<number, ReservationStatus>();
    for (const item of nextBoard) {
      statusById.set(item.id, item.reservation_status);
    }

    setRows((prev) =>
      prev.map((row) => {
        const nextStatus = statusById.get(row.id);
        if (!nextStatus || nextStatus === row.reservation_status) return row;
        return { ...row, reservation_status: nextStatus };
      }),
    );
  }

  return (
    <>
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
              {rows.map((reservation) => {
                const boardState = rowMap.get(reservation.id);
                const status = boardState?.reservation_status ?? reservation.reservation_status;
                return (
                  <tr key={reservation.id} className="text-white/90 shadow-[inset_0_-1px_0_rgba(255,255,255,0.08)]">
                    <td className="px-4 py-3 font-medium">{reservation.guest_name}</td>
                    <td className="px-4 py-3">#{reservation.room_number}</td>
                    <td className="px-4 py-3 text-xs text-white/85">{new Date(reservation.check_in).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-white/85">{new Date(reservation.check_out).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} lang={lang} />
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4 rounded-2xl bg-[rgba(255,255,255,0.14)] p-4 shadow-[0_10px_24px_rgba(2,6,23,0.24)] backdrop-blur-xl">
        <h2 className="mb-3 text-lg font-semibold text-white">
          {lang === "ar" ? "برد الحجوزات (سحب وإفلات)" : "Reservations Board (Drag & Drop)"}
        </h2>
        <ReservationsBoardDnd lang={lang} initialItems={initialBoard} onItemsChange={handleBoardChange} />
      </section>

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
