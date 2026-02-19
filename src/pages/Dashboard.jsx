import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DashboardFilters from "../components/dashboard/DashboardFilters";
import StatsOverview from "../components/dashboard/StatsOverview";
import OperatorTable from "../components/dashboard/OperatorTable";
import LiveIndicator from "../components/dashboard/LiveIndicator";
import ActivityHeatmap from "../components/heatmap/ActivityHeatmap";
import { computeOperatorSummaries, buildHeatmapData } from "../components/utils";
import { ACTIVITY_PRESETS, DEFAULT_ACTIVITY_PRESET } from "../components/almaMapping";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutList, Grid3X3 } from "lucide-react";
import { Toaster, toast } from "sonner";

const today = new Date().toISOString().split("T")[0];

export default function Dashboard() {
  const [filters, setFilters] = useState({
    date:            today,
    startTime:       "07:00",
    endTime:         "15:00",
    threshold:       30,
    autoRefresh:     false,
    refreshInterval: 2,
  });
  const [view, setView] = useState("table");

  const refetchInterval = filters.autoRefresh ? filters.refreshInterval * 60000 : false;

  const { data: operators = [], isLoading: loadingOps } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list(),
    refetchInterval,
  });

  const {
    data: events = [],
    isLoading: loadingEvents,
    dataUpdatedAt,
  } = useQuery({
    queryKey: ["events", filters.date],
    queryFn: async () => {
      const all = await base44.entities.OrderCloseEvent.list("-timestamp", 10000);
      return all.filter((e) => e.timestamp?.split("T")[0] === filters.date);
    },
    refetchInterval,
  });

  const summaries = useMemo(
    () => computeOperatorSummaries(operators, events, filters.date, filters.startTime, filters.endTime, filters.threshold),
    [operators, events, filters]
  );

  const heatmapData = useMemo(
    () => buildHeatmapData(operators, events, filters.date, filters.startTime, filters.endTime),
    [operators, events, filters.date, filters.startTime, filters.endTime]
  );

  const isLoading = loadingOps || loadingEvents;

  // Notifications for inactive operators
  const notifiedRef = useRef(new Set());
  useEffect(() => {
    if (isLoading || !filters.autoRefresh) return;
    summaries.forEach((s) => {
      if ((s.status === "red" || s.status === "yellow") && s.gapCount > 0 && !notifiedRef.current.has(s.operatorId)) {
        const maxGapMin = Math.round(s.maxGap);
        const msg = s.status === "red"
          ? `🔴 ${s.operatorName}: inactividad de ${maxGapMin} min detectada`
          : `🟡 ${s.operatorName}: posible inactividad (${maxGapMin} min)`;
        toast.warning(msg, { duration: 8000, position: "top-right" });
        notifiedRef.current.add(s.operatorId);
      }
    });
  }, [summaries, isLoading, filters.autoRefresh]);

  // Reset notified set when date/filters change
  useEffect(() => {
    notifiedRef.current = new Set();
  }, [filters.date, filters.startTime, filters.endTime, filters.threshold]);

  return (
    <div className="space-y-6">
      <Toaster richColors closeButton />
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Control de Actividad PDA</h1>
          <p className="text-sm text-gray-500 mt-1">Monitoriza la actividad de los operarios en tiempo real</p>
        </div>
        <div className="flex items-center gap-4">
          <LiveIndicator updatedAt={dataUpdatedAt} isLive={filters.autoRefresh} />
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-gray-100">
              <TabsTrigger value="table" className="gap-1.5 text-xs">
                <LayoutList className="w-3.5 h-3.5" />
                Tabla
              </TabsTrigger>
              <TabsTrigger value="heatmap" className="gap-1.5 text-xs">
                <Grid3X3 className="w-3.5 h-3.5" />
                Heatmap
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <DashboardFilters filters={filters} onFilterChange={setFilters} />

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <StatsOverview operators={operators} summaries={summaries} />
          {view === "table" ? (
            <OperatorTable summaries={summaries} filters={filters} operators={operators} />
          ) : (
            <ActivityHeatmap heatmapData={heatmapData} />
          )}
        </>
      )}
    </div>
  );
}