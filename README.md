# Distribuidor de Leads · Windmar Home

Motor de **distribución equitativa de leads por zona** para el Departamento de Telemercadeo / Calidad de Windmar Home PR. Reemplaza la herramienta en Excel que mantenía Miguel a mano, automatizando la rotación, la igualación de carga, el manejo de Black List y el tablero de control.

> **Estado:** v1 — motor + panel web (claro/oscuro). Corriendo en local. Próximas fases: carga de leads por CSV/Excel, roles multiusuario, integración Teams/Zoho/Kixie y migración a Supabase.

---

## ⚡ Arrancar en local

```powershell
cd "C:\Claude Code\DISTRIBUIDOR DE LEADS MIGUEL\app-distribuidor"
npm install
npm run dev
```

Abre **http://localhost:3010**

---

## 🧠 Cómo funciona el motor

La regla central (descifrada del Excel original) es una **rotación equitativa ponderada por carga**:

```
carga efectiva = histórico + ajuste + asignaciones de la sesión
```

- El **próximo lead** va al gerente con **menor carga efectiva** en esa zona.
- **Ajuste**: handicap que iguala a quien entró tarde al mismo conteo que los veteranos (equidad).
- **Tier 2**: recibe la **mitad** de los leads (pesa ×2 en el ranking) → se le evalúa a 60 días para igualarlo a Tier 1.
- **Black List**: el gerente queda excluido de la rotación mientras la exclusión esté vigente.
- **Cordillera**: zona opcional (solo participan los que hicieron opt-in).

### Zonas (oficinas)
`SJ1` San Juan 1 · `SJ2` San Juan 2 (Caguas) · `HAT` Hatillo · `PON` Ponce · `MAYA` Mayagüez · `COR` Cordillera (opcional)

78 municipios de PR mapeados a su zona → al ingresar el municipio, el sistema resuelve la zona automáticamente.

---

## 📋 Reglas de negocio (documento de Miguel)

- **Cita mismo día**: oferta por Teams, primero en responder; tope 1 lead/gerente/zona/semana.
- **Cita futura**: asignación con el distribuidor (rotación por zona). _(esto es la app)_
- **Lead recurrente** (ya tiene deal): va al consultor/gerente existente, no se reparte.
- **Confirmación**: 20 min o se reasigna y el gerente pierde el turno.
- **Black List**: 1ª falta 30 días · 2ª falta 3 meses · 3ª permanente. No vender en el mes → Black List.
- **Top 50% de cierre**: da prioridad en la distribución (mecanismo Tier).

---

## 🖥️ Pantallas

| Ruta | Descripción |
|------|-------------|
| `/` | **Dashboard**: KPIs animados, gráficos (carga por zona, Black List, asignaciones, gerentes elegibles) y "próximo turno por zona". |
| `/asignar` | **Asignar Lead**: municipio→zona, podio del top-3, ranking en vivo con barras de carga, asignación auto o manual. |
| `/gerentes` | **Gerentes**: opt-in por zona, ajuste de carga, Tier 2 y Black List. |
| `/blacklist` | **Black List**: vendedores y consultores con estado activa/vencida automático por fecha. |
| `/historial` | **Historial**: bitácora de asignaciones de la sesión. |

---

## 🎨 Diseño

Tema **ejecutivo claro/oscuro** alineado con las dashboards hermanas (TM, VASS, Ventas):

- Paleta oficial Windmar: naranja `#F89B24`, azul `#1D429B`, navy `#21274E`.
- Toggle de tema con **reveal circular** (View Transitions API) — mismo efecto que la suite.
- Tipografía **Inter** (texto) + **JetBrains Mono** (números/datos).
- Animaciones con Framer Motion: entradas escalonadas, transición de página, barras animadas, podio, feedback táctil en botones.
- Tokens semánticos en CSS (`--color-bg/surface/ink/line/...`) para claro y oscuro.

---

## 🛠️ Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Recharts** (gráficos) · **Framer Motion** (animación) · **Lucide** (iconos) · **next-themes** (tema)
- Persistencia local en archivo JSON (`data/data.json`, se regenera desde `data/seed.json`).

---

## 📁 Estructura

```
app-distribuidor/
├─ app/
│  ├─ page.tsx              # Dashboard
│  ├─ asignar/page.tsx      # Asignar Lead
│  ├─ gerentes/page.tsx     # Gerentes
│  ├─ blacklist/page.tsx    # Black List
│  ├─ historial/page.tsx    # Historial
│  ├─ template.tsx          # Transición de página
│  ├─ layout.tsx            # Layout + fuentes + ThemeProvider
│  ├─ globals.css           # Sistema de diseño (tokens, tema, animaciones)
│  └─ api/
│     ├─ state/route.ts     # Estado + ranking + agregados de gráficos
│     ├─ asignar/route.ts   # Asignar lead (auto/manual)
│     ├─ gerente/route.ts   # Editar gerente (tier/ajuste/opt-in/BL)
│     └─ reset/route.ts     # Reiniciar demo
├─ lib/
│  ├─ engine.ts             # Motor de asignación (rotación equitativa)
│  ├─ store.ts              # Almacén file-backed
│  └─ types.ts              # Tipos
├─ components/              # Nav, ThemeToggle, charts, ui, AnimatedCounter
└─ data/
   ├─ seed.json             # Datos base extraídos del Excel
   └─ data.json             # Estado de runtime (ignorado por git)
```

---

## 🗺️ Roadmap

- [ ] Carga de leads por CSV/Excel (lote) — base de ~6,300 "de agua"
- [ ] Black List automática: registrar incidente → calcula penalización y fecha fin
- [ ] Roles y login multiusuario (Calidad asigna · gerentes ven lo suyo · Miguel admin)
- [ ] Cita mismo día (Teams) + temporizador de confirmación 20 min
- [ ] Detección de lead recurrente (Zoho)
- [ ] Exportar Historial a Excel/PDF + auditoría
- [ ] % de cierre automático (Zoho) para Tier 2 a 60 días
- [ ] Migración a Supabase (schema `distribuidor`) e integración n8n/Teams/Kixie

---

_Windmar Home PR · Departamento de Telemercadeo / Calidad_
