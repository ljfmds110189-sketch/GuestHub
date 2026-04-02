import { query } from "@/lib/db";

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type Paginated<T> = {
  rows: T[];
  pagination: Pagination;
};

export type RoomLive = {
  id: number;
  room_number: string;
  floor: number | null;
  room_type: string;
  capacity: number;
  status: string;
  live_status: "available" | "occupied" | "maintenance";
  notification_count?: number;
};

export type GuestWithRoom = {
  id: number;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  room_number: string | null;
  check_in: string | null;
  check_out: string | null;
};

export type StaffUser = {
  id: number;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  roles: string[];
};

export type ReservationRow = {
  id: number;
  guest_id: number;
  room_id: number;
  guest_name: string;
  room_number: string;
  check_in: string;
  check_out: string;
  reservation_status: "booked" | "checked_in" | "checked_out" | "cancelled";
  sort_order: number;
};

export type ReservationBoardRow = ReservationRow;

export type Permission = {
  id: number;
  permission_code: string;
  description: string | null;
};

export type RoleOption = {
  id: number;
  role_name: string;
  description: string | null;
};

export type RolePermission = {
  role_id: number;
  permission_id: number;
  permission_code: string;
  description: string | null;
  sort_order: number;
};

export type GuestOption = {
  id: number;
  full_name: string;
};

export type UserProfile = {
  id: number;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  roles: string[];
  role_ids: number[];
};

export type RoomStats = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
};

function safeOffset(page: number, pageSize: number) {
  const p = Number.isFinite(page) && page > 0 ? page : 1;
  const size = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 10;
  return {
    page: p,
    pageSize: size,
    offset: (p - 1) * size,
  };
}

async function countRows(table: "rooms" | "guests" | "app_users" | "reservations") {
  const result = await query<{ total: string }>(`SELECT COUNT(*)::text AS total FROM ${table}`);
  return Number(result.rows[0]?.total ?? "0");
}

export async function listRoomStatus(): Promise<RoomLive[]> {
  const result = await query<RoomLive>(
    `
    SELECT
      id,
      room_number,
      floor,
      room_type,
      capacity,
      status,
      live_status,
      CASE WHEN live_status = 'maintenance' THEN 1 ELSE 0 END AS notification_count
    FROM room_live_status
    ORDER BY notification_count DESC, room_number
    `,
  );
  return result.rows;
}

export async function getRoomStats(): Promise<RoomStats> {
  const result = await query<{ status: RoomLive["live_status"]; total: string }>(
    `
    SELECT live_status AS status, COUNT(*)::text AS total
    FROM room_live_status
    GROUP BY live_status
    `,
  );

  const stats: RoomStats = {
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
  };

  for (const row of result.rows) {
    const value = Number(row.total);
    stats.total += value;
    if (row.status === "available") stats.available = value;
    if (row.status === "occupied") stats.occupied = value;
    if (row.status === "maintenance") stats.maintenance = value;
  }

  return stats;
}

export async function listRoomsPaginated(page: number, pageSize: number): Promise<Paginated<RoomLive>> {
  const pager = safeOffset(page, pageSize);
  const total = await countRows("rooms");

  const result = await query<RoomLive>(
    `
    SELECT id, room_number, floor, room_type, capacity, status, live_status
    FROM room_live_status
    ORDER BY room_number
    LIMIT $1 OFFSET $2
    `,
    [pager.pageSize, pager.offset],
  );

  return {
    rows: result.rows,
    pagination: {
      page: pager.page,
      pageSize: pager.pageSize,
      total,
    },
  };
}

