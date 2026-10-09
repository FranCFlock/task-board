# CLAUDE.md — Status Board (Hackathon MVP)

## Contexto
Hackathon de un día. Deadline: **16:00 hs (Argentina)** con el código subido a GitHub.

**Challenge:** armar, con ayuda de IA, un tablero que centralice el estado de un proyecto
(tareas, pendientes, ítems relevados) usando datos de prueba, pensado para reemplazar
el status report armado a mano.

**Propuesta de valor:** el PM abre el tablero, ve la salud del proyecto de un vistazo y
genera el status report ejecutivo con un clic.

## Reglas de trabajo para Claude
- Priorizar que funcione de punta a punta antes de pulir. Si algo se complica, simplificar.
- Pasos chicos: después de cada funcionalidad, verificar `npm run build` y sugerir un commit
  con Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`).
- No agregar dependencias fuera del stack sin preguntar.
- No implementar nada de la sección "Fuera de alcance".
- Textos de la UI en español. Código (variables, funciones, tipos) en inglés.
- Nunca exponer la API key en el cliente; solo se usa en `src/app/api/report/route.ts`.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Recharts para gráficos
- `@anthropic-ai/sdk` para generar el reporte
- Sin base de datos: datos en `src/data/proyecto-demo.json`
- Deploy: Vercel

## Comandos
```bash
npm run dev     # desarrollo en localhost:3000
npm run build   # verificar antes de cada commit
npm run lint
```

## Variables de entorno
`.env.local` (no se commitea) y `.env.example` (sí se commitea):
```
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=claude-sonnet-5-5
```
Si `ANTHROPIC_API_KEY` no está definida, la app DEBE funcionar igual usando el reporte por plantilla.

## Estructura
```
src/
  app/
    page.tsx              # tablero: header + pestañas (Resumen, Tareas, Pendientes, Relevamiento)
    api/report/route.ts   # POST: genera status report (LLM o fallback)
  components/
    KpiCard.tsx
    HealthBadge.tsx       # semáforo verde/amarillo/rojo con motivos
    StatusChart.tsx       # tareas por estado (Recharts)
    TasksTable.tsx        # filtros por estado, responsable, prioridad; vencidas resaltadas
    ActionItemsList.tsx
    FindingsList.tsx
    ReportPanel.tsx       # botón generar, render Markdown, copiar y descargar .md
  data/proyecto-demo.json
  lib/
    types.ts
    data.ts               # carga y tipado del JSON
    metrics.ts            # KPIs + semáforo (funciones puras)
    report-template.ts    # reporte sin IA
    report-prompt.ts      # armado del prompt para el LLM
docs/SPEC.md
```

## Modelo de datos (`src/lib/types.ts`)
- **Project**: `id`, `name`, `client`, `startDate`, `endDate`, `milestones: Milestone[]`
- **Milestone**: `id`, `name`, `dueDate`, `status: "pending" | "done"`
- **Task**: `id`, `title`, `owner`, `status: "todo" | "in_progress" | "blocked" | "done"`,
  `priority: "low" | "medium" | "high"`, `dueDate`, `milestoneId`, `blockedReason?`
- **ActionItem** (pendiente de reunión): `id`, `description`, `owner`, `sourceMeeting`,
  `meetingDate`, `dueDate`, `status: "open" | "done"`
- **Finding** (ítem relevado): `id`, `type: "requirement" | "finding" | "risk"`, `description`,
  `impact: "low" | "medium" | "high"`, `status: "open" | "mitigated" | "closed"`, `owner?`

Fechas en ISO (`YYYY-MM-DD`). "Hoy" se toma de `new Date()`; los datos de prueba deben
generarse relativos a la fecha actual del hackathon para que haya vencidas y próximas.

## Datos de prueba
Un proyecto ficticio realista (ej.: "Migración del portal de clientes" para un banco o retail):
- 4 hitos (1 cumplido, 1 en riesgo)
- ~30 tareas, 5–6 responsables, mezcla de estados, ~15% vencidas, 2–3 bloqueadas con motivo
- ~10 action items de 3 reuniones distintas
- ~12 ítems relevados (requerimientos, hallazgos y 3–4 riesgos, al menos 1 de impacto alto abierto)
El proyecto debe quedar en **amarillo** con los datos por defecto (es lo más interesante para la demo).

## KPIs (`src/lib/metrics.ts`)
- % de avance = tareas `done` / total
- Tareas por estado
- Tareas vencidas = no `done` y `dueDate` < hoy
- Bloqueadas abiertas
- Pendientes abiertos y vencidos
- Riesgos abiertos por impacto
- Próximo hito y días restantes

## Semáforo de salud
Devuelve `{ level: "green" | "yellow" | "red", reasons: string[] }` (motivos en español).
- **Rojo**: > 20% de tareas abiertas vencidas, o algún hito vencido sin cumplir,
  o algún riesgo de impacto alto en estado `open`.
- **Amarillo**: > 10% de tareas abiertas vencidas, o al menos una tarea bloqueada,
  o pendientes de reunión vencidos.
- **Verde**: el resto.
(Ajustar datos o umbrales para que el default quede en amarillo.)

## Status report (`POST /api/report`)
Salida en Markdown, en español, tono ejecutivo, máximo ~1 página, con estas secciones:
1. Estado general (semáforo + una línea)
2. Avance y logros del período
3. Próximos pasos
4. Riesgos y bloqueos
5. Decisiones o ayuda requerida

Lógica:
- Calcular métricas en el servidor y enviar al LLM un resumen estructurado (no el JSON crudo completo).
- Con API key: llamar al modelo de `ANTHROPIC_MODEL`. Pedir que no invente datos que no estén en el input.
- Sin API key o ante error/timeout (~15 s): devolver `report-template.ts`.
- La respuesta indica la fuente: `{ markdown, source: "ai" | "template" }`, y la UI lo muestra.

## UI
- Header: nombre del proyecto, cliente, fechas, semáforo con motivos.
- Resumen: fila de KpiCards + gráfico de tareas por estado + próximo hito.
- Tareas: tabla con filtros; vencidas en rojo, bloqueadas con su motivo.
- Pendientes y Relevamiento: listas con badges de estado e impacto.
- Botón destacado "Generar status report" que abre ReportPanel (copiar / descargar .md).
- Responsive y prolijo, sin sobrediseñar.

## Fuera de alcance
Login/usuarios, base de datos, CRUD de tareas, integraciones reales (Jira, Trello, etc.),
notificaciones, multi-tenant. Van a "Próximos pasos" en el README.

## Plan de implementación
- [x] 1. `types.ts` + `proyecto-demo.json` + `data.ts`
- [x] 2. `metrics.ts` (funciones puras) + semáforo
- [x] 3. Página con header, KPIs y gráfico
- [x] 4. Pestañas Tareas, Pendientes, Relevamiento
- [ ] 5. `report-template.ts` + `/api/report` con fallback
- [ ] 6. Integración con LLM + ReportPanel
- [ ] 7. README (problema, demo, capturas, cómo correrlo, uso de IA, próximos pasos) + `docs/SPEC.md`
- [ ] 8. Deploy en Vercel y link en el README

## Definición de terminado
- `npm install && npm run dev` funciona sin configurar nada.
- El tablero muestra datos y el semáforo con motivos.
- El reporte se genera en < 10 s (con o sin IA).
- `npm run build` sin errores, README completo, repo público en GitHub.
