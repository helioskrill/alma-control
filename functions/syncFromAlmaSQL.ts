/**
 * syncFromAlmaSQL
 * 
 * [PREPARADO PARA CUANDO INCOD DÉ ACCESO A SQL SERVER]
 * 
 * Esta función se conectará directamente a la BD de ALMA vía SQL Server,
 * consultará los registros de operaciones del día/rango especificado,
 * y los importará automáticamente a OrderCloseEvent.
 * 
 * Secrets necesarios (configurar cuando Incod dé acceso):
 *   ALMA_DB_HOST     → hostname o IP del servidor SQL Server de ALMA
 *   ALMA_DB_PORT     → puerto (por defecto 1433)
 *   ALMA_DB_USER     → usuario de solo lectura
 *   ALMA_DB_PASSWORD → contraseña
 *   ALMA_DB_NAME     → nombre de la base de datos
 * 
 * Payload:
 * {
 *   date: "2026-02-18",        // fecha a sincronizar (por defecto hoy)
 *   start_time: "07:00",       // hora inicio (por defecto 07:00)
 *   end_time: "15:00",         // hora fin (por defecto 15:00)
 *   operation_types?: string[] // filtrar tipos (opcional, por defecto todos)
 * }
 * 
 * QUERY EJEMPLO (ajustar según esquema real de ALMA):
 * 
 * SELECT
 *   op.FECHA_HORA   AS timestamp,
 *   op.USUARIO      AS user_id,
 *   op.TIPO_OP      AS operation_type,
 *   op.DOCUMENTO    AS document_id,
 *   op.DISPOSITIVO  AS device_id
 * FROM dbo.OPERACIONES op
 * WHERE op.FECHA_HORA >= @start
 *   AND op.FECHA_HORA < @end
 *   AND op.TIPO_OP IN ('PICKING_FINISHED', 'ORDER_CLOSED', ...)
 * ORDER BY op.FECHA_HORA ASC
 * 
 * Cuando Incod confirme las tablas y columnas reales, sustituir los nombres.
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function mapOperationType(opType) {
  if (!opType) return "order_closed";
  const t = opType.toUpperCase();
  if (t.includes("PICKING")) return "picking";
  if (t.includes("LOGIN") || t.includes("LOGON")) return "login";
  if (t.includes("SCAN")) return "scan";
  return "order_closed";
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Verificar que los secrets de ALMA están configurados
    const ALMA_DB_HOST = Deno.env.get("ALMA_DB_HOST");
    const ALMA_DB_USER = Deno.env.get("ALMA_DB_USER");
    const ALMA_DB_PASSWORD = Deno.env.get("ALMA_DB_PASSWORD");
    const ALMA_DB_NAME = Deno.env.get("ALMA_DB_NAME");

    if (!ALMA_DB_HOST || !ALMA_DB_USER || !ALMA_DB_PASSWORD || !ALMA_DB_NAME) {
      return Response.json({
        error: "SQL Server de ALMA no configurado. Configura los secrets: ALMA_DB_HOST, ALMA_DB_USER, ALMA_DB_PASSWORD, ALMA_DB_NAME",
        status: "pending_config"
      }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const date = body.date || new Date().toISOString().slice(0, 10);
    const startTime = body.start_time || "07:00";
    const endTime = body.end_time || "15:00";

    const start = new Date(`${date}T${startTime}:00`).toISOString();
    const end = new Date(`${date}T${endTime}:00`).toISOString();

    // TODO: Cuando Incod dé acceso a SQL Server, añadir aquí:
    // 1. import mssql from 'npm:mssql';
    // 2. Conectar con los secrets
    // 3. Ejecutar la query con @start y @end como parámetros
    // 4. Mapear resultados al formato de importFromAlma
    // 5. Llamar a base44.entities.OrderCloseEvent.bulkCreate(...)

    return Response.json({
      status: "pending_config",
      message: "Función preparada. Pendiente de credenciales SQL Server de ALMA (Incod).",
      query_range: { start, end },
      next_steps: [
        "1. Solicitar a Incod: host, puerto, usuario readonly, contraseña y nombre de BD",
        "2. Confirmar nombres de tabla y columnas del log de operaciones",
        "3. Configurar secrets en el panel de Base44",
        "4. Activar esta función"
      ]
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});