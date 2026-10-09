"use client";

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TASK_STATUS_LABEL, TASK_STATUS_ORDER, TASK_STATUS_STATE, stateVar } from "@/lib/labels";
import type { TaskStatus } from "@/lib/types";

export default function StatusChart({ tasksByStatus }: { tasksByStatus: Record<TaskStatus, number> }) {
  const data = TASK_STATUS_ORDER.map((status) => ({
    status,
    label: TASK_STATUS_LABEL[status],
    count: tasksByStatus[status],
  }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <section className="rounded-card border border-line bg-panel p-4 shadow-card">
      <h2 className="t-card-title text-heading">Tareas por estado</h2>
      <p className="t-secondary">{total} tareas en total</p>
      <div className="mt-4 h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: -24 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--border-strong)" }}
              tick={{ fill: "var(--text-soft)", fontSize: 12.5 }}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--text-faint)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "var(--surface)" }}
              formatter={(value) => [value, "Tareas"]}
              contentStyle={{
                background: "var(--panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                boxShadow: "var(--shadow)",
                fontSize: 12.5,
              }}
            />
            <Bar dataKey="count" radius={[8, 8, 0, 0]} maxBarSize={56} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.status} fill={stateVar(TASK_STATUS_STATE[d.status], "bar")} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                className="text-mono"
                style={{ fill: "var(--heading)", fontSize: 13, fontWeight: 700 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
