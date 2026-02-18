import React from "react";
import { Badge } from "@/components/ui/badge";

/**
 * Centralised status configuration for operator activity status.
 * Used in OperatorTable, OperatorDetail, and any future views.
 */
export const STATUS_CONFIG = {
  green:  { label: "Activo",    classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  yellow: { label: "Atención",  classes: "bg-amber-50   text-amber-700   border-amber-200"   },
  red:    { label: "Inactivo",  classes: "bg-red-50     text-red-700     border-red-200"     },
  none:   { label: "Sin datos", classes: "bg-gray-50    text-gray-500    border-gray-200"    },
};

/** Renders a coloured Badge for a given operator status key. */
export function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.none;
  return (
    <Badge className={`${cfg.classes} border font-medium`}>
      {cfg.label}
    </Badge>
  );
}
