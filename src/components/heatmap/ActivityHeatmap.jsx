import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getCellColor(count) {
  if (count === 0) return "bg-gray-100";
  if (count === 1) return "bg-emerald-200";
  if (count === 2) return "bg-emerald-400";
  if (count <= 4) return "bg-emerald-500";
  return "bg-emerald-600";
}

export default function ActivityHeatmap({ heatmapData }) {
  const { slots, rows } = heatmapData;

  if (!rows || rows.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm text-center py-16 text-gray-400">
        No hay datos para mostrar el heatmap
      </div>
    );
  }

  // Show every 4th slot label (every hour)
  const labelIndices = slots.map((_, i) => i).filter((i) => i % 4 === 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header slots */}
        <div className="flex mb-3">
          <div className="w-32 shrink-0" />
          <div className="flex-1 flex">
            {slots.map((slot, i) => (
              <div
                key={i}
                className="flex-1 text-center"
              >
                {labelIndices.includes(i) && (
                  <span className="text-[10px] text-gray-400 font-medium">{slot}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        <TooltipProvider>
          <div className="space-y-1.5">
            {rows.map((row) => (
              <div key={row.operatorId} className="flex items-center">
                <div className="w-32 shrink-0 pr-3">
                  <span className="text-xs font-medium text-gray-700 truncate block">{row.operatorName}</span>
                </div>
                <div className="flex-1 flex gap-0.5">
                  {row.counts.map((count, i) => (
                    <Tooltip key={i}>
                      <TooltipTrigger asChild>
                        <div
                          className={`flex-1 h-7 rounded-sm ${getCellColor(count)} transition-colors cursor-pointer hover:opacity-80`}
                        />
                      </TooltipTrigger>
                      <TooltipContent className="text-xs">
                        <p className="font-semibold">{row.operatorName}</p>
                        <p>{slots[i]} — {count} cierre{count !== 1 ? "s" : ""}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TooltipProvider>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-5 text-xs text-gray-500">
          <span>Menos</span>
          <div className="flex gap-0.5">
            {["bg-gray-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-500", "bg-emerald-600"].map((c, i) => (
              <div key={i} className={`w-5 h-5 rounded-sm ${c}`} />
            ))}
          </div>
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}