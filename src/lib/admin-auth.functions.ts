import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type AdminSession = { isAdmin?: boolean; loginAt?: number };

function sessionConfig() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET missing or too short");
  }
  return {
    password,
    name: "arena-admin",
    maxAge: 60 * 60 * 8, // 8h
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      path: "/",
    },
  };
}

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

// naive in-memory rate-limit per worker instance (best-effort)
const attempts = new Map<string, { count: number; until: number }>();
function checkRate(key: string) {
  const now = Date.now();
  const rec = attempts.get(key);
  if (rec && rec.until > now && rec.count >= 5) {
    const wait = Math.ceil((rec.until - now) / 1000);
    throw new Error(`Muitas tentativas. Aguarde ${wait}s.`);
  }
  if (!rec || rec.until <= now) attempts.set(key, { count: 1, until: now + 60_000 });
  else attempts.set(key, { count: rec.count + 1, until: rec.until });
}

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => {
    if (!data || typeof data.password !== "string") throw new Error("Invalid input");
    if (data.password.length > 200) throw new Error("Invalid input");
    return { password: data.password };
  })
  .handler(async ({ data }) => {
    checkRate("global");
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD não configurada");
    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession<AdminSession>(sessionConfig());
    await session.update({ isAdmin: true, loginAt: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminStatus = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<AdminSession>(sessionConfig());
  return { isAdmin: Boolean(session.data.isAdmin) };
});
