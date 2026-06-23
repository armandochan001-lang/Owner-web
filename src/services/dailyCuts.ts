import { supabase } from "./supabase";

export interface DailyCut {
  branch: string;
  cut_date: string;
  sales: number;
  expenses: number;
  income: number;
  total_to_deliver: number;
expenses_list: any[];
incomes_list: any[];
  driver_cuts: any[];
tickets: any[];
}

export async function saveDailyCut(
  cut: DailyCut
) {

const { data, error } = await supabase
  .from("daily_cuts")
  .upsert([cut], {
    onConflict: "branch,cut_date",
  })
  .select();

  if (error) {
    console.error(
      "Error guardando corte:",
      error
    );
    throw error;
  }

  return data;
}
export async function getDailyCuts() {
  const { data, error } = await supabase
    .from("daily_cuts")
    .select("*");

  if (error) {
    console.error(
      "Error leyendo cortes:",
      error
    );
    throw error;
  }

  return data;
}
export async function testConnection() {
  const cuts = await getDailyCuts();

  console.log(
    "CORTES SUPABASE:",
    JSON.stringify(cuts, null, 2)
  );

  return cuts;
}
