/**
 * receivePdaEvent
 * 
 * Webhook receptor para eventos ALMA / PDA.
 * 
 * ALMA envía datos a su servidor local (192.168.1.74:8050/ws/api/senddata).
 * Este endpoint actúa como receptor alternativo o como destino de un proxy/forwarder
 * que duplica el tráfico de senddata hacia Base44.
 * 
 * Fuente: com.incod.AlonsoMercaderPDA v4.13.3
 * Endpoint ALMA original: POST /ws/api/senddata
 * 
 * Modos soportados:
 *   1. Webhook: ALMA o proxy envía POST con payload JSON
 *   2. Batch import: array de eventos en campo "events"
 * 
 * Autenticación webhook: query param ?token=ALMA_WEBHOOK_TOKEN
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ─── Diccionario de normalización operation_type → category ─────────────────
const OPERATION_CATEGORY_MAP = {
  PICKING_FINISHED:   "PICKING",
  PICKING_STARTED:    "PICKING",
  PICKING_LINE:       "PICKING",
  PICKING_PARTIAL:    "PICKING",
  PICKING_CANCELLED:  "PICKING",
  MOVE_BOBINA:        "MOVE_BOBINA",
  MOVE_LOTE:          "MOVE_LOTE",
  MOVE_STOCK:         "MOVE_LOTE",
  INVENTORY_START:    "INVENTORY",
  INVENTORY_LINE:     "INVENTORY",
  INVENTORY_CLOSE:    "INVENTORY",
  INVENTORY_FINISHED: "INVENTORY",
  ENTRY_GOODS:        "ENTRY",
  ENTRY_LINE:         "ENTRY",
  ENTRY_FINISHED:     "ENTRY",
  MERMA_REGISTER:     "MERMA",
  MERMA_LINE:         "MERMA",
  TARA_REGISTER:      "TARA",
  TARA_LINE:          "TARA",
  PRINT_LABEL:        "PRINT",
  PRINT_DOCUMENT:     "PRINT",
  ORDER_CLOSED:       "PICKING",
  ORDER_LINE:         "PICKING",
  LOGIN:              "LOGIN",
  LOGON:              "LOGIN",
  LOGOUT:             "LOGOUT",
  LOGOFF:             "LOGOUT",
  SCAN:               "SCAN",
};

function normalizeCategory(opType) {
  if (!opType) return "OTHER";
  const upper = opType.toUpperCase().replace(/-/g, "_");
  // Exact match first
  if (OPERATION_CATEGORY_MAP[upper]) return OPERATION_CATEGORY_MAP[upper];
  // Prefix match
  for (const [key, cat] of Object.entries(OPERATION_CATEGORY_MAP)) {
    if (upper.startsWith(key) || upper.includes(key)) return cat;
  }
  return "OTHER";
}

function normalizeTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Formato dd/mm/yyyy hh:mm:ss
  const match = ts.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, min, sec = "00"] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
  }
  return null;
}

function mapSingleEvent(raw, userMap = {}, source = "webhook") {
  const timestamp = normalizeTimestamp(raw.timestamp || raw.fecha_hora || raw.FECHA_HORA || raw.datetime);
  const user_id = String(raw.user_id || raw.usuario || raw.USUARIO || raw.userId || "");
  const operation_type = String(raw.operation_type || raw.tipo_op || raw.TIPO_OP || raw.type || raw.action || "");
  const document_id = String(raw.document_id || raw.documento || raw.DOCUMENTO || raw.order_id || raw.orderId || raw.picking_id || "");
  const device_id = String(raw.device_id || raw.dispositivo || raw.DISPOSITIVO || raw.pda_id || raw.pdaId || "");
  const app_version = String(raw.app_version || raw.version || raw.apk_version || "");

  return {
    timestamp,
    user_id,
    operator_id: userMap[user_id] || user_id,
    operation_type,
    operation_category: normalizeCategory(operation_type),
    document_id,
    device_id,
    meta_json: JSON.stringify(raw),
    source,
    app_version,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Autenticación por token para llamadas webhook sin sesión
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const expectedToken = Deno.env.get("ALMA_WEBHOOK_TOKEN");

    let authenticated = false;
    if (expectedToken && token === expectedToken) {
      authenticated = true;
    } else {
      const user = await base44.auth.me().catch(() => null);
      if (user) authenticated = true;
    }

    if (!authenticated) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const userMap = body.user_map || {};
    const source = body.source || "webhook";

    let rawEvents = [];
    if (Array.isArray(body)) {
      rawEvents = body;
    } else if (Array.isArray(body.events)) {
      rawEvents = body.events;
    } else if (body.timestamp || body.user_id || body.usuario) {
      // Evento único
      rawEvents = [body];
    } else {
      return Response.json({ error: "No events found in payload" }, { status: 400 });
    }

    const normalized = [];
    const errors = [];

    for (const raw of rawEvents) {
      const ev = mapSingleEvent(raw, userMap, source);
      if (!ev.timestamp) {
        errors.push({ raw, reason: "Invalid or missing timestamp" });
        continue;
      }
      if (!ev.user_id) {
        errors.push({ raw, reason: "Missing user_id" });
        continue;
      }
      normalized.push(ev);
    }

    if (normalized.length > 0) {
      await base44.asServiceRole.entities.PdaEvent.bulkCreate(normalized);
    }

    return Response.json({
      ok: true,
      imported: normalized.length,
      skipped: errors.length,
      errors: errors.slice(0, 10),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});