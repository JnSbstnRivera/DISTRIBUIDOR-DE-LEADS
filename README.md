# Distribuidor de Leads · Windmar Home

Plataforma que **reemplaza el Excel de distribución de leads** del Departamento de Telemercadeo / Calidad de Windmar Home PR y, a futuro, la **vista manual de Zoho**. Automatiza la rotación equitativa, las citas del mismo día, el cumplimiento, los canales y la decisión de asignación de citas coordinadas.

> **Estado:** v1 funcional en localhost (Fase 0). Próximo: conectar Zoho real (solo-lectura) + N8N para aprobación de Miguel.
>
> 📄 **Para continuar el proyecto en otro chat, lee [`HANDOFF.md`](./HANDOFF.md).**

---

## ⚡ Arrancar

```powershell
cd "C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor"
npm install
npm run dev
```

Abre **http://localhost:3010** → login **`ADMIN` / `1234*`**

---

## 🧭 Secciones (réplica del Excel + más)

| Sección | Ruta | Qué hace |
|---|---|---|
| **Dashboard** | `/` | KPIs animados, gráficos (carga por zona, blacklist, asignaciones, gerentes) y "próximo turno por zona". |
| **Citas (Zoho)** | `/citas` | Citas coordinadas con el **motor de decisión** (deal→consultor→gerente→distribuidor). *(mock hasta tener Zoho)* |
| **Asignar Lead** | `/asignar` | Municipio→zona, podio top-3, ranking en vivo, asignación auto/manual. |
| **Distribución Hoy** | `/hoy` | Citas del mismo día (rotación diaria) + marcar **Contestó / No Contestó** (regla 20 min). |
| **Canales** | `/canales` | Rotación de Media Tour, Booth Hatillo e Instagram por zona. |
| **Cumplimiento** | `/cumplimiento` | Contestado vs No Contestado por zona/gerente, % y rango de fechas. |
| **Mapa de Zonas** | `/mapa` | Mapa interactivo de PR (78 municipios) con etiquetas de zona + lista buscable. |
| **Gerentes** | `/gerentes` | Opt-in por zona, ajuste de carga, Tier 2, blacklist. |
| **Black List** | `/blacklist` | Listas con estado activa/vencida automático. |
| **Historial** | `/historial` | Bitácora de asignaciones de la sesión. |
| **Pixel Agents** | `/pixel-agents` | Oficina top-down con agentes (caminan/trabajan); agregar/quitar/editar. |

---

## 🧠 Motor de asignación

**Rotación equitativa:** `carga efectiva = histórico + ajuste + asignaciones`; el próximo lead va al gerente opted-in con **menor carga**. Tier 2 = mitad de leads. Cordillera opcional. Excluye Black List. (`lib/engine.ts`)

**Decisión de citas coordinadas (Zoho):** cascada **Deal → consultor del deal · consultor activo · consultor inactivo → gerente líder · sin consultor/gerente inactivo → Distribuidor** (HOY vs futura por fecha). (`lib/decision.ts`)

---

## 🎨 Diseño

- Paleta Windmar oficial (naranja `#F89B24`, azul `#1D429B`, navy `#21274E`).
- **Claro/oscuro** con toggle de reveal circular (View Transitions); modo oscuro azul Windmar.
- Tipografía **Inter** + **JetBrains Mono**; sidebar agrupado; fondo aurora animado; scroll-reveal.
- **Pixel Agents**: sprites animation-ready del repo MIT (caminata natural), tileset real, oficina con logos Windmar.

---

## 🛠️ Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · Recharts · Framer Motion · Lucide · next-themes. Persistencia file-backed (`data/data.json` ← `data/seed.json`), lista para migrar a Supabase.

## 📁 Estructura y scripts

Ver detalle completo en [`HANDOFF.md`](./HANDOFF.md). Scripts de assets en `scripts/` (`build_map.py`, `process_sprites.py`, `recolor_chars.py`).

---

## 🗺️ Roadmap

1. Conectar **Zoho real** (solo-lectura, vía Andrés) → reemplazar mock en `/api/zoho/leads`.
2. **N8N** + aprobación de Miguel (Teams/correo).
3. Escritura a Zoho + jubilar Excel y vista manual.
4. Pixel Agents: seating natural (z-sort) + **editor de layout** (mover oficinas/muebles).
5. PP Hatillo · Histórico.
6. Migrar a Supabase + deploy.

_Windmar Home PR · Telemercadeo / Calidad._
