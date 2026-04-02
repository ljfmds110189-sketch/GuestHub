import { NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { query, tx } from "@/lib/db";
import { cleanText, getBaseUrl } from "@/lib/http";
import { resolveLang, tr } from "@/lib/i18n";

export async function POST(request: Request) {
  const form = await request.formData();
  const lang = resolveLang(cleanText(form.get("lang")));
  const returnTo = cleanText(form.get("returnTo")) || `/${lang}/service-requests`;
  const action = cleanText(form.get("action"));

  const currentUser = await getCurrentUser();
  if (!currentUser || !hasPermission(currentUser, "services.manage")) {
    return NextResponse.redirect(
      new URL(
        `${returnTo}?error=${encodeURIComponent(tr(lang, "لا تملك صلاحية", "Access denied"))}`,
        getBaseUrl(),
      ),
    );
  }

  /* ─── Update request status ──────────────────────────────────────── */
  if (action === "update_status") {
    const requestId = Number.parseInt(cleanText(form.get("requestId")), 10);
    const newStatus = cleanText(form.get("status"));
    const assignedTo = cleanText(form.get("assignedTo"));
    const validStatuses = ["pending", "accepted", "in_progress", "completed", "cancelled"];

    if (!Number.isFinite(requestId) || !validStatuses.includes(newStatus)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات غير صالحة", "Invalid data"))}`,
          getBaseUrl(),
        ),
      );
    }

    await tx(async (client) => {
      const current = await client.query(
        `SELECT request_status FROM service_requests WHERE id = $1`,
        [requestId],
      );
      const oldStatus = current.rows[0]?.request_status ?? null;

      const completedAt = newStatus === "completed" ? "NOW()" : "NULL";
      const assignedId = assignedTo ? Number.parseInt(assignedTo, 10) : null;

      await client.query(
        `UPDATE service_requests
         SET request_status = $1,
             assigned_to = COALESCE($2, assigned_to),
             completed_at = ${completedAt},
             updated_at = NOW()
         WHERE id = $3`,
        [newStatus, assignedId, requestId],
      );

      await client.query(
        `INSERT INTO service_request_logs (service_request_id, old_status, new_status, changed_by, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [requestId, oldStatus, newStatus, currentUser.id, null],
      );
    });

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تحديث حالة الطلب", "Request status updated"))}`,
        getBaseUrl(),
      ),
    );
  }

  /* ─── Assign staff to request ────────────────────────────────────── */
  if (action === "assign") {
    const requestId = Number.parseInt(cleanText(form.get("requestId")), 10);
    const staffId = Number.parseInt(cleanText(form.get("staffId")), 10);

    if (!Number.isFinite(requestId) || !Number.isFinite(staffId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات غير صالحة", "Invalid data"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(
      `UPDATE service_requests SET assigned_to = $1, updated_at = NOW() WHERE id = $2`,
      [staffId, requestId],
    );

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم تعيين الموظف", "Staff assigned"))}`,
        getBaseUrl(),
      ),
    );
  }

  /* ─── Delete request ─────────────────────────────────────────────── */
  if (action === "delete") {
    const requestId = Number.parseInt(cleanText(form.get("requestId")), 10);
    if (!Number.isFinite(requestId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "معرف الطلب غير صالح", "Invalid request id"))}`,
          getBaseUrl(),
        ),
      );
    }

    await query(`DELETE FROM service_requests WHERE id = $1`, [requestId]);
    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم حذف الطلب", "Request deleted"))}`,
        getBaseUrl(),
      ),
    );
  }

  /* ─── Create request on behalf of guest ──────────────────────────── */
  if (action === "create") {
    const reservationId = Number.parseInt(cleanText(form.get("reservationId")), 10);
    const serviceItemId = Number.parseInt(cleanText(form.get("serviceItemId")), 10);
    const quantity = Math.max(1, Math.min(50, Number.parseInt(cleanText(form.get("quantity")) || "1", 10)));
    const notes = cleanText(form.get("notes")) || null;
    const scheduledAt = cleanText(form.get("scheduledAt")) || null;

    if (!Number.isFinite(reservationId) || !Number.isFinite(serviceItemId)) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "بيانات غير صالحة", "Invalid data"))}`,
          getBaseUrl(),
        ),
      );
    }

    // Get reservation details
    const resRow = await query<{ guest_id: number; room_id: number }>(
      `SELECT guest_id, room_id FROM reservations
       WHERE id = $1 AND reservation_status IN ('booked', 'checked_in')`,
      [reservationId],
    );
    if (!resRow.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الحجز غير نشط", "Reservation is not active"))}`,
          getBaseUrl(),
        ),
      );
    }

    // Get estimated cost from service item
    const itemRow = await query<{ estimated_cost: string | null }>(
      `SELECT estimated_cost::text FROM service_items WHERE id = $1 AND is_active = TRUE`,
      [serviceItemId],
    );
    if (!itemRow.rowCount) {
      return NextResponse.redirect(
        new URL(
          `${returnTo}?error=${encodeURIComponent(tr(lang, "الخدمة غير متوفرة", "Service not available"))}`,
          getBaseUrl(),
        ),
      );
    }

    const { guest_id, room_id } = resRow.rows[0];
    const estimatedCost = itemRow.rows[0].estimated_cost;
    const parsedSchedule = scheduledAt ? new Date(scheduledAt) : null;

    await tx(async (client) => {
      const insert = await client.query(
        `INSERT INTO service_requests
           (reservation_id, room_id, guest_id, service_item_id, notes, scheduled_at, quantity, estimated_cost)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
          reservationId,
          room_id,
          guest_id,
          serviceItemId,
          notes,
          parsedSchedule?.toISOString() ?? null,
          quantity,
          estimatedCost,
        ],
      );
      await client.query(
        `INSERT INTO service_request_logs (service_request_id, old_status, new_status, changed_by, note)
         VALUES ($1, NULL, 'pending', $2, $3)`,
        [insert.rows[0].id, currentUser.id, notes],
      );
    });

    return NextResponse.redirect(
      new URL(
        `${returnTo}?ok=${encodeURIComponent(tr(lang, "تم إنشاء طلب الخدمة", "Service request created"))}`,
        getBaseUrl(),
      ),
    );
  }

  return NextResponse.redirect(
    new URL(
      `${returnTo}?error=${encodeURIComponent(tr(lang, "إجراء غير معروف", "Unknown action"))}`,
      getBaseUrl(),
    ),
  );
}
