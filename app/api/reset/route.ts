import { NextResponse } from "next/server";
import { resetDB } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST() {
  resetDB();
  return NextResponse.json({ ok: true });
}
