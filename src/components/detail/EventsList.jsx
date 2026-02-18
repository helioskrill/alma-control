import React from "react";
import { Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getOpType } from "../../lib/operationTypes";

export default function EventsList({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">Eventos del día</h3>
        <div className="text-center py-8 text-gray-400 text-sm">Sin eventos registrados</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-4">
        Eventos del día ({events.length})
      </h3>
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
        {events.map((ev, i) => {
          const opType = getOpType(ev.action);
          return (
            <div
              key={i}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${opType.badgeClass.replace("text-", "bg-").split(" ")[0]} bg-opacity-20`}>
                <Package className={`w-4 h-4 ${opType.badgeClass.split(" ").find((c) => c.startsWith("text-")) || "text-gray-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">Pedido {ev.order_id}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge className={`${opType.badgeClass} border text-[10px] px-1.5 py-0`}>
                    {opType.label}
                  </Badge>
                  {ev.pda_id && <span className="text-xs text-gray-400">PDA: {ev.pda_id}</span>}
                </div>
              </div>
              <span className="text-sm font-semibold text-gray-600 tabular-nums shrink-0">
                {new Date(ev.timestamp).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
