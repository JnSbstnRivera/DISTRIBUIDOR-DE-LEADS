// Cliente de Zoho CRM para el Distribuidor (App Router, runtime node).
// Patrón probado en NOTAS-VENTAS-VASS / TELEMERCADEO-SEGUIMIENTO (org US .com 699641359).
// Conmuta a REAL solo si hay credenciales de servicio en el entorno; si no, las
// rutas caen a MOCK para que el software siga vivo antes de la conexión.

const DC = process.env.ZOHO_DC || "com";
const ACCOUNTS = `https://accounts.zoho.${DC}`;
const API = `https://www.zohoapis.${DC}/crm/v2`;
export const ORG_ID = process.env.ZOHO_ORG_ID || "699641359";

// API names de campos (los confirmados quedan fijos; los pendientes salen por env).
export const F = {
  estado: "Lead_Status",
  ciudad: "City",
  salesRep: "Sales_Rep", // consultor (lookup módulo Sales_Team)
  owner: "Owner", // asesor / dueño
  leadNumber: "Lead_Number",
  leadSource: "Lead_Source",
  // confirmados contra la org real (2026-06-22):
  fechaCita: process.env.ZOHO_FIELD_FECHA || "Presenter_Appointment",
  teamAssist: process.env.ZOHO_FIELD_TEAM || "Team_Assitance", // (sí, el API name tiene el typo "Assitance")
  qualityStage: "Quality_Stage",
  qualityOwner: "Quality_Owner", // dueño de calidad (analista: Cata, etc.)
};

export const ESTADO_CITA = process.env.ZOHO_ESTADO_CITA || "Cita Coordinada";
// Filtro de la cola de Calidad (vacío "" = sin filtro, trae todas). Replica el reporte de Cata.
export const QUALITY_STAGE = process.env.ZOHO_QUALITY_STAGE ?? "On Hold Quality";

export function zohoConfigured(): boolean {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN);
}

// ── Token de servicio (cuenta única, cache en instancia caliente) ──
let svcToken: string | null = null;
let svcExp = 0;
export async function getServiceToken(): Promise<string> {
  const now = Date.now();
  if (svcToken && now < svcExp) return svcToken;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: process.env.ZOHO_CLIENT_ID || "",
    client_secret: process.env.ZOHO_CLIENT_SECRET || "",
    refresh_token: process.env.ZOHO_REFRESH_TOKEN || "",
  });
  const r = await fetch(`${ACCOUNTS}/oauth/v2/token`, { method: "POST", body });
  const j = await r.json();
  if (!j.access_token) throw new Error("No se pudo renovar el token de servicio Zoho.");
  svcToken = j.access_token as string;
  svcExp = now + (j.expires_in ? (j.expires_in - 300) * 1000 : 3000 * 1000);
  return svcToken;
}

// ── Fetch genérico a Zoho ──
export async function zoho(path: string, opts: { method?: string; body?: unknown } = {}) {
  const token = await getServiceToken();
  const headers: Record<string, string> = { Authorization: `Zoho-oauthtoken ${token}` };
  const init: RequestInit = { method: opts.method || "GET", headers };
  if (opts.body !== undefined) { headers["Content-Type"] = "application/json"; init.body = JSON.stringify(opts.body); }
  const r = await fetch(`${API}${path}`, init);
  if (r.status === 204) return { data: [] };
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { _status: r.status, _raw: text }; }
}

// ── COQL ──
export async function coql(select_query: string) {
  return zoho("/coql", { method: "POST", body: { select_query } });
}

// ── Citas coordinadas (Lead_Status = ESTADO_CITA y fecha >= hoy) ──
export type CitaZoho = {
  id: string;
  ref: string;
  fechaCita: string;
  ciudad: string;
  teamAssistance: string;
  leadSource: string;
  salesRepId?: string;
  ownerId?: string;
  consultor?: { nombre: string; activo: boolean };
  qualityStage?: string;
  qualityOwner?: string; // analista de Calidad (Cata, etc.) o "" si sin dueño
};

