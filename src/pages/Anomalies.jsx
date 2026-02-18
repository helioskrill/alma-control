import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { detectAnomalies } from "../components/utils";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  ShieldAlert,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Copy,
  Smartphone,
  Zap,
  Clock,
} from "lucide-react";

const today = new Date().toISOString().split("T")[0];

const ANOMALY_CONFIG = {
  duplicate_order: {
    label: "Pedido duplicado",
    icon:  Copy,
    bg:    "bg-red-50",
    border:"border-red-200",
    text:  "text-red-700",
    iconBg:"bg-red-100",
    iconColor: "text-red-600",
  },
  shared_device: {
    label: "PDA compartida",
    icon:  Smartphone,
    bg:    "bg-amber-50",
    border:"border-amber-200",
    text:  "text-amber-700",
    iconBg:"bg-amber-100",
    iconColor: "text-amber-600",
  },
  high_speed: {
    label: "Velocidad anómala",
    icon:  Zap,
    bg:    "bg-amber-50",
    border:"border-amber-200",
    text:  "text-amber-700",
    iconBg:"bg-amber-100",
    iconColor: "text-amber-600",
  },
  out_of_shift: {
    label: "Fuera de turno",
    icon:  Clock,
    bg:    "bg-amber-50",
    border:"border-amber-200",
    text:  "text-amber-700",
    iconBg:"bg-amber-100",
    iconColor: "text-amber-600",
  },
};

function SeverityBadge({ severity }) {
  return severity === "error" ? (
    <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">Error</Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-700 border-amber-200 border text-xs">Aviso</Badge>
  );
}

export default function Anomalies() {
  const [date, setDate]           = useState(today);
  const [startTime]               = useState("07:00");
  const [endTime]                 = useState("15:00");

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

  const anomalies = useMemo(
    () => detectAnomalies(operators, events, { date, startTime, endTime }),
    [operators, events, date, startTime, endTime]
  );

  const errors   = anomalies.filter((a) => a.severity === "error");
  const warnings = anomalies.filter((a) => a.severity === "warning");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Detección de anomalías</h1>
          <p className="text-sm text-gray-500 mt-1">Alertas de calidad de datos y comportamientos inusuales</p>
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

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Total anomalías</p>
          <p className="text-3xl font-bold text-gray-900">{anomalies.length}</p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm text-center ${errors.length > 0 ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Errores</p>
          <p className={`text-3xl font-bold ${errors.length > 0 ? "text-red-600" : "text-gray-900"}`}>
            {errors.length}
          </p>
        </div>
        <div className={`rounded-2xl border p-4 shadow-sm text-center ${warnings.length > 0 ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Avisos</p>
          <p className={`text-3xl font-bold ${warnings.length > 0 ? "text-amber-600" : "text-gray-900"}`}>
            {warnings.length}
          </p>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : anomalies.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-gray-700 font-semibold">Sin anomalías detectadas</p>
          <p className="text-sm text-gray-400 mt-1">Los datos del {date} parecen correctos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Errors first (already sorted by detectAnomalies) */}
          {anomalies.map((a) => {
            const cfg = ANOMALY_CONFIG[a.type] ?? ANOMALY_CONFIG.shared_device;
            const Icon = cfg.icon;
            return (
              <div key={a.id} className={`rounded-2xl border p-4 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-semibold text-sm ${cfg.text}`}>{a.title}</span>
                      <SeverityBadge severity={a.severity} />
                      <Badge variant="outline" className="text-xs text-gray-500 border-gray-200">
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{a.description}</p>
                    {a.relatedIds.length > 0 && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        {a.relatedIds.length} elemento{a.relatedIds.length !== 1 ? "s" : ""} afectado{a.relatedIds.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
