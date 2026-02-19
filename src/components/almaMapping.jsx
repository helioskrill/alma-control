/**
 * almaMapping.js
 * 
 * Diccionario central ALMA → Base44.
 * Fuente: com.incod.AlonsoMercaderPDA v4.13.3
 * 
 * Módulos APK (en castellano) → código interno estable → patrones de operation_type
 */

// ─── Categorías canónicas (códigos internos estables) ────────────────────────
export const ALMA_CATEGORIES = {
  PICKING:   { code: "PICKING",   label: "Picking",        color: "bg-blue-50 text-blue-700 border-blue-200" },
  MOVE_BOBINA:{ code: "MOVE_BOBINA", label: "Mov. Bobina",  color: "bg-purple-50 text-purple-700 border-purple-200" },
  MOVE_LOTE: { code: "MOVE_LOTE",  label: "Mov. Lote",     color: "bg-violet-50 text-violet-700 border-violet-200" },
  INVENTORY: { code: "INVENTORY",  label: "Inventarios",   color: "bg-amber-50 text-amber-700 border-amber-200" },
  ENTRY:     { code: "ENTRY",      label: "Entradas",      color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  WASTE:     { code: "WASTE",      label: "Mermas",        color: "bg-red-50 text-red-700 border-red-200" },
  TARE:      { code: "TARE",       label: "Taras",         color: "bg-orange-50 text-orange-700 border-orange-200" },
  PRINT:     { code: "PRINT",      label: "Imprimir",      color: "bg-gray-50 text-gray-600 border-gray-200" },
  CONFIG:    { code: "CONFIG",     label: "Config",        color: "bg-slate-50 text-slate-600 border-slate-200" },
  AUTH:      { code: "AUTH",       label: "Login/Logout",  color: "bg-green-50 text-green-700 border-green-200" },
  OTHER:     { code: "OTHER",      label: "Otros",         color: "bg-gray-50 text-gray-400 border-gray-100" },
};

// ─── Mapa de operation_type (lo que envía Incod/ALMA) → código canónico ──────
// Añadir aquí nuevas entradas cuando Incod confirme los valores reales.
export const ALMA_TYPE_MAP = {
  // Picking
  PICKING_FINISHED:    "PICKING",
  PICKING_STARTED:     "PICKING",
  PICKING_LINE:        "PICKING",
  PICKING_PARTIAL:     "PICKING",
  PICKING_CANCELLED:   "PICKING",
  ORDER_CLOSED:        "PICKING",
  ORDER_LINE:          "PICKING",
  CLOSE_ORDER:         "PICKING",
  FINISH_PICKING:      "PICKING",

  // Movimientos Bobina
  MOVE_BOBINA:         "MOVE_BOBINA",
  MOVIMIENTO_BOBINA:   "MOVE_BOBINA",
  MOV_BOBINA:          "MOVE_BOBINA",

  // Movimientos Lote
  MOVE_LOTE:           "MOVE_LOTE",
  MOVIMIENTO_LOTE:     "MOVE_LOTE",
  MOV_LOTE:            "MOVE_LOTE",
  MOVE_STOCK:          "MOVE_LOTE",

  // Inventarios
  INVENTORY_START:     "INVENTORY",
  INVENTORY_LINE:      "INVENTORY",
  INVENTORY_CLOSE:     "INVENTORY",
  INVENTORY_FINISHED:  "INVENTORY",
  INVENTARIO:          "INVENTORY",
  INV_LINE:            "INVENTORY",

  // Entradas
  ENTRY_GOODS:         "ENTRY",
  ENTRY_LINE:          "ENTRY",
  ENTRY_FINISHED:      "ENTRY",
  ENTRADA:             "ENTRY",
  GOODS_RECEIPT:       "ENTRY",

  // Mermas
  MERMA_REGISTER:      "WASTE",
  MERMA_LINE:          "WASTE",
  MERMA:               "WASTE",
  WASTE:               "WASTE",

  // Taras
  TARA_REGISTER:       "TARE",
  TARA_LINE:           "TARE",
  TARA:                "TARE",
  TARE:                "TARE",

  // Imprimir
  PRINT_LABEL:         "PRINT",
  PRINT_DOCUMENT:      "PRINT",
  IMPRIMIR:            "PRINT",
  PRINT:               "PRINT",

  // Config
  CONFIG:              "CONFIG",
  CONFIGURACION:       "CONFIG",
  SETUP:               "CONFIG",

  // Auth
  LOGIN:               "AUTH",
  LOGON:               "AUTH",
  LOGOUT:              "AUTH",
  LOGOFF:              "AUTH",
  SCAN:                "AUTH",
};

/**
 * Normaliza un operation_type arbitrario al código canónico Base44.
 * Primero prueba match exacto (uppercase), luego prefix/substring.
 * @param {string} opType - valor original de ALMA
 * @returns {string} código canónico (ej: "PICKING")
 */
export function normalizeCategory(opType) {
  if (!opType) return "OTHER";
  const upper = opType.toUpperCase().replace(/[-\s]/g, "_");

  if (ALMA_TYPE_MAP[upper]) return ALMA_TYPE_MAP[upper];

  // Prefix match
  for (const [key, cat] of Object.entries(ALMA_TYPE_MAP)) {
    if (upper.startsWith(key) || upper.includes(key)) return cat;
  }
  return "OTHER";
}

// ─── Presets de "qué cuenta como actividad" ───────────────────────────────────
export const ACTIVITY_PRESETS = [
  {
    id: "solo_picking",
    label: "Solo Picking",
    description: "Solo cuenta Picking como actividad operativa",
    categories: ["PICKING"],
  },
  {
    id: "operativa",
    label: "Operativa completa",
    description: "Picking + Movimientos + Inventarios + Entradas + Mermas + Taras",
    categories: ["PICKING", "MOVE_BOBINA", "MOVE_LOTE", "INVENTORY", "ENTRY", "WASTE", "TARE"],
  },
  {
    id: "todo",
    label: "Todas las operaciones",
    description: "Cualquier evento ALMA (incluye Imprimir, Config, Auth)",
    categories: ["PICKING", "MOVE_BOBINA", "MOVE_LOTE", "INVENTORY", "ENTRY", "WASTE", "TARE", "PRINT", "CONFIG", "AUTH"],
  },
];

export const DEFAULT_ACTIVITY_PRESET = "operativa";