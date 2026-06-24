import { NextResponse } from "next/server";
import { createEmptyTableState } from "../../../game/engine";
import { getSupabaseOrResponse, getTableRow, jsonError, saveTableState } from "../store";

export async function POST(request) {
  const { supabase, response } = getSupabaseOrResponse();
  if (response) return response;

  try {
    const body = await request.json();
    if (!process.env.RESET_PASSWORD || body.password !== process.env.RESET_PASSWORD) {
      return jsonError("Invalid reset password.", 401);
    }
    const row = await getTableRow(supabase);
    const saved = await saveTableState(supabase, createEmptyTableState(), row.version);
    return NextResponse.json({ row: saved });
  } catch (error) {
    return jsonError(error.message);
  }
}
