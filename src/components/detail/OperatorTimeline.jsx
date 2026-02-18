import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getOpType, OPERATION_TYPES } from "../../lib/operationTypes";

function makeToPercent(shiftStartDate, totalMs) {
  return function toPercent(time) {
    const t = new Date(time);
    const normalised = new Date(2000, 0, 1, t.getHours(), t.getMinutes(), t.getSeconds(), t.getMilliseconds());
    return Math.max(0, Math.min(100, ((normalised.getTime() - shiftStartDate.getTime()) / totalMs) * 100));
  };
}

export default function OperatorTimeline({ summary, startTime, endTime }) {
  const shiftStartDate = new Date(`2000-01-01T${startTime}:00`);
  const shiftEndDate   = new Date(`2000-01-01T${endTime}:00`);
  const totalMs        = shiftEndDate.getTime() - shiftStartDate.getTime();
  const toPercent      = makeToPercent(shiftStartDate, totalMs);

  const hours = [];
  for (let h = parseInt(startTime); h <= parseInt(endTime); h++) {
    hours.push(`${String(h).padStart(2, "0")}:00`);
  }

  // Collect distinct action types present in this operator's events for dynamic legend
  const presentTypes = [...new Set(summary.events.map((ev) => ev.action || "order_closed"))];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-5">Timeline de actividad</h3>

      <div className="relative">
        {/* Hour markers */}
        <div className="flex justify-between text-xs text-gray-400 mb-2 px-0.5">
          {hours.map((h) => (
            <span key={h}>{h}</span>
          ))}
        </div>

        {/* Timeline bar */}
        <div className="relative h-14 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          {/* Hour grid lines */}
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute top-0 bottom-0 border-l border-gray-100"
              style={{ left: `${(i / (hours.length - 1)) * 100}%` }}
            />
          ))}

          {/* Gap zones */}
          {summary.gaps.map((gap, i) => {
            const left  = toPercent(gap.from);
            const right = toPercent(gap.to);
            return (
              <div
                key={i}
                className="absolute top-1 bottom-1 bg-red-100/60 border border-red-200/50 rounded-lg"
                style={{ left: `${left}%`, width: `${Math.max(right - left, 0.5)}%` }}
              />
            );
          })}

          {/* Event dots — coloured by operation type */}
          <TooltipProvider>
            {summary.events.map((ev, i) => {
              const left   = toPercent(ev.timestamp);
              const opType = getOpType(ev.action);
              return (
                <Tooltip key={i}>
                  <TooltipTrigger asChild>
                    <div
                      className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 ${opType.dotClass} rounded-full border-2 border-white shadow-md cursor-pointer hover:scale-150 transition-transform z-10`}
                      style={{ left: `${left}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent className="text-xs">
                    <p className="font-semibold">
                      {new Date(ev.timestamp).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-gray-500">Pedido: {ev.order_id}</p>
                    <p className="text-gray-400">{opType.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Dynamic legend: gap zone + one entry per distinct action type */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-gray-500">
          {presentTypes.map((actionKey) => {
            const cfg = OPERATION_TYPES[actionKey] ?? OPERATION_TYPES.order_closed;
            return (
              <div key={actionKey} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 ${cfg.dotClass} rounded-full`} />
                <span>{cfg.label}</span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-2.5 bg-red-100 border border-red-200 rounded" />
            <span>Hueco de inactividad</span>
          </div>
        </div>
      </div>
    </div>
  );
}
