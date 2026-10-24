import { createClient } from "npm:@supabase/supabase-js@2.117.3";
// Bank-only API: PG SDKs, credentials, checkout and reconciliation are retired.
export function dependencies() {
  const get = (name: string) => Deno.env.get(name) ?? "";
  const names = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_ORIGIN"];
  const presence = Object.fromEntries(names.map((n) => [n, !!get(n)]));
  const db = createClient(get("SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    // Legacy draft/health field retained for the current browser contract.
    // Bank orders are LIVE; no PG environment is read or activated.
    config: { origin: get("SITE_ORIGIN"), environment: "TEST", presence },
    db,
    auth: db.auth,
  };
}