export async function listGuestsPaginated(page: number, pageSize: number): Promise<Paginated<GuestWithRoom>> {
  const pager = safeOffset(page, pageSize);
  const total = await countRows("guests");

  const result = await query<GuestWithRoom>(
    `
    SELECT
      g.id,
      g.first_name,
      g.last_name,
      g.phone,
      g.email,
      r.room_number,
      re.check_in::text,
      re.check_out::text
    FROM guests g
    LEFT JOIN LATERAL (
      SELECT re1.room_id, re1.check_in, re1.check_out
      FROM reservations re1
      WHERE re1.guest_id = g.id
      ORDER BY re1.created_at DESC
      LIMIT 1
    ) re ON TRUE
    LEFT JOIN rooms r ON r.id = re.room_id
    ORDER BY g.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [pager.pageSize, pager.offset],
  );

  return {
    rows: result.rows,
    pagination: {
      page: pager.page,
      pageSize: pager.pageSize,
      total,
    },
  };
}

export async function listUsersPaginated(page: number, pageSize: number): Promise<Paginated<StaffUser>> {
  const pager = safeOffset(page, pageSize);
  const total = await countRows("app_users");

  const result = await query<{
    id: number;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_active: boolean;
    role_name: string | null;
  }>(
    `
    SELECT
      u.id,
      u.username,
      u.full_name,
      u.avatar_url,
      u.is_active,
      r.role_name
    FROM app_users u
    LEFT JOIN app_user_roles ur ON ur.user_id = u.id
    LEFT JOIN app_roles r ON r.id = ur.role_id
    WHERE u.id IN (
      SELECT id
      FROM app_users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    )
    ORDER BY u.created_at DESC
    `,
    [pager.pageSize, pager.offset],
  );

  const byUser = new Map<number, StaffUser>();
  for (const row of result.rows) {
    const existing = byUser.get(row.id);
    if (existing) {
      if (row.role_name && !existing.roles.includes(row.role_name)) {
        existing.roles.push(row.role_name);
      }
      continue;
    }
    byUser.set(row.id, {
      id: row.id,
      username: row.username,
      full_name: row.full_name,
      avatar_url: row.avatar_url,
      is_active: row.is_active,
      roles: row.role_name ? [row.role_name] : [],
    });
  }

  return {
    rows: [...byUser.values()],
    pagination: {
      page: pager.page,
      pageSize: pager.pageSize,
      total,
    },
  };
}

export async function listReservationsPaginated(
  page: number,
  pageSize: number,
): Promise<Paginated<ReservationRow>> {
  const pager = safeOffset(page, pageSize);
  const total = await countRows("reservations");

  const result = await query<ReservationRow>(
    `
    SELECT
      re.id,
      re.guest_id,
      re.room_id,
      g.first_name || ' ' || g.last_name AS guest_name,
      r.room_number,
      re.check_in::text,
      re.check_out::text,
      re.reservation_status,
      re.sort_order
    FROM reservations re
    JOIN guests g ON g.id = re.guest_id
    JOIN rooms r ON r.id = re.room_id
    ORDER BY re.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [pager.pageSize, pager.offset],
  );

  return {
    rows: result.rows,
    pagination: {
      page: pager.page,
      pageSize: pager.pageSize,
      total,
    },
  };
}

export async function listReservationsBoard(): Promise<ReservationBoardRow[]> {
  const result = await query<ReservationBoardRow>(
    `
    SELECT
      re.id,
      re.guest_id,
      re.room_id,
      g.first_name || ' ' || g.last_name AS guest_name,
      r.room_number,
      re.check_in::text,
      re.check_out::text,
      re.reservation_status,
      re.sort_order
    FROM reservations re
    JOIN guests g ON g.id = re.guest_id
    JOIN rooms r ON r.id = re.room_id
    ORDER BY re.reservation_status, re.sort_order, re.created_at DESC
    `,
  );

  return result.rows;
}

export async function listRoles(): Promise<RoleOption[]> {
  const result = await query<RoleOption>(
    `
    SELECT id::int AS id, role_name, description
    FROM app_roles
    ORDER BY role_name
    `,
  );
  return result.rows;
}

export async function listPermissions(): Promise<Permission[]> {
  const result = await query<Permission>(
    `SELECT id::int AS id, permission_code, description FROM app_permissions ORDER BY permission_code`,
  );
  return result.rows;
}

export async function listRolePermissions(roleId: number): Promise<RolePermission[]> {
  const result = await query<RolePermission>(
    `
    SELECT
      rp.role_id::int AS role_id,
      rp.permission_id::int AS permission_id,
      p.permission_code,
      p.description,
      rp.sort_order
    FROM app_role_permissions rp
    JOIN app_permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = $1
    ORDER BY rp.sort_order, p.permission_code
    `,
    [roleId],
  );
  return result.rows;
}

