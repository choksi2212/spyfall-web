import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, { auth: { persistSession: false } });
  }
  return client;
}

export async function persistRoomCreated(code: string, hostPlayerId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { error } = await sb.from("rooms").insert({ code, host_player_id: hostPlayerId });
    if (error?.code === "23505") return;
    if (error) console.warn("[supabase] persistRoomCreated:", error.message);
  } catch (e) {
    console.warn("[supabase] persistRoomCreated failed", e);
  }
}

export async function persistHostChange(code: string, newHostId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("rooms").update({ host_player_id: newHostId }).eq("code", code);
  } catch (e) {
    console.warn("[supabase] persistHostChange failed", e);
  }
}
