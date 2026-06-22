# 🪟 HANDOFF — Distribuidor de Leads · Windmar Home

> Documento de traspaso para **continuar en un chat nuevo**. Léelo completo: tiene el estado, la lógica de negocio, la arquitectura, lo pendiente y cómo seguir.

---

## 0) Cómo continuar en un chat nuevo (lee esto primero)

1. Proyecto en: `C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor`
2. Arrancar:
   ```powershell
   cd "C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor"; npm install; npm run dev
   ```
   Abrir **http://localhost:3010** → login **ADMIN / 1234\***
3. Fuente original (Excel + Word de Miguel): `C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\` (`Distribucion de Leads.xlsx`, `Criterios de Asignación de Leads.docx`).
4. El repo de referencia de los pixel agents (assets + editor de layout para portar): `C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\pixel-agents-main\` (licencia **MIT**).
5. Pégale al nuevo asistente: *"Lee `app-distribuidor/HANDOFF.md` y continúa."*

---

## 1) Qué es y objetivo

App que **reemplaza el Excel de distribución de leads de Miguel** (Telemercadeo/Calidad) y, a futuro, la **vista manual de Zoho de Cata**. Reunión base con **Miguel Bethencourt** (jefe) y **Catalina (Cata)**; **Andrés Rengifo** es el par técnico que dará acceso a Zoho.

**Visión final:** Cata ya no mira Excel ni filtra Zoho a mano. Un **agente** lee las *citas coordinadas* de Zoho, **decide la asignación** según los criterios de Miguel/Cata, **N8N** notifica por Teams/correo y **Miguel aprueba/rechaza**.

---

## 2) Stack y cómo está hecho

- **Next.js 16** (App Router) + **React 19** + **TypeScript** + **Tailwind v4**.
- **Recharts** (gráficos), **Framer Motion** (animación), **Lucide** (iconos), **next-themes** (claro/oscuro).
- **Auth**: cookie + `middleware.ts` (gating). Login `ADMIN/1234*` (igual panel Ventas).
- **Persistencia**: archivo JSON (`data/data.json`, se regenera de `data/seed.json`). **Fase 2 = Supabase** schema `distribuidor`.
- Puerto **3010**. Config preview en `C:\Claude Code\.claude\launch.json` (nombre `distribuidor`).

### Estructura
```
app/
  page.tsx            Dashboard (KPIs + charts + próximo turno por zona)
  citas/              Citas Coordinadas (Zoho) + motor de decisión   ← lógica de negocio
  asignar/            Asignar lead (rotación futura por zona)
  hoy/                Distribución HOY (citas mismo día) + Contestó/No
  canales/            Canales secundarios (Media/Booth/Instagram)
  cumplimiento/       Dashboard de cumplimiento (Contestado vs No)
  mapa/               Mapa interactivo PR (78 municipios) + lista
  gerentes/           Opt-in por zona, ajuste, Tier 2, blacklist
  blacklist/          Listas con vencimiento automático
  historial/          Bitácora de asignaciones de la sesión
  pixel-agents/       Oficina pixel top-down (agentes que caminan/trabajan)
  login/              Login con fondo animado "Background Paths"
  layout.tsx, template.tsx, globals.css
  api/                state, asignar, gerente, reset, hoy, canales, cumplimiento,
                      login, logout, zoho/leads
lib/
  engine.ts           Motor de rotación (zona, HOY, canal) + blacklist
  decision.ts         Cascada de decisión de citas coordinadas (Zoho)
  store.ts            Almacén file-backed (seed → data)
  types.ts            Tipos (DB, Gerente, Asignacion, HoyAsignacion, Canal, ...)
  office.ts           Motor Pixel Agents: grid de tiles, catálogo muebles, áreas,
                      asientos, walkable/blocked grids, BFS pathfinding
components/
  Sidebar, ThemeToggle/Provider, AnimatedBackground (aurora), BackgroundPaths,
  charts, ui, AnimatedCounter, Reveal, PixelOffice
