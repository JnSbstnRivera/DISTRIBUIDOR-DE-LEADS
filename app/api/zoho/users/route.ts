import { NextResponse } from "next/server";
import { zohoConfigured, getUsers } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// GET → usuarios activos (asesores / Owner) de Zoho.
export async function GET() {
  if (!zohoConfigured()) return NextResponse.json({ fuente: "mock", users: [] });
  try {
    const users = await getUsers();
    return NextResponse.json({ fuente: "zoho", count: users.length, users });
  } catch (e) {
    return NextResponse.json({ fuente: "error", error: String((e as Error).message || e), users: [] });
  }
}
