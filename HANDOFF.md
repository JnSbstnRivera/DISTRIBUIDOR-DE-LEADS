# 🪟 HANDOFF — Distribuidor de Leads · Windmar Home

> Traspaso para **continuar en un chat nuevo**. Léelo completo: estado, arquitectura, lógica, dónde vive la data, pendientes y roadmap.
> _Última actualización: 2026-07-01._
>
> **⚠️ REGLA: NO hacer `git push` sueltos.** El Vercel es de la empresa y cada push = build = costo. Trabajar LOCAL, verificar, y desplegar SOLO cuando el usuario lo pida (agrupando cambios).

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
6. **Campo de escritura CONFIRMADO:** el distribuidor escribe **`Assign_Cons_Appt_Name` + `Assign_Cons_Appt_Id`** (campos dedicados, text) y avanza **`Quality_Stage` → "Cita Confirmada"** + nota (BOT DISTRIBUIDOR). NO Sales_Rep. Todo gateado tras el flag **`DISTRIBUIDOR_ESCRIBE`** (APAGADO = modo demo, no escribe). Ver §0.5 y §7.

---

## 0.5) 🟢 ESTADO AL 2026-07-01 (lo más reciente — LEER)

Trabajé la semana con Cata/Miguel. **Fases 1-5 del plan de la reunión: HECHAS** (reimport Excel, motor, Zoho lectura, front reducido, verificación). Todo desplegado en prod **en MODO DEMO** (lee Zoho en vivo, NO escribe).

**Lo que quedó funcionando (prod):**
- **Citas (`/citas`)** — vista analista COMPACTA (7 columnas, sin scroll horizontal): Cita · Lead · Ciudad · Sales Rep · Quality Stage · **Ruta** · Distribuidor. **Filtros rápidos** (Todas / Por distribuir / Hoy / Promotor / En espera / Ya asignado) + filtros Team Assistance + Lead Source + analista. Excluye citas owned por **Juan Camilo Salas Montoya** (creación masiva = ruido: 71→~25). Badge de **Ruta** (Hoy/Digitales/PP Hatillo/Consultor/En espera).
- **Motor** (`lib/engine.ts` + `lib/decision.ts`): cascada = **horario incompatible→"espera"** (fuera 7am-8pm, ej. citas 12am) · Deal→dueño · **PROMOTOR→PP Hatillo** (por producto vía Lead_Type; PP Hatillo es SOLO para promotores) · consultor activo→se mantiene · sin consultor→DISTRIBUIDOR por zona (Hoy si es hoy, Leads Digitales si mañana+). Rank por menor carga (OffersT2), Tier2 POR ZONA excluido del "siguiente" (se intercala aparte). **Verificado 5/6 zonas vs Excel** (MAYA difiere por scheduling Tier2 "cada 2 vueltas" — gap aceptado para piloto).
- **Escritura preparada** (tras flag, OFF): al confirmar Distribuir → `Assign_Cons_Appt_Name`(=consultor) + `Assign_Cons_Appt_Id` + `Quality_Stage="Cita Confirmada"` + nota. `/api/distribuir`.
- **Front reducido** a: Citas(Analista) · Leads Digitales(`/asignar`) · Distribución Hoy(`/hoy`) · **PP Hatillo**(`/canales` reconvertido, rota por producto Solar-Roofing/Water-Anker) · Mapa · **Consulta**(Dashboard+Gerentes+BlackList) · Historial. Se quitaron del menú: Cumplimiento, Dashboard suelto.
- **Historial**: columnas Consultor/Zoho + export CSV.

