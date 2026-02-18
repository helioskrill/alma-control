/**
 * ALMA operation type configuration.
 * Maps the `action` field from OrderCloseEvent to display metadata.
 *
 * ALMA generates these action codes (extend as needed when integrating via API/SQL):
 *   picking      → picking de líneas
 *   movement     → movimiento/traslado de mercancía
 *   reception    → recepción de mercancía
 *   inventory    → inventario / recuento
 *   order_closed → cierre genérico (valor por defecto legacy)
 */
export const OPERATION_TYPES = {
  picking:      { label: "Picking",    dotClass: "bg-indigo-500",  badgeClass: "bg-indigo-50  text-indigo-700  border-indigo-200"  },
  movement:     { label: "Movimiento", dotClass: "bg-emerald-500", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  reception:    { label: "Recepción",  dotClass: "bg-amber-500",   badgeClass: "bg-amber-50   text-amber-700   border-amber-200"   },
  inventory:    { label: "Inventario", dotClass: "bg-purple-500",  badgeClass: "bg-purple-50  text-purple-700  border-purple-200"  },
  order_closed: { label: "Cierre",     dotClass: "bg-gray-400",    badgeClass: "bg-gray-50    text-gray-600    border-gray-200"    },
};

/** Returns the config for a given action value, falling back to order_closed. */
export function getOpType(action) {
  return OPERATION_TYPES[action] ?? OPERATION_TYPES.order_closed;
}

/** All distinct action keys (for legend rendering). */
export const ALL_OP_TYPES = Object.keys(OPERATION_TYPES);