export async function listGuestOptions(): Promise<GuestOption[]> {
  const result = await query<GuestOption>(
    `
    SELECT id, first_name || ' ' || last_name AS full_name
    FROM guests
    ORDER BY first_name, last_name
    `,
  );
  return result.rows;
}

export async function listAvailableRoomsOptions(): Promise<
  Array<{ id: number; room_number: string; room_type: string }>
> {
  const result = await query<{ id: number; room_number: string; room_type: string }>(
    `
    SELECT id, room_number, room_type
    FROM room_live_status
    WHERE status = 'active'
    ORDER BY room_number
    `,
  );
  return result.rows;
}

export async function getUserProfile(userId: number): Promise<UserProfile | null> {
  const result = await query<{
    id: number;
    username: string;
    full_name: string;
    avatar_url: string | null;
    is_active: boolean;
    role_id: number | null;
    role_name: string | null;
  }>(
    `
    SELECT
      u.id,
      u.username,
      u.full_name,
      u.avatar_url,
      u.is_active,
      r.id AS role_id,
      r.role_name
    FROM app_users u
    LEFT JOIN app_user_roles ur ON ur.user_id = u.id
    LEFT JOIN app_roles r ON r.id = ur.role_id
    WHERE u.id = $1
    `,
    [userId],
  );

  if (!result.rowCount) return null;

  const first = result.rows[0];
  const roleNames: string[] = [];
  const roleIds: number[] = [];
  for (const r of result.rows) {
    if (r.role_name && !roleNames.includes(r.role_name)) roleNames.push(r.role_name);
    if (r.role_id != null && !roleIds.includes(r.role_id)) roleIds.push(r.role_id);
  }
  return {
    id: first.id,
    username: first.username,
    full_name: first.full_name,
    avatar_url: first.avatar_url,
    is_active: first.is_active,
    roles: roleNames,
    role_ids: roleIds,
  };
}

export async function listUsersWithRoles(): Promise<StaffUser[]> {
  const paged = await listUsersPaginated(1, 200);
  return paged.rows;
}

export async function listGuestsWithCurrentRoom(): Promise<GuestWithRoom[]> {
  const paged = await listGuestsPaginated(1, 200);
  return paged.rows;
}

export async function listRolesWithPermissions(): Promise<
  Array<{
    id: number;
    role_name: string;
    description: string | null;
    permissions: string[];
  }>
> {
  const result = await query<{
    role_id: number;
    role_name: string;
    description: string | null;
    permission_code: string | null;
  }>(
    `
    SELECT
      r.id AS role_id,
      r.role_name,
      r.description,
      p.permission_code
    FROM app_roles r
    LEFT JOIN app_role_permissions rp ON rp.role_id = r.id
    LEFT JOIN app_permissions p ON p.id = rp.permission_id
    ORDER BY r.role_name, rp.sort_order, p.permission_code
    `,
  );

  const byRole = new Map<
    number,
    { id: number; role_name: string; description: string | null; permissions: string[] }
  >();
  for (const row of result.rows) {
    const existing = byRole.get(row.role_id);
    if (existing) {
      if (row.permission_code) existing.permissions.push(row.permission_code);
      continue;
    }
    byRole.set(row.role_id, {
      id: row.role_id,
      role_name: row.role_name,
      description: row.description,
      permissions: row.permission_code ? [row.permission_code] : [],
    });
  }

  return [...byRole.values()];
}

/* ───── Service request types ──────────────────────────────────────── */

