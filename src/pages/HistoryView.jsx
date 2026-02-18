import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Calendar, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import LoadingSpinner from "../components/common/LoadingSpinner";

function getDateRange(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split("T")[0];
  });
}

function fmtDate(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}

const LINE_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16",
];

function cellColor(count, target) {
  if (count === 0) return "bg-gray-100 text-gray-400";
  if (!target)     return "bg-indigo-50 text-indigo-700";
  const pct = count / target;
  if (pct >= 1)    return "bg-emerald-600 text-white";
  if (pct >= 0.5)  return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-800";
}

export default function HistoryView() {
  const [rangeDays, setRangeDays] = useState(7);

  const dates = useMemo(() => getDateRange(rangeDays), [rangeDays]);
  const startDate = dates[0];

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: allEvents = [], isLoading } = useQuery({
    queryKey: ["allEventsHistory"],
    queryFn: () => base44.entities.OrderCloseEvent.list("-timestamp", 10000),
  });

  const events = useMemo(
    () => allEvents.filter((e) => e.timestamp?.split("T")[0] >= startDate),
    [allEvents, startDate]
  );

  const opMeta = useMemo(
    () =>
      Object.fromEntries(
        operators.map((o) => [o.id, { name: o.name, target: Number(o.daily_target) || 0 }])
      ),
    [operators]
  );

  // Build grid: opId → date → count
  const grid = useMemo(() => {
    const g = {};
    events.forEach((ev) => {
      const date = ev.timestamp?.split("T")[0];
      if (!date || !dates.includes(date)) return;
      if (!g[ev.operator_id]) g[ev.operator_id] = {};
      g[ev.operator_id][date] = (g[ev.operator_id][date] || 0) + 1;
    });
    return g;
  }, [events, dates]);

  const activeOps = useMemo(
    () => operators.filter((o) => grid[o.id] && Object.keys(grid[o.id]).length > 0),
    [operators, grid]
  );

  // Max 8 lines in the chart
  const chartOps = activeOps.slice(0, 8);

  const trendData = useMemo(
    () =>
      dates.map((date) => {
        const point = { date: fmtDate(date) };
        chartOps.forEach((op) => {
          point[op.name] = grid[op.id]?.[date] || 0;
        });
        return point;
      }),
    [dates, chartOps, grid]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Histórico semanal</h1>
          <p className="text-sm text-gray-500 mt-1">Actividad por operario en los últimos días</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={rangeDays}
            onChange={(e) => setRangeDays(Number(e.target.value))}
            className="h-10 rounded-xl border border-gray-200 px-3 text-sm bg-white"
          >
            <option value={7}>Últimos 7 días</option>
            <option value={14}>Últimos 14 días</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* Weekly Grid */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="p-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-700">Pedidos por operario y día</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                  Sin actividad
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-amber-100" />
                  &lt;50% objetivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-100" />
                  ≥50% objetivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-600" />
                  ≥100% objetivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-indigo-50 border border-indigo-100" />
                  Sin objetivo definido
                </span>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap">
                    Operario
                  </th>
                  {dates.map((d) => (
                    <th
                      key={d}
                      className="px-2 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center whitespace-nowrap"
                    >
                      {fmtDate(d)}
                    </th>
                  ))}
                  <th className="px-4 py-2.5 font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeOps.length === 0 && (
                  <tr>
                    <td
                      colSpan={dates.length + 2}
                      className="text-center py-12 text-gray-400"
                    >
                      Sin actividad en este período
                    </td>
                  </tr>
                )}
                {activeOps.map((op) => {
                  const target = opMeta[op.id]?.target || 0;
                  const total = dates.reduce((s, d) => s + (grid[op.id]?.[d] || 0), 0);
                  return (
                    <tr key={op.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                        {op.name}
                      </td>
                      {dates.map((d) => {
                        const count = grid[op.id]?.[d] || 0;
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            <span
                              className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-semibold ${cellColor(count, target)}`}
                            >
                              {count || "—"}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-center font-bold text-gray-700">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Trend chart */}
          {chartOps.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <h2 className="text-sm font-semibold text-gray-700">Tendencia de pedidos</h2>
                {activeOps.length > 8 && (
                  <span className="text-xs text-gray-400 ml-auto">
                    Mostrando {chartOps.length} de {activeOps.length} operarios
                  </span>
                )}
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart
                  data={trendData}
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 12,
                      border: "1px solid #e5e7eb",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {chartOps.map((op, i) => (
                    <Line
                      key={op.id}
                      type="monotone"
                      dataKey={op.name}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </div>
  );
}
