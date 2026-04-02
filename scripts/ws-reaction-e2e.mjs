import { Client as PgClient } from 'pg';
import { SignJWT } from 'jose';
import WebSocket from 'ws';

const BASE_URL = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
const WS_BASE = process.env.TEST_WS_BASE || 'ws://127.0.0.1:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-jwt-secret-change-me';
const JWT_ISSUER = process.env.JWT_ISSUER || 'guesthub';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'guesthub-users';

const encoder = new TextEncoder();

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function wsConnect(url, cookie) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url, {
      headers: {
        Cookie: cookie,
      },
    });
    const timer = setTimeout(() => {
      ws.terminate();
      reject(new Error(`WS connect timeout: ${url}`));
    }, 8000);

    ws.on('open', () => {
      clearTimeout(timer);
      resolve(ws);
    });
    ws.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function signUserToken(userId, username, email) {
  return new SignJWT({
    userId,
    username: username || `user${userId}`,
    email: email || `user${userId}@local.test`,
    roles: ['admin'],
    type: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setSubject(String(userId))
    .setExpirationTime('15m')
    .sign(encoder.encode(JWT_SECRET));
}

async function signCustomerToken(customerId) {
  return new SignJWT({
    customerId,
    type: 'customer',
    tokenType: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(`${JWT_AUDIENCE}-customers`)
    .setSubject(String(customerId))
    .setExpirationTime('15m')
    .sign(encoder.encode(JWT_SECRET));
}

function actorCookie(actorType, token) {
  if (actorType === 'user') return `auth_token=${token}`;
  return `customer-token=${token}`;
}

async function main() {
  const db = new PgClient({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const convRes = await db.query(`
    SELECT
      c.id AS conversation_id,
      c.participant_one_type AS participant_one_type,
      c.participant_one_id AS participant_one_id,
      c.participant_two_type AS participant_two_type,
      c.participant_two_id AS participant_two_id,
      (
        SELECT m.id
        FROM chat_messages m
        WHERE m.conversation_id = c.id
          AND NOT COALESCE(m.is_deleted, false)
        ORDER BY m.id DESC
        LIMIT 1
      ) AS message_id
    FROM chat_conversations c
    ORDER BY c.id DESC
    LIMIT 1
  `);

  if (!convRes.rows[0]) {
    throw new Error('No conversation found');
  }

  const row = convRes.rows[0];
  if (!row.message_id) {
    throw new Error('Conversation has no message to react to');
  }

  const reactor = { type: row.participant_one_type, id: Number(row.participant_one_id) };
  const receiver = { type: row.participant_two_type, id: Number(row.participant_two_id) };

  async function buildActorAuth(actor) {
    if (actor.type === 'user') {
      const u = await db.query(`SELECT id, username, email FROM users WHERE id = $1 LIMIT 1`, [actor.id]);
      if (!u.rows[0]) throw new Error(`User ${actor.id} not found`);
      const token = await signUserToken(Number(u.rows[0].id), u.rows[0].username, u.rows[0].email);
      return {
        token,
        cookie: actorCookie('user', token),
        wsUrl: `${WS_BASE}/api/chat/ws?actor=user`,
        actorHeader: 'user',
      };
    }

    const c = await db.query(`SELECT id FROM customers WHERE id = $1 LIMIT 1`, [actor.id]);
    if (!c.rows[0]) throw new Error(`Customer ${actor.id} not found`);
    const token = await signCustomerToken(Number(c.rows[0].id));
    return {
      token,
      cookie: actorCookie('customer', token),
      wsUrl: `${WS_BASE}/api/chat/ws?actor=customer`,
      actorHeader: 'customer',
    };
  }

  const reactorAuth = await buildActorAuth(reactor);
  const receiverAuth = await buildActorAuth(receiver);

  const receiverEvents = [];
  const receiverWs = await wsConnect(receiverAuth.wsUrl, receiverAuth.cookie);
  receiverWs.on('message', (raw) => {
    try {
      const parsed = JSON.parse(String(raw));
      receiverEvents.push(parsed);
    } catch {
      // ignore
    }
  });

  const reactorWs = await wsConnect(reactorAuth.wsUrl, reactorAuth.cookie);
  reactorWs.on('message', () => {});

  await sleep(300);

  const reactionType = 'heart';
  const res = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'x-chat-actor': reactorAuth.actorHeader,
      'Cookie': reactorAuth.cookie,
    },
    body: JSON.stringify({
      message_id: Number(row.message_id),
      action: 'react',
      reaction_type: reactionType,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Reaction API failed: ${res.status} ${JSON.stringify(body)}`);
  }

  const startedAt = Date.now();
  let reactionEvent = null;
  while (Date.now() - startedAt < 5000) {
    reactionEvent = receiverEvents.find((evt) =>
      evt?.type === 'message_reaction' && Number(evt?.data?.message_id) === Number(row.message_id)
    );
    if (reactionEvent) break;
    await sleep(100);
  }

  reactorWs.close();
  receiverWs.close();
  await db.end();

  if (!reactionEvent) {
    throw new Error(`No realtime message_reaction received by receiver within timeout. received=${JSON.stringify(receiverEvents.slice(-5))}`);
  }

  console.log(JSON.stringify({
    ok: true,
    conversation_id: Number(row.conversation_id),
    message_id: Number(row.message_id),
    reactor,
    receiver,
    reaction_event: reactionEvent,
  }, null, 2));
}

main().catch((err) => {
  console.error('E2E_FAILED', err?.message || err);
  process.exit(1);
});
