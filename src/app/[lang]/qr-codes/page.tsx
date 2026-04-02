import { FiGrid, FiPrinter, FiRefreshCw, FiCheck, FiX } from "react-icons/fi";
import { PanelShell } from "@/components/panel/panel-shell";
import { listRoomQrTokens } from "@/lib/data";
import { requirePanelContext, requirePermissionOrRedirect } from "@/lib/panel";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
};

export default async function QrCodesPage({ params, searchParams }: Props) {
  const routeParams = await params;
  const query = await searchParams;
  const ctx = await requirePanelContext(routeParams.lang);
  requirePermissionOrRedirect(ctx, "guests.manage", "dashboard");

  const rooms = await listRoomQrTokens();
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const withToken = rooms.filter((r) => r.token);
  const withoutToken = rooms.filter((r) => !r.token);

  return (
    <PanelShell
      lang={ctx.lang}
      user={ctx.user}
      active="qr-codes"
      title={ctx.t("رموز QR للغرف", "Room QR Codes")}
    >
      {query.error ? (
        <p className="mb-3 rounded-2xl bg-[rgba(244,63,94,0.15)] px-4 py-2 text-sm text-rose-100 backdrop-blur-md">
          {query.error}
        </p>
      ) : null}
      {query.ok ? (
        <p className="mb-3 rounded-2xl bg-[rgba(16,185,129,0.15)] px-4 py-2 text-sm text-emerald-100 backdrop-blur-md">
          {query.ok}
        </p>
      ) : null}

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-[rgba(255,255,255,0.12)] p-3 text-center backdrop-blur-md">
          <p className="text-2xl font-bold text-white">{rooms.length}</p>
          <p className="text-xs text-white/70">{ctx.t("إجمالي الغرف", "Total Rooms")}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(16,185,129,0.15)] p-3 text-center backdrop-blur-md">
          <p className="text-2xl font-bold text-emerald-100">{withToken.length}</p>
          <p className="text-xs text-emerald-200/70">{ctx.t("رمز QR مفعّل", "QR Active")}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(251,191,36,0.15)] p-3 text-center backdrop-blur-md">
          <p className="text-2xl font-bold text-amber-100">{withoutToken.length}</p>
          <p className="text-xs text-amber-200/70">{ctx.t("بدون رمز", "No QR")}</p>
        </div>
        <div className="rounded-2xl bg-[rgba(99,102,241,0.15)] p-3 text-center backdrop-blur-md">
          <p className="text-2xl font-bold text-indigo-100">
            {rooms.filter((r) => r.has_active_reservation).length}
          </p>
          <p className="text-xs text-indigo-200/70">{ctx.t("حجز نشط", "Active Stay")}</p>
        </div>
      </div>

      {/* Bulk generate button */}
      {withoutToken.length > 0 ? (
        <form action="/api/room-qr" method="post" className="mb-4">
          <input type="hidden" name="lang" value={ctx.lang} />
          <input type="hidden" name="returnTo" value={`/${ctx.lang}/qr-codes`} />
          <input type="hidden" name="action" value="bulk" />
          <button className="flex items-center gap-2 rounded-xl bg-[rgba(16,185,129,0.25)] px-4 py-2.5 text-sm font-semibold text-emerald-50 backdrop-blur-md transition hover:bg-[rgba(16,185,129,0.35)]">
            <FiGrid className="h-4 w-4" />
            {ctx.t(
              `إنشاء رمز QR لجميع الغرف (${withoutToken.length})`,
              `Generate QR for All Rooms (${withoutToken.length})`,
            )}
          </button>
        </form>
      ) : null}

      {/* Room QR grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {rooms.map((room) => (
          <div
            key={room.room_id}
            className={`group relative overflow-hidden rounded-2xl border backdrop-blur-md transition ${
              room.token
                ? "border-white/20 bg-[rgba(255,255,255,0.10)]"
                : "border-amber-400/30 bg-[rgba(251,191,36,0.08)]"
            }`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">{room.room_number}</span>
                <span className="rounded-md bg-[rgba(255,255,255,0.15)] px-1.5 py-0.5 text-[10px] text-white/70">
                  {room.room_type}
                </span>
                {room.floor ? (
                  <span className="rounded-md bg-[rgba(255,255,255,0.10)] px-1.5 py-0.5 text-[10px] text-white/50">
                    {ctx.t("طابق", "Floor")} {room.floor}
                  </span>
                ) : null}
              </div>
              {room.has_active_reservation ? (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[rgba(16,185,129,0.25)] px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                  <FiCheck className="h-3 w-3" />
                  {ctx.t("مشغولة", "Occupied")}
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-[rgba(255,255,255,0.12)] px-2 py-0.5 text-[10px] font-medium text-white/60">
                  {ctx.t("شاغرة", "Vacant")}
                </span>
              )}
            </div>

            {room.token ? (
              <div className="flex flex-col items-center gap-3 p-4">
                {/* QR Code image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qr?path=${encodeURIComponent(`/guest/${room.token}`)}`}
                  alt={`QR ${room.room_number}`}
                  width={160}
                  height={160}
                  className="rounded-xl bg-white p-2"
                />

                {/* Guest name if occupied */}
                {room.guest_name ? (
                  <p className="text-xs text-white/70">
                    <span className="font-medium text-white/90">{room.guest_name}</span>
                  </p>
                ) : null}

                {/* Link display */}
                <div className="w-full rounded-lg bg-[rgba(0,0,0,0.25)] px-3 py-2">
                  <p className="break-all text-center text-[11px] font-mono text-white/60">
                    {appBaseUrl}/guest/{room.token}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <a
                    href={`/api/qr?path=${encodeURIComponent(`/guest/${room.token}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 rounded-lg bg-[rgba(255,255,255,0.12)] px-3 py-1.5 text-xs text-white/80 transition hover:bg-[rgba(255,255,255,0.20)]"
                    title={ctx.t("طباعة", "Print")}
                  >
                    <FiPrinter className="h-3.5 w-3.5" />
                    {ctx.t("طباعة", "Print")}
                  </a>
                  <form action="/api/room-qr" method="post">
                    <input type="hidden" name="lang" value={ctx.lang} />
                    <input type="hidden" name="returnTo" value={`/${ctx.lang}/qr-codes`} />
                    <input type="hidden" name="action" value="single" />
                    <input type="hidden" name="roomId" value={room.room_id} />
                    <button
                      className="flex items-center gap-1 rounded-lg bg-[rgba(251,191,36,0.18)] px-3 py-1.5 text-xs text-amber-200 transition hover:bg-[rgba(251,191,36,0.30)]"
                      title={ctx.t("إعادة إنشاء", "Regenerate")}
                    >
                      <FiRefreshCw className="h-3.5 w-3.5" />
                      {ctx.t("تجديد", "Regenerate")}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-6">
                <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[rgba(255,255,255,0.08)]">
                  <FiX className="h-8 w-8 text-white/30" />
                </div>
                <p className="text-xs text-white/50">{ctx.t("لا يوجد رمز QR", "No QR code")}</p>
                <form action="/api/room-qr" method="post">
                  <input type="hidden" name="lang" value={ctx.lang} />
                  <input type="hidden" name="returnTo" value={`/${ctx.lang}/qr-codes`} />
                  <input type="hidden" name="action" value="single" />
                  <input type="hidden" name="roomId" value={room.room_id} />
                  <button className="rounded-xl bg-[rgba(16,185,129,0.25)] px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-[rgba(16,185,129,0.35)]">
                    {ctx.t("إنشاء رمز QR", "Generate QR")}
                  </button>
                </form>
              </div>
            )}

          </div>
        ))}
      </div>

      {rooms.length === 0 ? (
        <div className="mt-8 text-center">
          <p className="text-sm text-white/60">{ctx.t("لا توجد غرف نشطة", "No active rooms found")}</p>
        </div>
      ) : null}
    </PanelShell>
  );
}
