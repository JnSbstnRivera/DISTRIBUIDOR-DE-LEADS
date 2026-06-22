import { NextResponse } from "next/server";
import { zohoConfigured, updateLead, addNote, leadUrl } from "@/lib/zoho";

export const dynamic = "force-dynamic";

// POST → cambiar consultor (Sales_Rep) y/o dueño (Owner) de un lead, y dejar nota.
// Body: { leadId, salesRepId?, salesRepName?, ownerId?, nota? }
export async function POST(req: Request) {
  if (!zohoConfigured()) {
    return NextResponse.json({ ok: false, error: "Zoho no configurado (faltan credenciales de servicio). Modo demo." }, { status: 503 });
  }
  const b = await req.json().catch(() => ({}));
  const { leadId, salesRepId, salesRepName, ownerId, nota } = b || {};
  if (!leadId || (!salesRepId && !ownerId)) {
    return NextResponse.json({ ok: false, error: "Falta leadId y al menos salesRepId u ownerId." }, { status: 400 });
  }
  try {
    const res = await updateLead(String(leadId), { salesRepId, ownerId });
    const rec = res?.data?.[0];
    if (rec && rec.code !== "SUCCESS") {
      return NextResponse.json({ ok: false, error: rec.message || "Zoho rechazó la actualización", detalle: rec }, { status: 400 });
    }
    if (nota) {
      const firma = salesRepName ? `Consultor asignado: ${salesRepName}.` : "Asignación actualizada.";
      await addNote(String(leadId), `${nota}\n\n— ${firma}\n(BOT DISTRIBUIDOR)`);
    }
    return NextResponse.json({ ok: true, leadUrl: leadUrl(String(leadId)) });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String((e as Error).message || e) }, { status: 500 });
  }
}
