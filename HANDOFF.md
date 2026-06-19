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

---

## 4) ⭐ Lógica de decisión de Citas Coordinadas (Zoho) — `lib/decision.ts`

Disparador en Zoho: `Lead Status = "Cita coordinada"` y `Fecha ≥ hoy`. **Cascada** (función `decidir(db, lead)`):

1. **¿Tiene Deal?** → respetar al **dueño del Deal** (consultor del deal).
2. **¿Consultor asignado?**
   - activo → se mantiene.
   - inactivo → **gerente líder**; si el gerente también inactivo → **Distribuidor**.
3. **Sin consultor** → **Distribuidor** (rotación HOY si la fecha es hoy, futura si no).

Campos Zoho necesarios (solo-lectura): `Lead Status`, `Fecha de cita`, `Ciudad` (→ zona), `Team Assistance` (TELEMERCADEO/VENTAS/VASS), `Lead Source`, `Consultor/Owner` + activo/inactivo, `Deal + Deal Owner`, jerarquía `Reporting To` (consultor→gerente).

**Estado actual:** `/api/zoho/leads` devuelve **MOCK** con 6 citas que ejercen las 5 ramas (ver `/citas`). Para producción: reemplazar el mock por la llamada real a Zoho (env `ZOHO_TOKEN`/`ZOHO_DC`) filtrando por Lead Status + Fecha. Todo lo demás (lógica, UI, rotación) ya funciona.

---

## 5) Pixel Agents — oficina top-down

- **Assets**: tomados del repo **pixel-agents-main** (MIT). Personajes **animation-ready** `char_0..5` (formato **7×3, 16×32**: fila0=abajo, 1=arriba, 2=derecha [izq=espejo]; columnas **walk1, walk2(idle), walk3, type1, type2, read1, read2**). Tileset real (pisos/muebles) en `public/agents/pixel/office/`.
- **Motor visual** (`components/PixelOffice.tsx`): FSM caminar→trabajar(teclear, sentado con offset)→idle; `SpriteImg` recorta frames por `SHEET_META`. Agentes en % con `transition` suave.
- **Gestión** (`app/pixel-agents/page.tsx`): agregar/quitar agentes, editar nombre(función)/cuarto(Workspace/Reunión/Gerencia)/modelo; persiste el roster en localStorage. Logos "WINDMAR HOME" dentro.
- **Scripts**: `process_sprites.py` (limpia hojas de ChatGPT), `recolor_chars.py` (ropa→azul Windmar).

### ⚠️ Pendiente de pulir en Pixel Agents (lo que pidió el usuario)
1. **Sentarse natural al PC**: hoy usa offset + frames type. Falta **z-sort por Y** (que el escritorio tape las piernas) como hace el repo → se vería realmente "sentado". Portar de `pixel-agents-main/webview-ui/src/office/engine/renderer.ts` (z-sort) y `characters.ts`.
2. **Mover/editar oficinas (editor de layout)**: el repo trae un editor completo (mover/colocar muebles, crear cuartos, `default-layout.json`). Portar `office/editor/*` + `layout/*`. Es el módulo grande siguiente.
3. Caminata aún más natural (pathfinding BFS del repo, evitar muebles).

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
4. **Pixel Agents**: seating z-sorted natural + **editor de layout** (mover oficinas/muebles).
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

_Última actualización: 2026-06-19 · v1 funcional en localhost (Fase 0)._
