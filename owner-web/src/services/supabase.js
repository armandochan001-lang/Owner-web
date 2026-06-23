import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  "https://suwezhysisejijqtomtl.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_GrVJ9aq1V2E84AUaUiQrag_hbFaDOas";

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);
