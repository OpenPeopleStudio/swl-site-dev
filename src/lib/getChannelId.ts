import { supabase } from "@/lib/supabaseClient";

const channelCache = new Map<string, string>();
const inflightCache = new Map<string, Promise<string>>();

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function looksLikeUuid(value: string) {
  return UUID_PATTERN.test(value.trim());
}

export async function getChannelId(name = "global-chat") {
  if (channelCache.has(name)) {
    return channelCache.get(name)!;
  }
  if (inflightCache.has(name)) {
    return inflightCache.get(name)!;
  }

  const request = (async () => {
    try {
      const { data, error } = await supabase
        .from("channels")
        .select("id")
        .eq("name", name)
        .maybeSingle();

      if (error || !data?.id) {
        throw (
          error ??
          new Error(`Channel "${name}" could not be found in Supabase.`)
        );
      }
      channelCache.set(name, data.id);
      return data.id;
    } finally {
      inflightCache.delete(name);
    }
  })();

  inflightCache.set(name, request);
  return request;
}

export async function resolveChannelId(identifier = "global-chat") {
  if (looksLikeUuid(identifier)) return identifier;
  return getChannelId(identifier);
}
