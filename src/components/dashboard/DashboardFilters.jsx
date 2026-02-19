import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, AlertTriangle, RefreshCw, Activity } from "lucide-react";
import { ACTIVITY_PRESETS, DEFAULT_ACTIVITY_PRESET } from "../almaMapping";

/**
 * Props:
 *   filters        — { date, startTime, endTime, threshold, autoRefresh, refreshInterval, activityPreset }
 *   onFilterChange — (newFilters) => void
 */
export default function DashboardFilters({ filters, onFilterChange }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Fecha
          </Label>
          <Input
            type="date"
            value={filters.date}
            onChange={(e) => onFilterChange({ ...filters, date: e.target.value })}
            className="h-11 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Hora inicio
          </Label>
          <Input
            type="time"
            value={filters.startTime}
            onChange={(e) => onFilterChange({ ...filters, startTime: e.target.value })}
            className="h-11 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Hora fin
          </Label>
          <Input
            type="time"
            value={filters.endTime}
            onChange={(e) => onFilterChange({ ...filters, endTime: e.target.value })}
            className="h-11 rounded-xl border-gray-200 focus:border-indigo-400 focus:ring-indigo-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Umbral inactividad
          </Label>
          <Select
            value={String(filters.threshold)}
            onValueChange={(val) => onFilterChange({ ...filters, threshold: Number(val) })}
          >
            <SelectTrigger className="h-11 rounded-xl border-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 min — Estricto</SelectItem>
              <SelectItem value="30">30 min — Normal</SelectItem>
              <SelectItem value="60">60 min — Relajado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity preset row */}
      <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-gray-50">
        <Activity className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 shrink-0">Actividad</span>
        <div className="flex flex-wrap gap-1.5">
          {ACTIVITY_PRESETS.map((preset) => {
            const active = (filters.activityPreset ?? DEFAULT_ACTIVITY_PRESET) === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onFilterChange({ ...filters, activityPreset: preset.id })}
                title={preset.description}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Auto-refresh row */}
      <div className="flex items-center gap-4 pt-1 border-t border-gray-50">
        <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Auto-refresco</span>
        <Switch
          checked={!!filters.autoRefresh}
          onCheckedChange={(v) => onFilterChange({ ...filters, autoRefresh: v })}
        />
        {filters.autoRefresh && (
          <Select
            value={String(filters.refreshInterval ?? 2)}
            onValueChange={(val) => onFilterChange({ ...filters, refreshInterval: Number(val) })}
          >
            <SelectTrigger className="h-8 w-32 rounded-xl border-gray-200 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Cada 1 min</SelectItem>
              <SelectItem value="2">Cada 2 min</SelectItem>
              <SelectItem value="5">Cada 5 min</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}