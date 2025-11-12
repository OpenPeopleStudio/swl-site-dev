import { cookies } from "next/headers";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function isPromise<T>(value: unknown): value is Promise<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Promise<T>).then === "function"
  );
}

export async function GET() {
  const maybePromise = cookies() as CookieStore | Promise<CookieStore>;
  const store = isPromise<CookieStore>(maybePromise)
    ? await maybePromise
    : maybePromise;
  const dump = store.getAll();
  return Response.json({
    cookies: dump,
    count: dump.length,
  });
}
