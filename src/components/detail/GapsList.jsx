import React from "react";
import { AlertTriangle } from "lucide-react";

function formatTime(d) {
  return new Date(d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
}

export default function GapsList({ gaps }) {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Huecos detectados</h3>
        <div className="text-center py-8 text-gray-400 text-sm">
          Sin huecos de inactividad detectados
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Huecos detectados ({gaps.length})
      </h3>
      <div className="space-y-2.5">
        {gaps.map((gap, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3.5 bg-red-50/60 rounded-xl border border-red-100"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-gray-800 text-sm">
                {formatTime(gap.from)} → {formatTime(gap.to)}
              </span>
            </div>
            <span className="text-sm font-bold text-red-600 shrink-0">
              {Math.round(gap.minutes)} min
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}