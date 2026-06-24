import { NextResponse } from "next/server";
import { startPlaying } from "../../../game/engine";
import { getSupabaseOrResponse, getTableRow, jsonError, saveTableState } from "../store";

export async function POST(request) {
  const { supabase, response } = getSupabaseOrResponse();
  if (response) return response;

  try {
    const body = await request.json();
    const row = await getTableRow(supabase);
    const nextState = startPlaying(row.state, body);
    const saved = await saveTableState(supabase, nextState, row.version);
    return NextResponse.json({ row: saved });
  } catch (error) {
    return jsonError(error.message);
  }
}
