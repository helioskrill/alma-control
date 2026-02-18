import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Smartphone, AlertTriangle, CheckCircle2, Clock, Calendar } from "lucide-react";
import { formatTime } from "../lib/format";
import LoadingSpinner from "../components/common/LoadingSpinner";

const today = new Date().toISOString().split("T")[0];
const INACTIVE_THRESHOLD_MIN = 30;

function deviceStatus(lastEventTime) {
  if (!lastEventTime) return "sin-actividad";
  const diffMin = (Date.now() - new Date(lastEventTime).getTime()) / 60000;
  return diffMin <= INACTIVE_THRESHOLD_MIN ? "activo" : "inactivo";
}

function StatusBadgePDA({ status }) {
  if (status === "activo")
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">Activo</Badge>;
  if (status === "inactivo")
    return <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">Inactivo</Badge>;
  return <Badge className="bg-gray-50 text-gray-500 border-gray-200 border">Sin actividad</Badge>;
}

export default function DevicePanel() {
  const [date, setDate] = useState(today);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", date],
    queryFn: async () => {
      const all = await base44.entities.OrderCloseEvent.list("-timestamp", 10000);
      return all.filter((e) => e.timestamp?.split("T")[0] === date);
    },
  });

  const opMap = useMemo(
    () => Object.fromEntries(operators.map((o) => [o.id, o.name])),
    [operators]
  );

  // Aggregate by pda_id
  const devices = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const key = ev.pda_id || "—";
      if (!map[key]) {
        map[key] = {
          deviceId:      key,
          totalEvents:   0,
          lastEventTime: null,
          lastOperator:  null,
          operatorIds:   new Set(),
        };
      }
      const d = map[key];
      d.totalEvents++;
      d.operatorIds.add(ev.operator_id);
      if (!d.lastEventTime || new Date(ev.timestamp) > new Date(d.lastEventTime)) {
        d.lastEventTime = ev.timestamp;
        d.lastOperator  = ev.operator_id;
      }
    });

    return Object.values(map).sort((a, b) => {
      // sort: active first, then by lastEventTime desc
      const sa = deviceStatus(a.lastEventTime);
      const sb = deviceStatus(b.lastEventTime);
      if (sa === "activo" && sb !== "activo") return -1;
      if (sb === "activo" && sa !== "activo") return 1;
      return new Date(b.lastEventTime || 0) - new Date(a.lastEventTime || 0);
    });
  }, [events]);

  const activeCount   = devices.filter((d) => deviceStatus(d.lastEventTime) === "activo").length;
  const sharedCount   = devices.filter((d) => d.operatorIds.size > 1).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Panel de PDAs</h1>
          <p className="text-sm text-gray-500 mt-1">Estado de los dispositivos Zebra por día</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-10 w-44 rounded-xl border-gray-200"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Dispositivos</p>
          <p className="text-3xl font-bold text-gray-900">{devices.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Activos ahora</p>
          <p className="text-3xl font-bold text-emerald-600">{activeCount}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm text-center ${sharedCount > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">PDAs compartidas</p>
          <p className={`text-3xl font-bold ${sharedCount > 0 ? "text-amber-600" : "text-gray-900"}`}>{sharedCount}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
                  <div className="flex items-center gap-2"><Smartphone className="w-3.5 h-3.5" />PDA ID</div>
                </TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Último operario</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Última actividad</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Eventos hoy</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Estado</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                    No hay actividad de PDA para esta fecha
                  </TableCell>
                </TableRow>
              )}
              {devices.map((d) => {
                const status    = deviceStatus(d.lastEventTime);
                const isShared  = d.operatorIds.size > 1;
                const opNames   = [...d.operatorIds].map((id) => opMap[id] || id).join(", ");
                return (
                  <TableRow key={d.deviceId} className={isShared ? "bg-amber-50/40" : ""}>
                    <TableCell className="font-semibold font-mono">{d.deviceId}</TableCell>
                    <TableCell className="text-gray-700">{opMap[d.lastOperator] || d.lastOperator || "—"}</TableCell>
                    <TableCell className="text-center text-gray-500 tabular-nums">
                      {d.lastEventTime ? (
                        <span title={new Date(d.lastEventTime).toLocaleString("es-ES")}>
                          {formatTime(d.lastEventTime)}
                        </span>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-center font-semibold text-gray-700">{d.totalEvents}</TableCell>
                    <TableCell className="text-center"><StatusBadgePDA status={status} /></TableCell>
                    <TableCell className="text-center">
                      {isShared ? (
                        <div title={`Operarios: ${opNames}`} className="flex items-center justify-center gap-1">
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                          <span className="text-xs text-amber-600 font-medium">Compartida</span>
                        </div>
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-gray-200 mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Shared devices detail */}
      {devices.filter((d) => d.operatorIds.size > 1).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">PDAs usadas por varios operarios</span>
          </div>
          <div className="space-y-1.5">
            {devices.filter((d) => d.operatorIds.size > 1).map((d) => (
              <div key={d.deviceId} className="text-sm text-amber-700">
                <span className="font-mono font-semibold">{d.deviceId}</span>
                {" → "}
                {[...d.operatorIds].map((id) => opMap[id] || id).join(", ")}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
