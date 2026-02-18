import React, { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

/**
 * Bar chart showing number of operations per hour within the shift window.
 * Props: { events, startTime, endTime }
 *   events   — array of event objects (already filtered to this operator's shift)
 *   startTime — "HH:MM"
 *   endTime   — "HH:MM"
 */
export default function CadenceChart({ events, startTime, endTime }) {
  const data = useMemo(() => {
    const startHour = parseInt(startTime);
    const endHour   = parseInt(endTime);
    const hours = [];
    for (let h = startHour; h < endHour; h++) {
      hours.push({ hour: `${String(h).padStart(2, "0")}h`, count: 0, h });
    }
    events.forEach((ev) => {
      const h = new Date(ev.timestamp).getHours();
      const slot = hours.find((s) => s.h === h);
      if (slot) slot.count++;
    });
    return hours;
  }, [events, startTime, endTime]);

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Cadencia por hora</h3>
        <div className="text-center py-8 text-gray-400 text-sm">Sin datos de cadencia</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-5">Cadencia por hora</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="hour"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(v) => [`${v} operaciones`, ""]}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.count === 0 ? "#e5e7eb" : entry.count >= maxCount * 0.75 ? "#4f46e5" : "#a5b4fc"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
