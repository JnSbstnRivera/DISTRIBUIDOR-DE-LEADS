# 🪟 HANDOFF — Distribuidor de Leads · Windmar Home

> Traspaso para **continuar en un chat nuevo**. Léelo completo: estado, arquitectura, lógica, dónde vive la data, pendientes y roadmap.
> _Última actualización: 2026-06-24._

---

## 0) Cómo continuar (lee esto primero)

1. **Proyecto:** `C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor`
2. **En producción (la empresa):** https://distribuidor-de-leads.vercel.app · login **ADMIN / 1234\*** · Vercel team **`windmar`**. **Push a `master` = auto-deploy.**
3. **Repo:** https://github.com/JnSbstnRivera/DISTRIBUIDOR-DE-LEADS (público).
4. **Local:**
   ```powershell
   cd "C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor"; npm install; npm run dev
   ```
   http://localhost:3010 (Next lee `.env.local` al **arrancar** → reiniciar tras cambiar env).
5. **Fuentes:** Excel/Word de Miguel en `C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\` (`Distribucion de Leads.xlsx`, `Criterios de Asignación de Leads.docx`). Repo de assets pixel: `pixel-agents-main/` (MIT).
6. **✅ Decisión Fase B resuelta (2026-06-24):** el usuario eligió **flujo de confirmación** (no A/B/C directo): el botón muestra a quién le toca por la lógica y, al confirmar, asigna automático escribiendo **`Sales_Rep`** (mapeando gerente→Sales_Team por nombre) + nota. Ya implementado (ver §7).

---

## 1) Qué es y visión
App que **reemplaza el Excel de distribución de leads de Miguel** y la **vista manual de Zoho de Cata**. Personas: **Miguel Bethencourt** (jefe), **Catalina "Cata" Castro** + otros analistas de **Calidad**, **Andrés Rengifo** (técnico/Zoho).

**Visión:** la app lee las citas coordinadas de Zoho, **decide la asignación** con las reglas del Excel, **N8N** notifica a Miguel por Teams/correo y él **aprueba**.

---

## 2) ESTADO ACTUAL (qué funciona hoy) ✅
- 🌐 **EN VIVO en producción** (Vercel windmar) **conectado a Zoho real**.
- **Citas (`/citas`)**: réplica del **reporte de Calidad de Zoho** — cola **On Hold Quality**, columnas idénticas (Cita Date/Time, Lead#, Lead Name, Lead Source, Dirección, City, Lead Status, Sales Rep, Post-Cita, Lead Owner, Team Assistance-Viejo, Quality Stage pill, ¿Cita se dió?), agrupado por fecha, **filtro por analista (Quality Owner)**, tabla con scroll horizontal. Columna extra **"Distribuidor"** (sugerencia del motor + Reasignar consultor → escribe en Zoho).
- **Distribución Hoy (`/hoy`)**: tarjeta **en vivo** con las citas coordinadas **de hoy** + a quién le toca por la rotación same-day.
- **Asignar (`/asignar`)**, **Cumplimiento**, **Mapa** (con fondo de mar), **Gerentes**, **Black List**, **Historial**, **Dashboard** — todo funcional con el motor del Excel.
- **Pixel Agents** (escondido, easter-egg): oficina con agentes que reaccionan a Zoho en vivo.
- **✅ Distribuir (Fase B)**: en `/citas`, las filas sin consultor (`decision.via='distribuidor'`) muestran **"Distribuir → [gerente]"**; al confirmar, escribe **`Sales_Rep` + nota** en Zoho (mapeo gerente→Sales_Team por nombre; si no hay match, deja solo nota) y registra en Historial. **Historial** con columnas Consultor/Zoho + **export a Excel (CSV)**.

---

## 3) Stack, arquitectura y DÓNDE VIVE LA DATA
**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Recharts · Framer Motion · Lucide · next-themes. Auth = cookie + `middleware.ts` (login ADMIN/1234*). Puerto 3010.

**🗄️ Dónde se guarda la data (importante):**
| Capa | Qué guarda | Persiste? |
|---|---|---|
| **Zoho CRM** | Leads, citas, consultores, Quality Owner — la **verdad del negocio**. La app lo lee en vivo y (Fase B) escribe de vuelta. | ✅ (es Zoho) |
| **GitHub → Vercel** | Código + **reglas del Excel** (`engine.ts`). | ✅ |
| **Vercel Env Vars** | Credenciales Zoho (8 `ZOHO_*`). | ✅ (no en repo) |
| **Memoria del server** | Estado de rotación (cargas, asignaciones, blacklist, hoy) arrancando de `seed.json`. | ⚠️ **NO** (serverless efímero) → **Fase 2 Supabase** |
| **localStorage navegador** | SOLO la oficina Pixel Agents (decorativo). | por navegador |

**Estructura:**
```
app/
  page.tsx (Dashboard) · citas/ (réplica reporte Calidad) · asignar/ · hoy/ (live)
  canales/ · cumplimiento/ · mapa/ · gerentes/ · blacklist/ · historial/ · pixel-agents/ · login/
  api/
    state, asignar, gerente, reset, hoy, canales, cumplimiento, login, logout
    zoho/{leads, hoy, sales_team, users, assign, note}   ← integración Zoho
