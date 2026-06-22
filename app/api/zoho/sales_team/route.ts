import { NextResponse } from "next/server";
import { zohoConfigured, getSalesTeam } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// GET → lista de consultores (módulo Sales_Team) para el selector de Calidad.
export async function GET() {
  if (!zohoConfigured()) return NextResponse.json({ fuente: "mock", reps: [] });
  try {
    const reps = await getSalesTeam();
    return NextResponse.json({ fuente: "zoho", count: reps.length, reps });
  } catch (e) {
    return NextResponse.json({ fuente: "error", error: String((e as Error).message || e), reps: [] });
  }
}
