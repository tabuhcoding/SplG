import { NextResponse } from "next/server";
import { getSupabaseOrResponse, getTableRow, jsonError } from "./store";

export async function GET() {
  const { supabase, response } = getSupabaseOrResponse();
  if (response) return response;

  try {
    const row = await getTableRow(supabase);
    return NextResponse.json({ row });
  } catch (error) {
    return jsonError(error.message, 500);
  }
}