export type ServiceCategory = {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ServiceItem = {
  id: number;
  category_id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  estimated_cost: string | null;
  sort_order: number;
  is_active: boolean;
};

export type ServiceRequestRow = {
  id: number;
  guest_name: string;
  room_number: string;
  item_name_en: string;
  item_name_ar: string;
  category_name_en: string;
  category_name_ar: string;
  request_status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  quantity: number;
  estimated_cost: string | null;
  scheduled_at: string | null;
  assigned_to_name: string | null;
  assigned_to_avatar: string | null;
  created_at: string;
  completed_at: string | null;
};

export type GuestAccessToken = {
  id: number;
  token: string;
  reservation_id: number;
  guest_name: string;
  room_number: string;
  expires_at: string;
  is_revoked: boolean;
  created_at: string;
};

export type GuestContext = {
  token: string;
  guestId: number;
  guestName: string;
  roomId: number;
  roomNumber: string;
  reservationId: number;
  checkIn: string;
  checkOut: string;
};

/* ───── Service categories & items queries ─────────────────────────── */

export async function listServiceCategories(): Promise<ServiceCategory[]> {
  const result = await query<ServiceCategory>(
    `SELECT id, slug, name_en, name_ar, icon, sort_order, is_active
     FROM service_categories
     WHERE is_active = TRUE
     ORDER BY sort_order`,
  );
  return result.rows;
}

export async function listServiceItems(categoryId?: number): Promise<ServiceItem[]> {
  if (categoryId) {
    const result = await query<ServiceItem>(
      `SELECT id, category_id, slug, name_en, name_ar, description_en, description_ar,
              estimated_cost::text, sort_order, is_active
       FROM service_items
       WHERE category_id = $1 AND is_active = TRUE
       ORDER BY sort_order`,
      [categoryId],
    );
    return result.rows;
  }

  const result = await query<ServiceItem>(
    `SELECT id, category_id, slug, name_en, name_ar, description_en, description_ar,
            estimated_cost::text, sort_order, is_active
     FROM service_items
     WHERE is_active = TRUE
     ORDER BY sort_order`,
  );
  return result.rows;
}

export async function listServiceItemsByCategory(): Promise<
  Array<ServiceCategory & { items: ServiceItem[] }>
> {
  const [cats, items] = await Promise.all([
    listServiceCategories(),
    listServiceItems(),
  ]);

  return cats.map((cat) => ({
    ...cat,
    items: items.filter((item) => item.category_id === cat.id),
  }));
}

/* ───── Service requests queries ──────────────────────────────────── */

export async function listServiceRequestsPaginated(
  page: number,
  pageSize: number,
  filters?: { status?: string; roomId?: number },
): Promise<Paginated<ServiceRequestRow>> {
  const pager = safeOffset(page, pageSize);

  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (filters?.status) {
    conditions.push(`sr.request_status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters?.roomId) {
    conditions.push(`sr.room_id = $${idx++}`);
    values.push(filters.roomId);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countResult = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM service_requests sr ${where}`,
    values,
  );
  const total = Number(countResult.rows[0]?.total ?? "0");

  const result = await query<ServiceRequestRow>(
    `SELECT
       sr.id,
       g.first_name || ' ' || g.last_name AS guest_name,
       rm.room_number,
       si.name_en AS item_name_en,
       si.name_ar AS item_name_ar,
       sc.name_en AS category_name_en,
       sc.name_ar AS category_name_ar,
       sr.request_status,
       sr.notes,
       sr.quantity,
       sr.estimated_cost::text,
       sr.scheduled_at::text,
       au.full_name AS assigned_to_name,
       au.avatar_url AS assigned_to_avatar,
       sr.created_at::text,
       sr.completed_at::text
     FROM service_requests sr
     JOIN guests g ON g.id = sr.guest_id
     JOIN rooms rm ON rm.id = sr.room_id
     JOIN service_items si ON si.id = sr.service_item_id
     JOIN service_categories sc ON sc.id = si.category_id
     LEFT JOIN app_users au ON au.id = sr.assigned_to
     ${where}
     ORDER BY
       CASE sr.request_status
         WHEN 'pending' THEN 1
         WHEN 'accepted' THEN 2
         WHEN 'in_progress' THEN 3
         WHEN 'completed' THEN 4
         WHEN 'cancelled' THEN 5
       END,
       sr.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, pager.pageSize, pager.offset],
  );

  return {
    rows: result.rows,
    pagination: { page: pager.page, pageSize: pager.pageSize, total },
  };
}

export async function listServiceRequestsByReservation(
  reservationId: number,
): Promise<ServiceRequestRow[]> {
  const result = await query<ServiceRequestRow>(
    `SELECT
       sr.id,
       g.first_name || ' ' || g.last_name AS guest_name,
       rm.room_number,
       si.name_en AS item_name_en,
       si.name_ar AS item_name_ar,
       sc.name_en AS category_name_en,
       sc.name_ar AS category_name_ar,
       sr.request_status,
       sr.notes,
       sr.quantity,
       sr.estimated_cost::text,
       sr.scheduled_at::text,
       au.full_name AS assigned_to_name,
       au.avatar_url AS assigned_to_avatar,
       sr.created_at::text,
       sr.completed_at::text
     FROM service_requests sr
     JOIN guests g ON g.id = sr.guest_id
     JOIN rooms rm ON rm.id = sr.room_id
     JOIN service_items si ON si.id = sr.service_item_id
     JOIN service_categories sc ON sc.id = si.category_id
     LEFT JOIN app_users au ON au.id = sr.assigned_to
     WHERE sr.reservation_id = $1
     ORDER BY sr.created_at DESC`,
    [reservationId],
  );
  return result.rows;
}

/* ───── Guest access token queries ────────────────────────────────── */

export async function validateGuestToken(token: string): Promise<GuestContext | null> {
  const result = await query<{
    token: string;
    guest_id: number;
    guest_name: string;
    room_id: number;
    room_number: string;
    reservation_id: number;
    check_in: string;
    check_out: string;
  }>(
    `SELECT
       gat.token,
       g.id AS guest_id,
       g.first_name || ' ' || g.last_name AS guest_name,
       rm.id AS room_id,
       rm.room_number,
       re.id AS reservation_id,
       re.check_in::text,
       re.check_out::text
     FROM guest_access_tokens gat
     JOIN reservations re ON re.id = gat.reservation_id
     JOIN guests g ON g.id = re.guest_id
     JOIN rooms rm ON rm.id = re.room_id
     WHERE gat.token = $1
       AND gat.is_revoked = FALSE
       AND gat.expires_at > NOW()
       AND re.reservation_status IN ('booked', 'checked_in')`,
    [token],
  );

  if (!result.rowCount) {
    // Fallback: check room QR tokens
    return validateRoomQrToken(token);
  }

  const row = result.rows[0];
  return {
    token: row.token,
    guestId: row.guest_id,
    guestName: row.guest_name,
    roomId: row.room_id,
    roomNumber: row.room_number,
    reservationId: row.reservation_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
  };
}

export async function listStaffUsers(): Promise<Array<{ id: number; full_name: string }>> {
  const result = await query<{ id: number; full_name: string }>(
    `SELECT id, full_name FROM app_users WHERE is_active = TRUE ORDER BY full_name`,
  );
  return result.rows;
}

export async function getServiceRequestStats(): Promise<{
  pending: number;
  accepted: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  total: number;
}> {
  const result = await query<{ status: string; cnt: string }>(
    `SELECT request_status AS status, COUNT(*)::text AS cnt
     FROM service_requests
     GROUP BY request_status`,
  );

  const stats = { pending: 0, accepted: 0, in_progress: 0, completed: 0, cancelled: 0, total: 0 };
  for (const row of result.rows) {
    const v = Number(row.cnt);
    stats.total += v;
    if (row.status in stats) (stats as Record<string, number>)[row.status] = v;
  }
  return stats;
}

/* ───── Active reservations & service item options (for forms) ───── */

export type ActiveReservationOption = {
  id: number;
  guest_id: number;
  room_id: number;
  guest_name: string;
  room_number: string;
};

export async function listActiveReservations(): Promise<ActiveReservationOption[]> {
  const result = await query<ActiveReservationOption>(
    `SELECT
       re.id,
       re.guest_id,
       re.room_id,
       g.first_name || ' ' || g.last_name AS guest_name,
       rm.room_number
     FROM reservations re
     JOIN guests g ON g.id = re.guest_id
     JOIN rooms rm ON rm.id = re.room_id
     WHERE re.reservation_status IN ('booked', 'checked_in')
     ORDER BY re.created_at DESC`,
  );
  return result.rows;
}

export type ServiceItemOption = {
  id: number;
  name_en: string;
  name_ar: string;
  category_slug: string;
  category_name_en: string;
  category_name_ar: string;
  estimated_cost: string | null;
};

export async function listServiceItemOptions(): Promise<ServiceItemOption[]> {
  const result = await query<ServiceItemOption>(
    `SELECT
       si.id,
       si.name_en,
       si.name_ar,
       sc.slug AS category_slug,
       sc.name_en AS category_name_en,
       sc.name_ar AS category_name_ar,
       si.estimated_cost::text
     FROM service_items si
     JOIN service_categories sc ON sc.id = si.category_id
     WHERE si.is_active = TRUE AND sc.is_active = TRUE
     ORDER BY sc.sort_order, si.sort_order`,
  );
  return result.rows;
}

/* ───── Room QR token queries ─────────────────────────────────────── */

export type RoomQrToken = {
  id: number;
  room_id: number;
  room_number: string;
  floor: string;
  room_type: string;
  token: string | null;
  created_at: string | null;
  has_active_reservation: boolean;
  guest_name: string | null;
};

export async function listRoomQrTokens(): Promise<RoomQrToken[]> {
  const result = await query<RoomQrToken>(
    `SELECT
       r.id AS room_id,
       r.room_number,
       r.floor,
       r.room_type,
       rq.id,
       rq.token,
       rq.created_at::text,
       CASE WHEN re.id IS NOT NULL THEN TRUE ELSE FALSE END AS has_active_reservation,
       CASE WHEN re.id IS NOT NULL THEN g.first_name || ' ' || g.last_name ELSE NULL END AS guest_name
     FROM rooms r
     LEFT JOIN room_qr_tokens rq ON rq.room_id = r.id
     LEFT JOIN LATERAL (
       SELECT re2.id, re2.guest_id
       FROM reservations re2
       WHERE re2.room_id = r.id AND re2.reservation_status IN ('booked', 'checked_in')
       ORDER BY re2.check_in DESC
       LIMIT 1
     ) re ON TRUE
     LEFT JOIN guests g ON g.id = re.guest_id
     WHERE r.status = 'active'
     ORDER BY r.room_number`,
  );
  return result.rows;
}

export async function generateRoomQrToken(roomId: number): Promise<string> {
  const crypto = await import("node:crypto");
  const token = `room-${crypto.randomUUID()}-${crypto.randomBytes(12).toString("hex")}`;

  await query(
    `INSERT INTO room_qr_tokens (room_id, token)
     VALUES ($1, $2)
     ON CONFLICT (room_id) DO UPDATE SET token = $2, created_at = NOW()`,
    [roomId, token],
  );

  return token;
}

export async function generateAllRoomQrTokens(): Promise<number> {
  const crypto = await import("node:crypto");
  const rooms = await query<{ id: number }>(`SELECT id FROM rooms WHERE status = 'active' ORDER BY id`);
  let count = 0;

  for (const room of rooms.rows) {
    const existing = await query(`SELECT id FROM room_qr_tokens WHERE room_id = $1`, [room.id]);
    if (existing.rowCount === 0) {
      const token = `room-${crypto.randomUUID()}-${crypto.randomBytes(12).toString("hex")}`;
      await query(`INSERT INTO room_qr_tokens (room_id, token) VALUES ($1, $2)`, [room.id, token]);
      count++;
    }
  }

  return count;
}

export async function validateRoomQrToken(token: string): Promise<GuestContext | null> {
  const result = await query<{
    token: string;
    guest_id: number;
    guest_name: string;
    room_id: number;
    room_number: string;
    reservation_id: number;
    check_in: string;
    check_out: string;
  }>(
    `SELECT
       rq.token,
       g.id AS guest_id,
       g.first_name || ' ' || g.last_name AS guest_name,
       rm.id AS room_id,
       rm.room_number,
       re.id AS reservation_id,
       re.check_in::text,
       re.check_out::text
     FROM room_qr_tokens rq
     JOIN rooms rm ON rm.id = rq.room_id
     JOIN LATERAL (
       SELECT re2.id, re2.guest_id, re2.check_in, re2.check_out
       FROM reservations re2
       WHERE re2.room_id = rq.room_id AND re2.reservation_status IN ('booked', 'checked_in')
       ORDER BY re2.check_in DESC
       LIMIT 1
     ) re ON TRUE
     JOIN guests g ON g.id = re.guest_id
     WHERE rq.token = $1`,
    [token],
  );

  if (!result.rowCount) return null;

  const row = result.rows[0];
  return {
    token: row.token,
    guestId: row.guest_id,
    guestName: row.guest_name,
    roomId: row.room_id,
    roomNumber: row.room_number,
    reservationId: row.reservation_id,
    checkIn: row.check_in,
    checkOut: row.check_out,
  };
}
