import { db } from "../db/prisma";

const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let started = false;

async function purgeExpiredSessions() {
  const result = await db.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });

  if (result.count > 0) {
    console.log(`[cleanup] Deleted ${result.count} expired session(s).`);
  }
}

export function startSessionCleanup() {
  if (started) return;
  started = true;

  purgeExpiredSessions().catch(console.error);
  setInterval(() => purgeExpiredSessions().catch(console.error), CLEANUP_INTERVAL_MS);
}
