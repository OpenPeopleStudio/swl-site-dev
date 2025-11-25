import { cookies } from "next/headers";

export const SESSION_COOKIE = "swl_staff";

export type SessionPayload = {
  email: string;
  role: string;
};

export function serializeSession(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function deserializeSession(value?: string | null) {
  if (!value) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const payload = JSON.parse(json) as SessionPayload;
    if (!payload.email || !payload.role) return null;
    return payload;
  } catch {
    return null;
  }
}

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

export async function getSessionFromCookies() {
  const maybePromise = cookies() as CookieStore | Promise<CookieStore>;
  const store = isPromise<CookieStore>(maybePromise)
    ? await maybePromise
    : maybePromise;
  const cookieValue = store.get(SESSION_COOKIE)?.value;
  return deserializeSession(cookieValue);
}
