/**
 * importFromAlma
 * 
 * Función de ingesta de eventos desde ALMA.
 * 
 * Acepta un array de eventos en formato ALMA y los normaliza
 * a la tabla interna OrderCloseEvent, mapeando user_id → operator_id.
 * 
 * Cuando Incod dé acceso a SQL Server, esta función se ampliará
 * para conectarse directamente a la BD de ALMA y hacer la consulta.
 * 
 * Payload esperado:
 * {
 *   events: [
 *     {
 *       timestamp: string,       // datetime ISO o formato ALMA
 *       user_id: string,         // operario en ALMA
 *       operation_type: string,  // ej: PICKING_FINISHED
 *       document_id: string,     // pedido/picking
 *       device_id?: string       // PDA (opcional)
 *     }
 *   ],
 *   // Mapa opcional user_id ALMA → operator_id interno
 *   // Si no se pasa, se usará user_id directamente como operator_id
 *   user_map?: { [alma_user_id: string]: string }
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Mapear operation_type de ALMA a action interna
function mapOperationType(opType) {
  if (!opType) return "order_closed";
  const t = opType.toUpperCase();
  if (t.includes("PICKING")) return "picking";
  if (t.includes("LOGIN") || t.includes("LOGON")) return "login";
  if (t.includes("SCAN")) return "scan";
  return "order_closed";
}

// Normalizar timestamp (ALMA puede enviar varios formatos)
function normalizeTimestamp(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  if (!isNaN(d.getTime())) return d.toISOString();
  // Intentar formato dd/mm/yyyy hh:mm:ss
  const match = ts.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const [, day, month, year, hour, min, sec = "00"] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}`).toISOString();
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { events = [], user_map = {} } = await req.json();

    if (!Array.isArray(events) || events.length === 0) {
      return Response.json({ error: 'No events provided' }, { status: 400 });
    }

    const normalized = [];
    const errors = [];

    for (const ev of events) {
      const timestamp = normalizeTimestamp(ev.timestamp);
      if (!timestamp) {
        errors.push({ raw: ev, reason: "Invalid timestamp" });
        continue;
      }

      const alma_user_id = String(ev.user_id || "");
      const operator_id = user_map[alma_user_id] || alma_user_id;
      const order_id = String(ev.document_id || ev.order_id || "");

      if (!operator_id || !order_id) {
        errors.push({ raw: ev, reason: "Missing user_id or document_id" });
        continue;
      }

      normalized.push({
        timestamp,
        operator_id,
        order_id,
        pda_id: ev.device_id || ev.pda_id || "",
        operation_type: ev.operation_type || "",
        alma_user_id,
        action: mapOperationType(ev.operation_type),
      });
    }

    if (normalized.length > 0) {
      await base44.entities.OrderCloseEvent.bulkCreate(normalized);
    }

    return Response.json({
      imported: normalized.length,
      skipped: errors.length,
      errors: errors.slice(0, 20), // max 20 errores en respuesta
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});