data/  seed.json (extraído del Excel) · data.json (runtime) · pr_map.json (mapa)
public/agents/  clean/ (sprites ChatGPT procesados) · pixel/ (char_0..5 + office/)
scripts/  build_map.py · process_sprites.py · recolor_chars.py
```

---

## 3) El motor (lo que descifré del Excel) — `lib/engine.ts`

**Rotación equitativa por zona:** `carga efectiva = histórico + ajuste + asignaciones`. El próximo lead va al gerente **opted-in con MENOR carga**, no blacklisteado. El **ajuste** iguala a quien entró tarde. **Tier 2 = mitad de leads** (peso ×2). **Cordillera = opcional**.

- 6 zonas: `SJ1` San Juan 1 · `SJ2` San Juan 2 (Caguas) · `HAT` Hatillo · `PON` Ponce · `MAYA` Mayagüez · `COR` Cordillera. 78 municipios → zona.
- 50 gerentes, ~5.320 asignaciones históricas, blacklist real (extraídos a `seed.json`).
- Funciones: `rankZona/proximoGerente`, `rankZonaHoy/proximoGerenteHoy` (HOY = solo citas del día, se reinicia), `rankCanal/proximoGerenteCanal`, `blacklistActiva`, `zonaDeMunicipio`.

**Reglas (Word de Miguel):** cita mismo día = oferta Teams primero-en-responder (tope 1/gerente/zona/semana); cita futura = distribuidor; lead recurrente (con deal) → consultor existente; confirmación 20 min o pierde turno; blacklist 1ª 30d / 2ª 3 meses / 3ª permanente; top 50% cierre da prioridad.

**Fórmulas reales del Excel (hoja `Dashboard - Leads`, verificado 2026-06-22):** por zona (SJ1/SJ2/HAT/PON/MAYA/COR) y su variante "Hoy":
- `Opt In - {zona}` = 1 si el gerente participa en esa zona.
- `Ajuste - {zona}` = handicap manual (ej. 10) para nivelar a los que entraron tarde.
- `Black List` = `COUNTIFS(BlackList[Nombre De Consultor], gerente)` → >0 excluye.
- `Offers - T1 - {zona}` (carga efectiva) = `IF(OptIn>0, IF(BlackList>0,"Black List", IF(Tier2>0,"Tier 2", COUNTIFS(DistribucionLeads[zona], gerente) + Ajuste)), "")`.
- `Offers - T2 - {zona}` = igual pero sin la rama Tier2 (cuenta cruda + Ajuste).
- `Rank - {zona}` = `IF(MIN(todos T1) - esteT2 == Tier2, 1, RANK.EQ(esteT1, columna T1, asc))` → **el de menor carga = rank 1 = siguiente**; Tier 2 solo llega a rank 1 cada 2 vueltas (= mitad de leads).
- Variante **Hoy**: idéntica contra `DistribucionLeadsHoy` (citas del día, se reinicia).
→ El motor `engine.ts` ya implementa esto (carga = histórico+ajuste+asignaciones; próximo = opted-in no-blacklist con menor carga; Tier2 peso ×2). Mapeo Zoho: el "consultor" del Excel = campo **`Sales_Rep`** (módulo Sales_Team), el "asesor/dueño" = **`Owner`**.

---

## 4) ⭐ Lógica de decisión de Citas Coordinadas (Zoho) — `lib/decision.ts`

Disparador en Zoho: `Lead Status = "Cita coordinada"` y `Fecha ≥ hoy`. **Cascada** (función `decidir(db, lead)`):

1. **¿Tiene Deal?** → respetar al **dueño del Deal** (consultor del deal).
2. **¿Consultor asignado?**
   - activo → se mantiene.
   - inactivo → **gerente líder**; si el gerente también inactivo → **Distribuidor**.
3. **Sin consultor** → **Distribuidor** (rotación HOY si la fecha es hoy, futura si no).

Campos Zoho necesarios (solo-lectura): `Lead Status`, `Fecha de cita`, `Ciudad` (→ zona), `Team Assistance` (TELEMERCADEO/VENTAS/VASS), `Lead Source`, `Consultor/Owner` + activo/inactivo, `Deal + Deal Owner`, jerarquía `Reporting To` (consultor→gerente).

**Estado actual (2026-06-22): BACKEND ZOHO LISTO, conmutable por env.** Cliente en `lib/zoho.ts` (token de servicio, COQL, getSalesTeam, getUsers, updateLead Sales_Rep/Owner, addNote firma BOT). Rutas:
- `/api/zoho/leads` → REAL (COQL `Lead_Status=Cita coordinada AND fecha≥hoy`) si hay credenciales, si no MOCK (software vivo). Corre `decidir()` en cada lead.
- `/api/zoho/sales_team` (consultores), `/api/zoho/users` (asesores), `/api/zoho/assign` POST (cambia Sales_Rep/Owner + nota), `/api/zoho/note` POST.
- Activación: llenar `ZOHO_CLIENT_ID/SECRET/REFRESH_TOKEN` en `.env.local` (ver `.env.example`). Sin eso → modo demo (503 en escrituras, [] en listas).
- **Vista `/citas`**: conectada, **botón Actualizar + auto-refresh (60s + al volver a la pestaña)**, fuente "Zoho (en vivo)" vs "DEMO", y **Reasignar consultor** (Calidad) que escribe `Sales_Rep` vía `/api/zoho/assign` (habilitado solo en vivo).
- ✅ **CONECTADO EN VIVO (2026-06-22)**: credenciales en `.env.local` (gitignored), refresh token con 11 scopes. API names **confirmados** contra la org: fecha=`Presenter_Appointment`, team=`Team_Assitance` (con typo), estado=`Cita Coordinada`. COQL probado: **91 citas coordinadas** reales fecha≥hoy + 4257 Sales_Team. Owner se consulta con `Owner.first_name/last_name/id` (NO `full_name`). **Para ver `/citas` en vivo hay que reiniciar `npm run dev`** (Next carga `.env.local` al arrancar).
- ⚠️ **Pendiente**: regla de consultor **inactivo** (hoy se asume activo); enriquecer con Deal (COQL no hace join → query aparte a Deals si se quiere la rama "Deal→owner").

---

## 5) Pixel Agents — oficina top-down

- **Assets**: tomados del repo **pixel-agents-main** (MIT). Personajes **animation-ready** `char_0..5` (formato **7×3, 16×32**: fila0=abajo, 1=arriba, 2=derecha [izq=espejo]; columnas **walk1, walk2(idle), walk3, type1, type2, read1, read2**). Tileset real (pisos/muebles) en `public/agents/pixel/office/`.
- **Motor visual** (`components/PixelOffice.tsx`): FSM caminar→trabajar(teclear, sentado con offset)→idle; `SpriteImg` recorta frames por `SHEET_META`. Agentes en % con `transition` suave.
- **Gestión** (`app/pixel-agents/page.tsx`): agregar/quitar agentes, editar nombre(función)/cuarto(Workspace/Reunión/Gerencia)/modelo; persiste el roster en localStorage. Logos "WINDMAR HOME" dentro.
- **Scripts**: `process_sprites.py` (limpia hojas de ChatGPT), `recolor_chars.py` (ropa→azul Windmar).

### ✅ Reescrito 2026-06-19 a MODELO DE GRID DE TILES (control total) — sigue siendo DOM, no canvas
A pedido del usuario ("control total: agregar áreas, escritorios libres, ampliar oficina, que anden por TODA la oficina esquivando muebles") se migró del modelo de % fijo a un **grid de tiles** (estilo repo pixel-agents) renderizado en DOM. Motor nuevo en **`lib/office.ts`**.

- **`lib/office.ts`** (motor, sin React): `FURN_CATALOG` (footprint en TILES), tipos `Room/Furn/LogoItem/OfficeLayout`, `DEFAULT_LAYOUT` (40×22, 3 áreas), grids derivados `floorGrid/blockedGrid/walkableGrid`, `deriveSeats` (asiento = fila SUPERIOR del escritorio), **`bfs`** (4-vecinos, con set `extra` para el asiento sobre el mueble), `randomWalkable/nearestWalkable`, límites de tamaño.
- **Caminar por toda la oficina** ✅ — agentes en coords de tile (float, interpolado); FSM en `page.tsx`: idle→elige meta (45% su escritorio, 55% celda aleatoria de TODA la oficina)→`bfs`→camina esquivando muebles→trabaja/idle. Áreas adyacentes quedan conectadas (validado: 665 celdas, 0 islas).
- **Sentarse natural (z-sort)** ✅ — `zFromRow(bottomRow)`; agente sentado z = `row+1.5`, escritorio z = `row+2` → escritorio delante, **tapa piernas** (verificado: agente 179 < escritorio 180, etc.). Etiquetas z:8500.
- **Fase A estética (2026-06-22)**: paredes traseras 3D por cuarto (cap claro + cara navy + sombra, donde cuelgan cuadros/estantes); pisos con tinte CSS (8 pisos, madera/azul/neutro); sillas detrás de cada agente; monitores compactos (electrónica escala 0.8) sobre el escritorio; logos Windmar enmarcados conservados; barra "Actividad en vivo" + panel contraíble + click-para-editar. Versión DOM-fiel; el pixel-exacto (autotile `walls.png`, pisos HSL, surface-items, pathfinding suave) requiere portar el motor canvas del repo.
- **UI**: oficina arriba (acotada a `max-w-[1000px]` centrada) + **panel de personalización full-width ABAJO** con las 5 pestañas. **Click-para-editar**: tocar un agente/mueble/logo en el lienzo lo selecciona y abre su pestaña (`onPick*` en PixelOffice → `pick*` en page). Muebles/logos arrastrables siempre; áreas solo en pestaña "Áreas" (`areasMode`). Escalas balanceadas: `AGENT_SCALE` (1.5) y `FURN_SCALE` (1.15, solo visual, anclado al borde inferior; footprint/colisión intactos).
- **Control total (panel derecho → 5 pestañas)** ✅:
  - **Agentes**: nombre, modelo, agregar/quitar (cada uno toma un escritorio libre).
  - **Muebles**: paleta por categoría, arrastrar (encaja a tile), espejar, borrar, **Restaurar oficina**.
  - **Áreas**: agregar/renombrar/borrar cuartos, picker de piso (floor_0/3/5), arrastrar + **redimensionar** (handle naranja en el lienzo).
  - **Tamaño**: ± columnas/filas (20–80 × 12–50) para ampliar la oficina.
  - **Logo**: agregar logo pixel-art por URL/dataURL, arrastrar + redimensionar dentro de la oficina (`LogoItem`).
- **Persistencia**: layout completo en `localStorage["pixelOfficeLayoutV2"]`; roster en `["pixelOfficeAgents"]` (sin `room`).

### ⚠️ Pendiente de pulir en Pixel Agents
1. **Logo del usuario**: cuando pase el PNG, guardarlo en `public/agents/pixel/` y dejar la ruta en la pestaña Logo (o ya lo agrega él por URL/dataURL).
2. **Colisión al editar**: el editor no impide solapar muebles/áreas ni colocar fuera de un cuarto; el motor lo tolera (esas celdas no son caminables) pero faltaría validación visual (ghost verde/rojo del repo).
3. **Tuning visual**: `SIT_OFFSET` (0.16) y el offset z de caminar (0.9) si hace falta ajustar cobertura/orden — ver en navegador real.
4. **Caminata aún más fina**: el paso es lineal por celdas (BFS 4-vecinos); el repo añade diagonal/suavizado. Mesa de reunión (4 de alto) tapa bastante al agente sentado; si molesta, sentarlo en un borde lateral.

---

## 6) Cobertura del Excel (pestaña por pestaña)

| Excel | App | Estado |
|---|---|---|
| Leads Digitales | Asignar | ✅ |
| Distribucion HOY | Hoy | ✅ |
| Dashboard HOY | Cumplimiento | ✅ (sembrado 45/14 = 76%) |
| Dashboard Leads | Dashboard | ✅ |
| Zonas-Pueblos | Mapa | ✅ |
| Booth\|Media + Instagram | Canales | ✅ |
| Black List | Black List | ✅ |
| Pivots | Dashboard/charts | ✅ |
| **PP Hatillo** · **Histórico** | — | ⏳ pendiente |

---

## 7) Pendientes priorizados (roadmap)

1. **Zoho real (solo-lectura)** — depende del acceso de **Andrés**. Reemplazar mock en `/api/zoho/leads`.
2. **N8N + aprobación de Miguel** (Teams/correo, aprobar/rechazar) — agente N8N.
3. **Escritura a Zoho** (registrar asignación) — fase 3.
4. **Pixel Agents**: ✅ seating z-sorted + editor de muebles (2026-06-19). Falta: acoplar escritorios↔asientos, editar zonas/cuartos, pathfinding BFS (ver §5).
5. **PP Hatillo** (canal) e **Histórico** (vista archivo).
6. **Migrar a Supabase** (schema `distribuidor`) + deploy Vercel.
7. Validación verde: cargar ~5.320 repartos históricos y comparar motor vs Excel.

---

## 8) Tiempos / cadencia (propuesta para Miguel/Cata)

- Zoho citas de HOY: revisar ~cada 10 min (o webhook = tiempo real). Futuras: ~cada 1 h.
- Asignación: inmediata al detectar cita sin consultor.
- Aprobación de Miguel: notificación inmediata; ventana 30 min; si no responde → recordatorio/escala.
- Cumplimiento: reporte diario + on-demand.

## 9) Preguntas abiertas (definir con Cata/Miguel/Andrés)
① ¿Cómo se sabe que un consultor/gerente está **inactivo**? · ② ¿Jerarquía consultor→gerente en Zoho (`Reporting To`)? · ③ ¿`Team Assistance` cambia la rotación o solo etiqueta? · ④ ¿Aprueba solo Miguel? ¿timeout? · ⑤ ¿Escritura a Zoho ahora o después? · ⑥ ¿Webhook o polling? · ⑦ ¿Se mantiene el tope 1/gerente/zona/semana en citas de hoy?

---

## 10) Notas técnicas
- Login requerido; assets `/agents/**` excluidos del middleware.
- `preview_screenshot` se cuelga con animaciones infinitas (aurora/loops) — verificar en navegador real.
- Plan visual para Miguel: Artifact (ver historial) + `scratchpad/plan-distribuidor.html`.
- Memorias relevantes (carpeta memory): `project_distribuidor_leads`, `reference_windmar_brand`, `project_windmar_ai_agent_zoho` (agente Zoho ya tiene `asignar_leads`).

_Última actualización: 2026-06-19 · v1 funcional en localhost (Fase 0) · Pixel Agents: seating z-sort natural + editor de muebles._
