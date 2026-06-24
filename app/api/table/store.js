import { NextResponse } from "next/server";
import { createEmptyTableState } from "../../game/engine";
import { createServerSupabaseClient } from "../../game/supabase";

export const TABLE_ID = "main";

export function jsonError(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getSupabaseOrResponse() {
  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      response: jsonError("Missing Supabase env. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.", 503),
    };
  }
  return { supabase };
}

export async function getTableRow(supabase) {
  const { data, error } = await supabase.from("game_table").select("*").eq("id", TABLE_ID).maybeSingle();
  if (error) throw new Error(error.message);
  if (data) return data;

  const state = createEmptyTableState();
  const { data: created, error: createError } = await supabase
    .from("game_table")
    .insert({ id: TABLE_ID, status: state.status, version: 0, state })
    .select("*")
    .single();
  if (createError) throw new Error(createError.message);
  return created;
}

export async function saveTableState(supabase, nextState, version) {
  const { data, error } = await supabase
    .from("game_table")
    .update({
      status: nextState.status,
      state: nextState,
      version: version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", TABLE_ID)
    .eq("version", version)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("The table changed. Refreshing state.");
  return data;
}
