import { createClient } from "@supabase/supabase-js";
import "../env";

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY?.trim();

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

try {
  const parsed = new URL(supabaseUrl);
  if (!parsed.protocol.startsWith("http")) {
    throw new Error("SUPABASE_URL must start with http/https");
  }
} catch {
  throw new Error("Invalid SUPABASE_URL. Use the full https://<project>.supabase.co URL");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);