**Pixel Agents — ✅ TERMINADO Y APROBADO (2026-07-01):** porté el motor canvas HD del repo a `lib/pixel/` (funciona, con editor propio `PixelEditPanel`), PERO **el usuario prefirió la versión DOM** (se ve como le gusta y carga rápido; la HD decodifica ~57 PNG en el navegador = lenta). Estado final:
  - **Restaurada la versión DOM** con `git checkout 1ae3fa8 -- app/pixel-agents/page.tsx` (`components/PixelOffice.tsx` + `lib/office.ts`).
  - **Mejoras visuales reutilizando assets del repo pixel-agents-main (sin migrar a canvas):**
    - **Paredes autotile reales**: `wall_0.png` (64×128 = grid 4×4 de piezas 16×32) que estaba copiado del repo sin usarse. `lib/office.ts` → `wallGrid()` (anillo exterior de la unión de cuartos, sin puertas explícitas) + `wallMask()` (bitmask N=1/E=2/S=4/W=8). `PixelOffice.tsx` pinta la capa con `background-position` (misma técnica que los personajes). Se quitó el degradado CSS falso de "pared trasera".
    - **Agentes de frente tecleando**: escritorios con `face: "down"` (miran al frente), monitor `PC_BACK` centrado justo delante (pantalla hacia el agente). La animación de tecleo (frames type1/type2, dirección down) mueve **ambos brazos de frente**. Sillas `CUSHIONED_CHAIR_FRONT`.
    - **`SIT_RAISE = 0.04`** en `PixelOffice.tsx`: sube apenas al agente en la silla para que el torso/bracitos asomen sobre la mesa sin despegarse del monitor. (Se probó un "bob"/rebote y NO gustó — parecía que saltaban; se quitó. El único movimiento es el de los bracitos.)
    - `LAYOUT_REV = 6` (descarta layouts viejos guardados en localStorage).
  - Verificado local: `npx tsc --noEmit` limpio, carga en vivo (Zoho 21 citas, 2 a distribuir), sin errores de consola.
  - **⚠️ TODO SIN COMMITEAR NI PUSHEAR** (regla NO push suelto — agrupar y subir cuando el usuario lo pida).
  - **Motor HD parqueado** (`lib/pixel/`, `components/PixelOfficeHD.tsx`, `PixelEditPanel.tsx`) sin uso; no borrar. Si se retoma: pre-decodificar PNG→JSON en build para que cargue rápido.
  - Pixel Agents sigue siendo **easter-egg** (robot en esquina del sidebar).

**📌 ESTUDIO DEL EXCEL (versión Jul 1) — el enfoque es FIEL:** re-estudiado hoja por hoja + docx de Criterios. **Confirmado:** motor real = `Offers = COUNTIFS(columna-zona, gerente) + Ajuste` (excluye BlackList, solo si `Opt In`) — fórmula `AT7` de Leads Digitales + estructura de `Dashboard - Leads`; 6 zonas; Tier 2 POR ZONA; Digitales(futuras)/HOY(same-day); PP Hatillo por producto; reglas del docx (deal→consultor recurrente, 20 min o pierde turno, blacklist, comunicación **Teams+correo+evento de calendario**). **PP HATILLO = el canal "Booths - Hatillo"** (la hoja se titula así; el Dashboard tiene el canal `BOOTH - HAT`) = leads del booth físico de Hatillo rotados por línea de producto → el disparador Zoho va por el campo `Booths` (valor de Hatillo), falta el exacto de Andrés. **⚠️ "IG" DESCARTADO:** el Dashboard tiene columnas `IG - SJ2/PON/MAYA/CORD` + `MED`, pero Cata confirmó que "IG" NO es Instagram, no supo su origen, y se descartó → NO entra al distribuidor, NO volver a preguntar. Alcance firme = 4 hojas (Zonas-Pueblos, Leads Digitales, HOY, PP Hatillo).