lib/
  engine.ts   Motor de rotación del Excel (zona, HOY, canal, blacklist)
  decision.ts Cascada de decisión de citas coordinadas
  zoho.ts     Cliente Zoho (token servicio, COQL, getCitasCoordinadas, getSalesTeam, updateLead, addNote)
  store.ts    Almacén (seed importado → memoria; serverless-safe)
  office.ts   Motor Pixel Agents (grid tiles, catálogo, áreas, asientos, BFS)
  types.ts
data/  seed.json (del Excel) · pr_map.json (mapa SVG PR)
public/agents/pixel/  char_0..5 (personajes) · office/ (muebles+pisos) · windmar-logo.png · pixel-agents-icon.png
```

---

## 4) ⭐ El motor del Excel — `lib/engine.ts`
**Rotación equitativa por zona:** `carga = histórico + ajuste + asignaciones`. El próximo lead → gerente **opted-in, no blacklist, con MENOR carga**. **Ajuste** nivela a los que entraron tarde. **Tier 2 = mitad** (peso ×2). 6 zonas (SJ1, SJ2/Caguas, HAT, PON, MAYA, COR), 78 municipios→zona, ~50 gerentes.

**Fórmulas reales (hoja `Dashboard - Leads`, verificado):**
- `Offers-T1-{zona}` (carga) = `COUNTIFS(DistribucionLeads[zona], gerente) + Ajuste` (excluye BlackList; Tier2 marca aparte).
- `Rank-{zona}` = menor T1 = rank 1 = siguiente. Tier 2 llega a rank 1 cada 2 vueltas.
- Variante **Hoy**: igual contra las citas del día (se reinicia diario; primero-en-responder).

**Funciones:** `rankZona/proximoGerente`, `rankZonaHoy/proximoGerenteHoy`, `rankCanal/proximoGerenteCanal`, `blacklistActiva`, `zonaDeMunicipio`.

**Cascada de decisión (`decision.ts`):** 1) ¿tiene Deal? → consultor del Deal. 2) ¿consultor activo? → se mantiene; inactivo → gerente líder. 3) sin consultor → **Distribuidor** (rotación hoy/futura).

---

## 5) Integración Zoho (LIVE) — `lib/zoho.ts`
- **Org US `.com`, ORG 699641359.** Auth = token de servicio (refresh token en `.env.local` + Vercel env, **NO en repo**). Reutilizable en otros proyectos Windmar (misma org).
- **Scopes (11):** `leads.READ/CREATE/UPDATE, deals.READ, notes.ALL, attachments.CREATE, custom.READ, users.READ, settings.fields.READ, settings.layouts.READ, coql.READ`.
- **API names confirmados (contra org real):**
  - Estado: `Lead_Status = 'Cita Coordinada'` · Fecha cita: **`Presenter_Appointment`** (datetime) · Ciudad: `City` · Dirección: **`Direcci_n`** (no `Street`) · Nombre: `Full_Name`.
  - Consultor: **`Sales_Rep`** (lookup módulo `Sales_Team`, ~4257) · Asesor/dueño: `Owner` (subcampos `first_name/last_name/id`, **NO** `full_name`).
  - **`Quality_Stage`** (On Hold Quality / Cita Confirmada / Ofrecida / Rechazada / On Hold Cita / Quality Audited) · **`Quality_Owner`** (analista: *Andrea Catalina Castro = Cata*, *Francisco Quiñones*, *Julieth Torres*; "sin dueño" = cola por repartir).
  - `Team_Assitance` (multiselect, **typo** en el API name = el nuevo) vs `Team_Assistance` ("- Viejo") · `Post_Cita_Status` · `Qualified_Lead` ("¿Cita se dió?").
- **El reporte de Calidad** = `Lead_Status='Cita Coordinada' AND Quality_Stage='On Hold Quality' AND Quality_Owner=<analista>`. La cola **"Sin dueño"** son las que faltan repartir (la app las muestra y filtra por analista).
- **⚠️ COQL gotchas:** 3+ condiciones AND requieren **paréntesis** `(a and b) and (c)` o `SYNTAX_ERROR`; `count()` NO soportado; sin JOIN (Deal aparte); datetime con hora; la org devuelve `-05:00`.
- **Rutas:** `/api/zoho/leads` (cola On Hold Quality + decisión), `/api/zoho/hoy` (citas de hoy + rotación), `/api/zoho/sales_team`, `/api/zoho/users`, `/api/zoho/assign` (POST escribe Sales_Rep/Owner + nota), `/api/zoho/note`. Todas **conmutan a MOCK** si no hay credenciales (`zohoConfigured()`).
- **Reportes de Zoho** que usan los analistas: `crm.zoho.com/.../tab/Reports/list?category=everything` (no se listan por API; sí replicamos su data por COQL).

---

## 6) Pixel Agents — `lib/office.ts` + `components/PixelOffice.tsx` + `app/pixel-agents/page.tsx`
- **Modelo de grid de tiles** (DOM, no canvas). `DEFAULT_LAYOUT` actual = **28×15**, 3 áreas (Workspace, Reunión, Gerencia). `LAYOUT_REV=4` (al subirlo, recarga el layout viejo del navegador).
- **Escala NATIVA** (como el repo): `AGENT_SCALE=1.0`, `FURN_SCALE=1.0`, electrónica 0.8.
- **Comportamiento:** inactivo = **sentado** en su escritorio; con trabajo real (Zoho) = **tecleando**. Se sientan **de perfil** mirando su monitor (`face` por escritorio en el layout). Monitores **PC_SIDE / PC_BACK** espejados para apuntar al agente. **Deambulan solo dentro de su cuarto** (`homeBox`) → **no cruzan muros**. z-sort: el escritorio tapa las piernas.
- **Estado en vivo:** la página consulta `/api/zoho/leads` (45s); agentes reaccionan (Zoho Sync lee, Distribuidor trabaja si hay citas sin consultor) con burbuja de estado real (`busyRef`).
- **Editor:** botón **Editar / Dejar de editar** (por defecto solo se ven). 5 pestañas: Agentes, Muebles, Áreas, Tamaño, Logo. Click-para-editar, arrastrar/redimensionar, **botón Guardar cambios**. Persiste en `localStorage`.
- **Acceso = easter egg:** robot discreto en la esquina inferior izquierda del sidebar (ya NO está en el menú).
- **Pendiente estético:** paredes con autotile real (`walls.png`), pisos HSL, pathfinding diagonal — requieren portar el motor canvas del repo.

---

## 7) 🗺️ ROADMAP (cómo continuar)
**✅ FASE B — cerrar el ciclo de asignación (HECHA 2026-06-24)**
1. ✅ Botón **"Distribuir → [gerente]"** en `/citas` → confirmación inline → `POST /api/distribuir` recomputa la decisión (autoritativo), mapea **gerente→Sales_Team por nombre** (normalizado), escribe **`Sales_Rep` + nota (BOT DISTRIBUIDOR)** y registra en store (`asignaciones` + `hoy` si es de hoy → avanza rotación). Si el gerente no existe en Sales_Team, deja **solo nota** y lo marca.
2. ✅ **Historial** con columnas Consultor/Zoho + **export a Excel (CSV con BOM)**. Tipo `Asignacion` extendido (`via/consultor/leadId/zoho`).
   - _Verificado contra Zoho real: match exacto del gerente en los 4260 Sales_Team; camino de escritura probado sin tocar prod (omitiendo `leadId`)._
   - _Pendiente menor: el campo escrito es `Sales_Rep` (consultor). Si Miguel quiere un campo "gerente asignado" aparte, es un cambio de 1 línea en `updateLead`._

**FASE 2 — persistencia real (Supabase)**
3. Migrar el estado de rotación (cargas, asignaciones, blacklist, historial) a **Supabase**. ⚠️ Usar el proyecto de la EMPRESA **"Dashboards - Jnsbstn Rivera"** (org WindMar Home, Vercel Marketplace), schema `distribuidor`. La org Marketplace no la alcanza el connector OAuth → operar con **Management API + PAT** (ver memoria `reference-supabase-windmar-home-mgmt-api`).

**FASE 3 — automatización (N8N)**
4. Endpoint **`/api/distribuir`** (que N8N pueda llamar).
5. Flujo **N8N**: trigger (cita pasa a Cita Coordinada/On Hold Quality — webhook Zoho `notifications.ALL` o schedule) → llama la app → **avisa a Miguel por Teams/correo** → al aprobar, escribe en Zoho.

**Otros pendientes**
6. Regla de **consultor inactivo** (hoy se asume activo) + rama **Deal→owner** (query aparte a Deals).
7. Cobertura Excel faltante: **PP Hatillo** (canal) e **Histórico** (vista archivo).
8. Validación: cargar ~5.320 repartos históricos y comparar motor vs Excel.
9. **Seguridad:** la URL es pública con login simple y escribe en Zoho producción → endurecer login / roles antes de uso amplio.

---

## 8) Preguntas abiertas (definir con Cata/Miguel/Andrés)
1. **🔑 ¿Qué campo escribe el Distribuidor en Zoho?** (A `Sales_Rep` / B `Gerente_Asignado` / C nota) — **bloquea Fase B**.
2. ¿Cómo se sabe que un consultor está **inactivo**?
3. ¿`Team Assistance` cambia la rotación o solo etiqueta?
4. ¿Aprueba solo Miguel? ¿timeout/escala?
5. ¿Webhook o polling para el trigger?
6. ¿Se mantiene el tope 1/gerente/zona/semana en citas de hoy?

---

## 9) Notas técnicas
- **Renombres recientes:** Cumplimiento KPI "Contestadas/No contestadas" → **"Atendidas/No atendidas"** (confundía con contestar llamadas). Coronas (ícono Crown) **quitadas** de Asignar/Canales/Hoy/Dashboard.
- `.env.local` está **gitignored** (verificado). Las llaves Zoho viven ahí (local) y en Vercel env (prod). El **PAT de Vercel** lo da el usuario por chat cuando hay que desplegar/operar (no se guarda).
- **🔒 Interruptor de escritura `DISTRIBUIDOR_ESCRIBE`** (`lib/zoho.ts → escrituraHabilitada()`): **apagado por defecto = modo demo** (lee Zoho en vivo, pero "Distribuir" NO escribe; muestra a quién le tocaría y lo registra en Historial con badge "Demo"). Para **activar la escritura real**: en Vercel (team `windmar`) → env var `DISTRIBUIDOR_ESCRIBE=1` y redeploy. `/citas` muestra banner ámbar "Modo DEMO" / verde "Escritura ACTIVA". Plan: dejarlo en demo hasta que Cata valide la lógica.
- ⚠️ **Zoho rate-limita el refresh del token por cuenta**: probar `/api/distribuir`/`/leads` muchas veces seguidas agota los refresh y la app cae a MOCK temporalmente (se recupera solo en minutos). No martillar el endpoint en pruebas.
- `preview_screenshot` se cuelga con animaciones; verificar en navegador real. Next 16 = un solo dev server por carpeta (no levantar 2 en 3010).
- Verificación típica: `npx tsc --noEmit` + smoke con `curl -b "wh_auth=1" .../api/zoho/leads`.
- **Memorias relevantes:** `project_distribuidor_leads`, `reference_windmar_zoho_integracion` (scopes, API names, COQL), `reference_supabase_windmar_home_mgmt_api`, `reference_windmar_brand`, `project_windmar_ai_agent_zoho`.
