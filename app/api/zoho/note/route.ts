import { NextResponse } from "next/server";
import { zohoConfigured, addNote } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// POST → agrega una nota a un lead (firma BOT DISTRIBUIDOR). Body: { leadId, texto }
export async function POST(req: Request) {
  if (!zohoConfigured()) {
    return NextResponse.json({ ok: false, error: "Zoho no configurado. Modo demo." }, { status: 503 });
  }
  const { leadId, texto } = (await req.json().catch(() => ({}))) || {};
  if (!leadId || !texto) return NextResponse.json({ ok: false, error: "Falta leadId o texto." }, { status: 400 });
  try {
    const res = await addNote(String(leadId), `${texto}\n(BOT DISTRIBUIDOR)`);
    return NextResponse.json({ ok: true, res });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message || e) }, { status: 500 });
  }
}
