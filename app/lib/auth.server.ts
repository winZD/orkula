import { randomBytes } from "node:crypto";
import { db } from "../db/prisma";
import { hashPassword, verifyPassword } from "./password.server";

const SESSION_EXPIRY_DAYS = 30;
const SESSION_COOKIE = "session_token";

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export async function signup(data: {
  email: string;
  password: string;
  farmName: string;
  firstName: string;
  lastName: string;
}) {
  const hashedPassword = await hashPassword(data.password);

  const slug = data.farmName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const tenant = await db.tenant.create({
    data: { name: data.farmName, slug: `${slug}-${Date.now()}` },
  });

  const user = await db.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      tenantId: tenant.id,
      role: "ADMIN",
    },
  });

  const session = await createSession(user.id);
  return { user, session };
}

export async function login(email: string, password: string) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return null;

  const valid = await verifyPassword(password, user.password);
  if (!valid) return null;

  const session = await createSession(user.id);
  return { user, session };
}

export async function createSession(userId: string) {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_EXPIRY_DAYS);

  return db.session.create({
    data: { token, userId, expiresAt },
  });
}

export async function getSessionUser(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: { include: { tenant: true } } },
  });

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}

export async function logout(request: Request) {
  const cookieHeader = request.headers.get("Cookie");
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (token) {
    await db.session.deleteMany({ where: { token } });
  }
}

export function setSessionCookie(token: string): string {
  const maxAge = SESSION_EXPIRY_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function parseCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}