export async function getCitasCoordinadas(hoyISO: string): Promise<CitaZoho[]> {
  // COQL aplana lookups como "Sales_Rep.Name". Presenter_Appointment es datetime → límite con hora (PR -04:00).
  // COQL exige PARÉNTESIS al combinar 3+ condiciones con AND.
  const desde = `${hoyISO}T00:00:00-04:00`;
  const cols = `id, ${F.leadNumber}, ${F.estado}, ${F.ciudad}, ${F.leadSource}, ${F.fechaCita}, ${F.teamAssist}, ${F.salesRep}.id, ${F.salesRep}.Name, ${F.owner}.id, ${F.owner}.first_name, ${F.owner}.last_name, ${F.qualityStage}, ${F.qualityOwner}.id, ${F.qualityOwner}.first_name, ${F.qualityOwner}.last_name`;
  const qstage = QUALITY_STAGE ? ` and ${F.qualityStage} = '${QUALITY_STAGE}'` : "";
  const q = `select ${cols} from Leads where (${F.estado} = '${ESTADO_CITA}'${qstage}) and (${F.fechaCita} >= '${desde}') order by ${F.fechaCita} asc limit 200`;
  const j = await coql(q);
  const rows: Record<string, unknown>[] = Array.isArray(j?.data) ? j.data : [];
  return rows.map((r) => {
    const srName = r[`${F.salesRep}.Name`] as string | null;
    const team = r[F.teamAssist];
    const qo = [r[`${F.qualityOwner}.first_name`], r[`${F.qualityOwner}.last_name`]].filter(Boolean).join(" ").trim();
    return {
      id: String(r.id),
      ref: String(r[F.leadNumber] ?? r.id),
      fechaCita: String(r[F.fechaCita] ?? "").slice(0, 10),
      ciudad: String(r[F.ciudad] ?? ""),
      teamAssistance: Array.isArray(team) ? team.join(", ") : String(team ?? ""),
      leadSource: String(r[F.leadSource] ?? ""),
      salesRepId: (r[`${F.salesRep}.id`] as string) || undefined,
      ownerId: (r[`${F.owner}.id`] as string) || undefined,
      consultor: srName ? { nombre: srName, activo: true } : undefined,
      qualityStage: String(r[F.qualityStage] ?? ""),
      qualityOwner: qo,
    };
  });
}

// ── Sales_Team (consultores) ──
export type Rep = { id: string; name: string; email?: string; phone?: string };
let repsCache: Rep[] | null = null;
let repsExp = 0;
export async function getSalesTeam(): Promise<Rep[]> {
  const now = Date.now();
  if (repsCache && now < repsExp) return repsCache;
  const all: Rep[] = [];
  let page = 1;
  const MAX = 50;
  while (page <= MAX) {
    const j = await zoho(`/Sales_Team?fields=Name,Email,Phone,Mobile&per_page=200&page=${page}`);
    if (j?.code === "OAUTH_SCOPE_MISMATCH") break;
    const batch: Record<string, unknown>[] = Array.isArray(j?.data) ? j.data : [];
    for (const r of batch) all.push({ id: String(r.id), name: String(r.Name ?? ""), email: String(r.Email ?? ""), phone: String(r.Phone ?? r.Mobile ?? "") });
    if (!j?.info?.more_records) break;
    page++;
  }
  repsCache = all.filter((r) => r.name).sort((a, b) => a.name.localeCompare(b.name));
  repsExp = now + 300_000;
  return repsCache;
}

// ── Usuarios (asesores / Owner) ──
export type ZUser = { id: string; name: string; active: boolean };
export async function getUsers(): Promise<ZUser[]> {
  const j = await zoho(`/users?type=ActiveUsers&per_page=200`);
  const rows: Record<string, unknown>[] = Array.isArray(j?.users) ? j.users : [];
  return rows.map((u) => ({ id: String(u.id), name: String(u.full_name ?? ""), active: u.status === "active" }));
}

// ── Escritura: cambiar consultor (Sales_Rep) y/o dueño (Owner) ──
export async function updateLead(id: string, fields: { salesRepId?: string; ownerId?: string; salesRepPhone?: string; salesRepEmail?: string }) {
  const data: Record<string, unknown> = {};
  if (fields.salesRepId) data[F.salesRep] = { id: fields.salesRepId };
  if (fields.ownerId) data[F.owner] = { id: fields.ownerId };
  if (fields.salesRepPhone) data["Sales_Rep_Phone"] = fields.salesRepPhone;
  if (fields.salesRepEmail) data["Sales_Rep_Email"] = fields.salesRepEmail;
  return zoho(`/Leads/${id}`, { method: "PUT", body: { data: [data] } });
}

// ── Nota (firma BOT DISTRIBUIDOR) ──
export async function addNote(leadId: string, contenido: string, titulo = "Distribuidor de Leads") {
  return zoho(`/Notes`, {
    method: "POST",
    body: { data: [{ Note_Title: titulo, Note_Content: contenido, Parent_Id: { id: leadId }, se_module: "Leads" }] },
  });
}

export const leadUrl = (id: string) => `https://crm.zoho.${DC}/crm/org${ORG_ID}/tab/Leads/${id}`;
