# Especificación — Status Board

Especificación funcional del MVP. Describe lo que la app hace hoy; los detalles de implementación están en el código referenciado.

## 1. Objetivo

Reemplazar el status report armado a mano por un tablero que:

1. muestre la salud del proyecto de un vistazo, con motivos explícitos, y
2. genere el status report ejecutivo con un clic.

Usuario principal: el PM del proyecto. Lectores del reporte: sponsors y gerencia.

## 2. Alcance

**Incluido:** un proyecto con datos de prueba, KPIs, semáforo, gráfico, hitos, vistas de tareas, pendientes y relevamiento, y la generación del reporte (con IA opcional y plantilla de respaldo).

**Fuera de alcance:** login y usuarios, base de datos, ABM de tareas, integraciones reales (Jira, Trello, etc.), notificaciones y multi-tenant.

## 3. Modelo de datos

Definido en [`src/lib/types.ts`](../src/lib/types.ts). Fechas en ISO `AAAA-MM-DD`.

| Entidad | Campos |
|---|---|
| **Project** | `id`, `name`, `client`, `startDate`, `endDate`, `milestones: Milestone[]` |
| **Milestone** | `id`, `name`, `dueDate`, `status: "pending" \| "done"` |
| **Task** | `id`, `title`, `owner`, `status: "todo" \| "in_progress" \| "blocked" \| "done"`, `priority: "low" \| "medium" \| "high"`, `dueDate`, `milestoneId`, `blockedReason?` |
| **ActionItem** (pendiente de reunión) | `id`, `description`, `owner`, `sourceMeeting`, `meetingDate`, `dueDate`, `status: "open" \| "done"` |
| **Finding** (ítem relevado) | `id`, `type: "requirement" \| "finding" \| "risk"`, `description`, `impact: "low" \| "medium" \| "high"`, `status: "open" \| "mitigated" \| "closed"`, `owner?` |

### Datos de prueba

[`src/data/proyecto-demo.json`](../src/data/proyecto-demo.json): "Migración del portal de clientes" para un banco ficticio. Tiene 4 hitos, 30 tareas de 6 responsables, 10 pendientes de 3 reuniones y 12 ítems relevados.

Las fechas del JSON están escritas respecto de `referenceDate`. Al cargarse ([`src/lib/data.ts`](../src/lib/data.ts)), todas se corren `(hoy − referenceDate)` días, así que el estado del proyecto es el mismo cualquier día que se abra: **amarillo**, con 4 tareas vencidas, 3 bloqueadas y 2 pendientes vencidos.

## 4. KPIs

Calculados en [`src/lib/metrics.ts`](../src/lib/metrics.ts) con funciones puras. "Hoy" es la fecha local del servidor.

| KPI | Definición |
|---|---|
| % de avance | tareas `done` / total de tareas |
| Tareas por estado | conteo por `status` |
| Tareas vencidas | `status ≠ done` y `dueDate < hoy` |
| % vencidas | tareas vencidas / tareas abiertas |
| Bloqueadas | `status = blocked` |
| Pendientes abiertos / vencidos | `status = open` / abiertos con `dueDate < hoy` |
| Riesgos abiertos por impacto | `type = risk`, `status = open`, agrupados por `impact` |
| Próximo hito | primer hito `pending` con `dueDate ≥ hoy`, y los días que faltan |
| Estado de cada hito | `done` → cumplido; pendiente con `dueDate < hoy` → vencido; pendiente con tareas vencidas → en riesgo; si no, en curso |

## 5. Semáforo de salud

Devuelve `{ level: "green" | "yellow" | "red", reasons: string[] }`, con los motivos en español y los más graves primero.

| Nivel | Se cumple alguna de estas condiciones |
|---|---|
| 🔴 **Rojo** | más del 20% de las tareas abiertas vencidas · algún hito vencido sin cumplir · algún riesgo de impacto alto en estado `open` |
| 🟡 **Amarillo** | más del 10% de las tareas abiertas vencidas · al menos una tarea bloqueada · pendientes de reunión vencidos |
| 🟢 **Verde** | ninguna de las anteriores |

Los umbrales (`RED_OVERDUE_PCT`, `YELLOW_OVERDUE_PCT`) son constantes en `metrics.ts`.

## 6. Interfaz

- **Header:** nombre del proyecto, cliente, fechas, fecha de actualización, semáforo con motivos y el botón "Generar status report".
- **Pestañas** (en la URL: `?tab=resumen|tareas|pendientes|relevamiento`):
  - **Resumen:** tarjetas de KPIs, gráfico de tareas por estado e hitos (el próximo hito destacado, con su estado y avance).
  - **Tareas:** tabla con filtros por estado, responsable, prioridad y "Solo vencidas". Primero las abiertas por vencimiento y al final las completadas. Las vencidas muestran "Vencida hace N días" en rojo; las bloqueadas, su motivo.
  - **Pendientes:** agrupados por reunión (la más reciente primero), con estado Abierto / Vencido / Hecho.
  - **Relevamiento:** agrupado en Riesgos, Hallazgos y Requerimientos; primero los abiertos y de mayor impacto.
- **Panel del reporte:** muestra el Markdown renderizado, la fuente (IA o plantilla) y el tiempo de generación. Permite copiar, descargar (`status-report-AAAA-MM-DD.md`) y regenerar.

## 7. Status report

### Contrato

`POST /api/report` (sin cuerpo) → `200 { markdown: string, source: "ai" | "template" }`

### Contenido

Markdown en español, tono ejecutivo, de una página como máximo:

1. **Estado general:** semáforo y una línea que lo resuma, más los motivos.
2. **Avance y logros del período:** % de avance, tareas por estado, estado de los hitos, hitos cumplidos, tareas completadas y pendientes cerrados en el período.
3. **Próximos pasos:** próximo hito y tareas que vencen en los próximos 7 días.
4. **Riesgos y bloqueos:** tareas bloqueadas con su motivo, tareas vencidas y riesgos abiertos.
5. **Decisiones o ayuda requerida:** qué destrabar, pendientes vencidos para cerrar y hallazgos de impacto alto para definir.

El período son los últimos 14 días. Como las tareas no guardan su fecha de cierre, "completadas en el período" se aproxima con las tareas `done` cuyo vencimiento cae en el período.

### Generación

1. El servidor calcula las métricas y arma un **resumen estructurado** ([`report-summary.ts`](../src/lib/report-summary.ts)), que es la única entrada tanto del LLM como de la plantilla.
2. Si existe `ANTHROPIC_API_KEY`, llama al modelo de `ANTHROPIC_MODEL` (por defecto `claude-sonnet-5-5`) con el prompt de [`report-prompt.ts`](../src/lib/report-prompt.ts), con esfuerzo bajo y un timeout de 15 s. El prompt prohíbe inventar datos que no estén en el resumen.
3. Si no hay key, o la llamada falla, se agota el tiempo, el modelo rechaza el pedido o no devuelve texto, responde con [`report-template.ts`](../src/lib/report-template.ts) y `source: "template"`. El motivo queda en el log del servidor.

## 8. Seguridad

- La API key solo se lee en `src/app/api/report/route.ts` (del lado del servidor) y nunca se envía al navegador.
- `.env.local` está en `.gitignore`; el repo solo incluye `.env.example`.
- El Markdown del reporte se renderiza con `react-markdown`, que no ejecuta HTML embebido.
