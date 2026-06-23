import { supabase } from "./supabase";

export async function getDailyCuts() {
  const { data, error } = await supabase
    .from("daily_cuts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}
