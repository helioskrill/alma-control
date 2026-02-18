import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "../utils";
import { computeOperatorSummary } from "../components/utils";
import OperatorTimeline from "../components/detail/OperatorTimeline";
import GapsList from "../components/detail/GapsList";
import EventsList from "../components/detail/EventsList";
import CadenceChart from "../components/detail/CadenceChart";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { StatusBadge } from "../lib/status";
import { formatTime, formatDuration } from "../lib/format";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Package, Clock, AlertTriangle, Zap, Timer } from "lucide-react";

function KpiCard({ icon: Icon, iconColor, label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function OperatorDetail() {
  const [searchParams] = useSearchParams();
  const operatorId = searchParams.get("id");
  const date      = searchParams.get("date")      || new Date().toISOString().split("T")[0];
  const startTime = searchParams.get("startTime") || "07:00";
  const endTime   = searchParams.get("endTime")   || "15:00";
  const threshold = Number(searchParams.get("threshold")) || 30;

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

  const operator = operators.find((o) => o.id === operatorId);

  const summary = useMemo(
    () => (operator ? computeOperatorSummary(operator, events, date, startTime, endTime, threshold) : null),
    [operator, events, date, startTime, endTime, threshold]
  );

  if (isLoading) return <LoadingSpinner />;

  if (!operator || !summary) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Operario no encontrado</p>
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline" className="mt-4">Volver al dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{operator.name}</h1>
              <p className="text-sm text-gray-500">{date} · {startTime}–{endTime} · Umbral: {threshold} min</p>
            </div>
          </div>
        </div>
        <StatusBadge status={summary.status} />
      </div>

      {/* KPI cards — 3 rows of 3: activity + cadence */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard icon={Package}       iconColor="text-indigo-500"  label="Pedidos"           value={summary.totalOrders} />
        <KpiCard icon={Clock}         iconColor="text-emerald-500" label="Primer cierre"     value={formatTime(summary.firstClose)} />
        <KpiCard icon={Clock}         iconColor="text-sky-500"     label="Último cierre"     value={formatTime(summary.lastClose)} />
        <KpiCard icon={AlertTriangle} iconColor="text-amber-500"   label="Máx. inactividad" value={formatDuration(summary.maxGap)} />
        <KpiCard
          icon={Zap}
          iconColor="text-violet-500"
          label="Ped/hora"
          value={summary.ordersPerHour != null ? `${summary.ordersPerHour}` : "—"}
        />
        <KpiCard
          icon={Timer}
          iconColor="text-rose-500"
          label="Intervalo medio"
          value={summary.avgIntervalMin != null ? `${summary.avgIntervalMin} min` : "—"}
        />
      </div>

      {/* Timeline */}
      <OperatorTimeline summary={summary} startTime={startTime} endTime={endTime} />

      {/* Cadence chart */}
      <CadenceChart events={summary.events} startTime={startTime} endTime={endTime} />

      {/* Gaps + Events */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GapsList gaps={summary.gaps} />
        <EventsList events={summary.events} />
      </div>
    </div>
  );
}