**🔑 PENDIENTES PARA CERRAR (orden sugerido):**
1. ~~Restaurar/mejorar Pixel Agents DOM~~ ✅ hecho y aprobado; falta commitear/pushear cuando el usuario lo pida.
2. **Prender escritura del Distribuidor:** confirmar con **Andrés** el **disparador de PP Hatillo** (qué valor del campo `Booths` marca un lead del booth de Hatillo). `Quality_Stage→Cita Confirmada` YA confirmado por Cata. Luego `DISTRIBUIDOR_ESCRIBE=1` en Vercel. ⚠️ Al prender, escribe en Zoho PRODUCCIÓN — probar con 1 cita primero.
3. **Correo/calendario (requisito Cata + docx):** al asignar, enviar invitación para que la cita quede en el CALENDARIO del consultor Y del asesor. Vía **N8N** (u Outlook/.ics). Definir canal + correos.
4. **Regla consultor inactivo** (hoy se asume activo) + rama Deal→owner (query aparte a Deals; el docx la exige como "lead recurrente").
5. (Opcional) validar motor vs Excel al 100% (regla Tier2 "cada 2 vueltas" exacta de Andrés; hoy 5/6 zonas, MAYA falla).

**API names Zoho confirmados:** `Gerente_Asignado`(=Sales Assist, text), `Assign_Cons_Appt_Name`/`Assign_Cons_Appt_Id`(text, donde escribe el bot), `Quality_Stage`(picklist: On Hold Quality→**Cita Confirmada**), `Lead_Type`(productos), `Booths`, `Sales_Rep`(lookup Sales_Team), `Presenter_Appointment`(fecha), `Quality_Owner`(analista). Promotores (van a PP Hatillo, match por tokens): Isaac Cruz, Ivette Jiménez, Lisette Nieves, Pedro González, Samantha Ruiz, Edgar O Rodríguez, Pablo Méndez, Marisol Espinosa.

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
- **Modelo de grid de tiles** (DOM, no canvas). `DEFAULT_LAYOUT` actual = **28×15**, 3 áreas (Workspace, Reunión, Gerencia). `LAYOUT_REV=6` (al subirlo, recarga el layout viejo del navegador).
- **Escala NATIVA** (como el repo): `AGENT_SCALE=1.0`, `FURN_SCALE=1.0`, electrónica 0.8.
- **Paredes autotile (2026-07-01):** `wallGrid()` calcula el anillo exterior de la unión de cuartos (celda sin piso vecina de piso), `wallMask()` da el bitmask (N=1/E=2/S=4/W=8) para elegir la pieza del sprite `wall_0.png` (grid 4×4 de 16×32). Se pinta con `background-position`, cada pieza sube 1 tile (cara 3D). Reemplazó el degradado CSS falso.
- **Comportamiento:** inactivo = **sentado** en su escritorio; con trabajo real (Zoho) = **tecleando de frente**. Se sientan **de frente** (`face:"down"` en cada escritorio) con el monitor **`PC_BACK` centrado justo delante** (pantalla hacia el agente). `SIT_RAISE=0.04` los sube apenas para que torso/bracitos asomen sobre la mesa. La animación de tecleo (frames type1/type2, dir down) mueve ambos brazos de frente = señal de "trabajando" (NO hay bob/rebote — se probó y no gustó). **Deambulan solo dentro de su cuarto** (`homeBox`) → **no cruzan muros**. z-sort: el escritorio/monitor tapan las piernas.
- **Estado en vivo:** la página consulta `/api/zoho/leads` (45s); agentes reaccionan (Zoho Sync lee, Distribuidor trabaja si hay citas sin consultor) con burbuja de estado real (`busyRef`).
- **Editor:** botón **Editar / Dejar de editar** (por defecto solo se ven). 5 pestañas: Agentes, Muebles, Áreas, Tamaño, Logo. Click-para-editar, arrastrar/redimensionar, **botón Guardar cambios**. Persiste en `localStorage`.
- **Acceso = easter egg:** robot discreto en la esquina inferior izquierda del sidebar (ya NO está en el menú).
- **Motor HD parqueado:** `lib/pixel/` + `components/PixelOfficeHD.tsx` + `PixelEditPanel.tsx` (canvas, más fiel pero lento por decodificar PNG en el navegador). Sin uso; no borrar. Si se retoma: pre-decodificar PNG→JSON en build.

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
