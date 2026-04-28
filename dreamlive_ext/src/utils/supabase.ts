import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

const supabaseUrl = import.meta.env.WXT_SUPABASE_URL;
const supabaseKey = import.meta.env.WXT_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables de entorno de Supabase");
}

export const supabase = createClient<Database, "dreamtool">(
  supabaseUrl,
  supabaseKey,
  {
    db: {
      schema: "dreamtool",
    },
    auth: {
      persistSession: true,
      storageKey: "dreamtool-auth-token",
    },
  },
);
