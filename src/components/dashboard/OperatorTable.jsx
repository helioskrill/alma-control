import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "../utils";
import { formatTime, formatDuration } from "../../lib/format";
import { StatusBadge } from "../../lib/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronRight, User } from "lucide-react";

const STATUS_ORDER = { red: 0, yellow: 1, green: 2, none: 3 };

function buildDetailUrl(s, filters) {
  return (
    createPageUrl("OperatorDetail") +
    `?id=${s.operatorId}&date=${filters.date}&startTime=${filters.startTime}&endTime=${filters.endTime}&threshold=${filters.threshold}`
  );
}

/** Progress bar towards daily_target. Shown only when target > 0. */
function TargetBar({ current, target }) {
  if (!target) return <span className="text-gray-300 text-xs">—</span>;
  const pct = Math.min(100, Math.round((current / target) * 100));
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-emerald-400" : pct >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[60px]">
      <span className="text-xs font-semibold text-gray-700">{current}/{target}</span>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function OperatorTable({ summaries, filters, operators = [] }) {
  // Build a map from operatorId → daily_target for quick lookup
  const targetMap = Object.fromEntries(
    operators.map((op) => [op.id, op.daily_target ? Number(op.daily_target) : 0])
  );

  const sorted = [...summaries].sort((a, b) => {
    const byStatus = (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
    if (byStatus !== 0) return byStatus;
    return (b.totalOrders || 0) - (a.totalOrders || 0);
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Operario</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Pedidos</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Objetivo</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Ped/h</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Primer cierre</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Último cierre</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Máx. inactividad</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Huecos</TableHead>
              <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Estado</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-16 text-gray-400">
                  No hay datos para esta fecha
                </TableCell>
              </TableRow>
            )}
            {sorted.map((s) => {
              const detailUrl   = buildDetailUrl(s, filters);
              const dailyTarget = targetMap[s.operatorId] || 0;
              return (
                <TableRow key={s.operatorId} className="group hover:bg-indigo-50/40 transition-colors cursor-pointer">
                  <TableCell>
                    <Link to={detailUrl} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-medium text-gray-900">{s.operatorName}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-gray-700">{s.totalOrders}</TableCell>
                  <TableCell className="text-center">
                    <TargetBar current={s.totalOrders} target={dailyTarget} />
                  </TableCell>
                  <TableCell className="text-center font-medium text-violet-600 tabular-nums">
                    {s.ordersPerHour != null ? s.ordersPerHour : "—"}
                  </TableCell>
                  <TableCell className="text-center text-gray-600">{formatTime(s.firstClose)}</TableCell>
                  <TableCell className="text-center text-gray-600">{formatTime(s.lastClose)}</TableCell>
                  <TableCell className="text-center font-medium text-gray-700">{formatDuration(s.maxGap)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${s.gapCount > 0 ? "text-amber-600" : "text-gray-400"}`}>
                      {s.gapCount}
                    </span>
                  </TableCell>
                  <TableCell className="text-center"><StatusBadge status={s.status} /></TableCell>
                  <TableCell>
                    <Link to={detailUrl}>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
