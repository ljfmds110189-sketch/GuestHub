import { PanelShell } from "@/components/panel/panel-shell";
import { Pagination } from "@/components/panel/pagination";
import { ReservationsLiveView } from "@/components/panel/reservations-live-view";
import { AppSelect } from "@/components/ui/app-select";
import { listAvailableRoomsOptions, listGuestOptions, listReservationsBoard, listReservationsPaginated } from "@/lib/data";
import { readPager, requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string; error?: string; ok?: string; token?: string }>;
};

export default async function ReservationsPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "guests.manage", "dashboard");

  const pager = readPager(query, { pageSize: 10 });
  const [reservations, board, guestOptions, roomOptions] = await Promise.all([
    listReservationsPaginated(pager.page, pager.pageSize),
    listReservationsBoard(),
    listGuestOptions(),
    listAvailableRoomsOptions(),
  ]);

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="reservations"
      title={ctx.t("إدارة الحجوزات", "Reservations Management")}
    >
      {query.error ? (
        <p className="mb-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {query.ok}
        </p>
      ) : null}

      {/* Generate guest access link */}
      <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {ctx.t("إنشاء رابط وصول الضيف", "Generate Guest Access Link")}
        </h2>
        <form action="/api/guest-tokens" method="post" className="mt-3 flex flex-wrap items-end gap-3">
          <input type="hidden" name="lang" value={ctx.lang} />
          <input type="hidden" name="returnTo" value={`/${ctx.lang}/reservations`} />
          <div className="flex-1">
            <AppSelect
              name="reservationId"
              required
              className="w-full"
            >
              <option value="">{ctx.t("اختر الحجز", "Select reservation")}</option>
              {board
                .filter((b) => b.reservation_status === "booked" || b.reservation_status === "checked_in")
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.guest_name} — {b.room_number}
                  </option>
                ))}
            </AppSelect>
          </div>
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            {ctx.t("إنشاء رابط", "Generate Link")}
          </button>
        </form>
        {query.token ? (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="mb-2 text-xs font-medium text-emerald-800">
              {ctx.t("رابط الضيف (شاركه مع الضيف أو اطبعه كرمز QR):", "Guest link (share with guest or print as QR code):")}
            </p>
            <code className="block break-all rounded-lg bg-white p-2 text-xs text-slate-700">
              /guest/{query.token}
            </code>
            <div className="mt-3 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qr?path=${encodeURIComponent(`/guest/${query.token}`)}`}
                alt="QR Code"
                width={180}
                height={180}
                className="rounded-xl border border-slate-200 bg-white p-2"
              />
              <div className="text-xs text-emerald-700">
                <p className="font-medium">{ctx.t("رمز QR جاهز للطباعة", "QR code ready to print")}</p>
                <p className="mt-1 text-emerald-600">
                  {ctx.t(
                    "اطبع هذا الرمز وضعه في الغرفة ليتمكن الضيف من مسحه والوصول إلى خدمات الفندق",
                    "Print this QR code and place it in the room so the guest can scan it to access hotel services"
                  )}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <ReservationsLiveView
        lang={ctx.lang}
        initialRows={reservations.rows}
        initialBoard={board}
        guestOptions={guestOptions}
        roomOptions={roomOptions}
      />

      <Pagination
        lang={ctx.lang}
        basePath={`/${ctx.lang}/reservations`}
        page={reservations.pagination.page}
        pageSize={reservations.pagination.pageSize}
        total={reservations.pagination.total}
      />
    </PanelShell>
  );
}
