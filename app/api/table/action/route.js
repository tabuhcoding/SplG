import { NextResponse } from "next/server";
import { applyGameAction } from "../../../game/engine";
import { getSupabaseOrResponse, getTableRow, jsonError, saveTableState } from "../store";

export async function POST(request) {
  const { supabase, response } = getSupabaseOrResponse();
  if (response) return response;

  try {
    const body = await request.json();
    const row = await getTableRow(supabase);
    if (typeof body.version === "number" && body.version !== row.version) {
      return jsonError("The table changed. Refreshing state.", 409);
    }
    const nextState = applyGameAction(row.state, body);
    const saved = await saveTableState(supabase, nextState, row.version);
    return NextResponse.json({ row: saved });
  } catch (error) {
    return jsonError(error.message);
  }
}
