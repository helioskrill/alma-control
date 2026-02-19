import React, { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Upload, Download, Info, Zap, Database, Globe, Trash2, Server } from "lucide-react";
import ProxyInstaller from "../components/integration/ProxyInstaller";

// ─── Diccionario categorías ───────────────────────────────────────────────────
const CATEGORY_COLORS = {
  PICKING:    "bg-blue-50 text-blue-700 border-blue-200",
  MOVE_BOBINA:"bg-purple-50 text-purple-700 border-purple-200",
  MOVE_LOTE:  "bg-violet-50 text-violet-700 border-violet-200",
  INVENTORY:  "bg-amber-50 text-amber-700 border-amber-200",
  ENTRY:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  MERMA:      "bg-red-50 text-red-700 border-red-200",
  TARA:       "bg-orange-50 text-orange-700 border-orange-200",
  PRINT:      "bg-gray-50 text-gray-700 border-gray-200",
  LOGIN:      "bg-green-50 text-green-700 border-green-200",
  LOGOUT:     "bg-rose-50 text-rose-700 border-rose-200",
  SCAN:       "bg-cyan-50 text-cyan-700 border-cyan-200",
  OTHER:      "bg-gray-50 text-gray-500 border-gray-200",
};

// ─── Filtros actividad (para Dashboard) ───────────────────────────────────────
export const ACTIVITY_CATEGORIES = ["PICKING", "MOVE_BOBINA", "MOVE_LOTE", "INVENTORY", "ENTRY", "MERMA", "TARA", "SCAN"];

export default function AlmaIntegration() {
  const [tab, setTab] = useState("events");
  const [importStatus, setImportStatus] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["pdaEvents"],
    queryFn: () => base44.entities.PdaEvent.list("-timestamp", 200),
  });

  // ─── Import CSV/JSON via AI extraction ───────────────────────────────────────
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  timestamp:      { type: "string" },
                  user_id:        { type: "string" },
                  operation_type: { type: "string" },
                  document_id:    { type: "string" },
                  device_id:      { type: "string" },
                  app_version:    { type: "string" },
                },
              },
            },
          },
        },
      });

      if (result.status === "success") {
        const rows = Array.isArray(result.output) ? result.output : (result.output?.events || []);
        const res = await base44.functions.invoke("receivePdaEvent", { events: rows, source: "csv_import" });
        const { imported, skipped } = res.data || {};
        setImportStatus({ ok: true, imported, skipped });
        queryClient.invalidateQueries({ queryKey: ["pdaEvents"] });
      } else {
        setImportStatus({ ok: false, error: result.details });
      }
    } catch (err) {
      setImportStatus({ ok: false, error: err.message });
    }
    setImporting(false);
    e.target.value = "";
  };

  // ─── Export CSV ───────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ["Timestamp", "user_id", "operator_id", "operation_type", "category", "document_id", "device_id", "source", "app_version"],
      ...events.map((ev) => [
        ev.timestamp, ev.user_id, ev.operator_id, ev.operation_type,
        ev.operation_category, ev.document_id, ev.device_id, ev.source, ev.app_version,
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pda_events_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Integración ALMA</h1>
        <p className="text-sm text-gray-500 mt-1">
          Fuente de datos: ALMA Software · {" "}
          <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">192.168.1.74:8050/ws/api/senddata</code>
          {" · "}APK <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">com.incod.AlonsoMercaderPDA v4.13.3</code>
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <Database className="w-3.5 h-3.5" /> Eventos PDA
          </TabsTrigger>
          <TabsTrigger value="import" className="gap-1.5 text-xs">
            <Upload className="w-3.5 h-3.5" /> Importar
          </TabsTrigger>
          <TabsTrigger value="webhook" className="gap-1.5 text-xs">
            <Zap className="w-3.5 h-3.5" /> Webhook
          </TabsTrigger>
          <TabsTrigger value="proxy" className="gap-1.5 text-xs">
            <Server className="w-3.5 h-3.5" /> Proxy Local
          </TabsTrigger>
          <TabsTrigger value="types" className="gap-1.5 text-xs">
            <Info className="w-3.5 h-3.5" /> Tipos de operación
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Eventos ─────────────────────────────────────────────────────── */}
        <TabsContent value="events" className="mt-6 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{events.length} eventos · últimos 200</p>
            <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExport}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Fecha/Hora</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Usuario ALMA</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Operación</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Categoría</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Documento</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">PDA</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Fuente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-10 text-gray-400">Cargando…</TableCell></TableRow>
                )}
                {!isLoading && events.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-12 text-gray-400">No hay eventos. Importa un CSV o conecta el webhook.</TableCell></TableRow>
                )}
                {events.map((ev) => (
                  <TableRow key={ev.id}>
                    <TableCell className="tabular-nums text-gray-600 text-xs">
                      {ev.timestamp ? new Date(ev.timestamp).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{ev.user_id || "—"}</TableCell>
                    <TableCell className="text-xs text-gray-500 font-mono">{ev.operation_type || "—"}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${CATEGORY_COLORS[ev.operation_category] || CATEGORY_COLORS.OTHER}`}>
                        {ev.operation_category || "OTHER"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">{ev.document_id || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{ev.device_id || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{ev.source || "—"}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Tab: Importar ────────────────────────────────────────────────────── */}
        <TabsContent value="import" className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-xl">
            <div>
              <h2 className="font-semibold text-gray-800">Importar CSV / JSON</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sube un export del servidor ALMA o un CSV con columnas:<br />
                <code className="text-xs bg-gray-100 px-1 rounded">timestamp, user_id, operation_type, document_id, device_id</code>
              </p>
            </div>

            <input ref={fileInputRef} type="file" accept=".csv,.json,.xlsx" className="hidden" onChange={handleFileImport} />
            <Button
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 w-full rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
            >
              <Upload className="w-4 h-4" />
              {importing ? "Procesando…" : "Seleccionar archivo"}
            </Button>

            {importStatus && (
              <div className={`rounded-xl p-4 text-sm ${importStatus.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                {importStatus.ok
                  ? `✓ Importados ${importStatus.imported} eventos · ${importStatus.skipped} omitidos`
                  : `✗ Error: ${importStatus.error}`}
              </div>
            )}

            <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
              <p>• Los eventos se guardan en la colección <strong>PdaEvent</strong> con su categoría normalizada.</p>
              <p>• Si tienes un dump del payload de <code>/ws/api/senddata</code>, súbelo directamente.</p>
              <p>• El sistema detecta automáticamente el formato (ALMA, CSV, JSON).</p>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab: Webhook ─────────────────────────────────────────────────────── */}
        <TabsContent value="webhook" className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5 max-w-2xl">
            <div>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" /> Endpoint receptor de eventos
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Configura un proxy en el servidor ALMA para que duplique los datos que llegan a <code className="text-xs bg-gray-100 px-1 rounded">/ws/api/senddata</code> también hacia este endpoint.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Endpoint Base44</p>
                <code className="text-sm text-indigo-700 break-all block">
                  POST /functions/receivePdaEvent?token=ALMA_WEBHOOK_TOKEN
                </code>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Ejemplo payload (evento único)</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">{`{
  "timestamp": "2026-02-19T08:32:00",
  "user_id": "OPE01",
  "operation_type": "PICKING_FINISHED",
  "document_id": "PED-4521",
  "device_id": "PDA-03",
  "app_version": "4.13.3"
}`}</pre>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch (múltiples eventos)</p>
                <pre className="text-xs text-gray-700 whitespace-pre-wrap">{`{
  "events": [ { ... }, { ... } ],
  "user_map": { "OPE01": "<operator_id_base44>" },
  "source": "webhook"
}`}</pre>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
              <p>• Configura el secret <strong>ALMA_WEBHOOK_TOKEN</strong> en Base44 → Configuración → Variables de entorno.</p>
              <p>• El token sirve para autenticar llamadas sin sesión (proxy, cron externo, etc.).</p>
              <p>• Si Incod proporciona acceso SQL directo, usa la función <strong>syncFromAlmaSQL</strong>.</p>
            </div>
          </div>
        </TabsContent>

        {/* ─── Tab: Proxy Local ─────────────────────────────────────────────────── */}
        <TabsContent value="proxy" className="mt-6">
          <ProxyInstaller />
        </TabsContent>

        {/* ─── Tab: Tipos de operación ──────────────────────────────────────────── */}
        <TabsContent value="types" className="mt-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-2xl">
            <h2 className="font-semibold text-gray-800 mb-4">Diccionario de tipos ALMA → categoría Base44</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { cat: "PICKING",    ops: ["PICKING_*", "ORDER_CLOSED", "ORDER_LINE"] },
                { cat: "MOVE_BOBINA",ops: ["MOVE_BOBINA"] },
                { cat: "MOVE_LOTE",  ops: ["MOVE_LOTE", "MOVE_STOCK"] },
                { cat: "INVENTORY",  ops: ["INVENTORY_*"] },
                { cat: "ENTRY",      ops: ["ENTRY_*"] },
                { cat: "MERMA",      ops: ["MERMA_*"] },
                { cat: "TARA",       ops: ["TARA_*"] },
                { cat: "PRINT",      ops: ["PRINT_*"] },
                { cat: "LOGIN",      ops: ["LOGIN", "LOGON"] },
                { cat: "LOGOUT",     ops: ["LOGOUT", "LOGOFF"] },
                { cat: "SCAN",       ops: ["SCAN"] },
                { cat: "OTHER",      ops: ["(cualquier otro)"] },
              ].map(({ cat, ops }) => (
                <div key={cat} className={`rounded-xl border p-3 ${CATEGORY_COLORS[cat]}`}>
                  <p className="font-semibold text-xs mb-1">{cat}</p>
                  {ops.map((op) => <p key={op} className="text-xs opacity-75 font-mono">{op}</p>)}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              El Dashboard usa por defecto las categorías de actividad real: PICKING, MOVE_BOBINA, MOVE_LOTE, INVENTORY, ENTRY, MERMA, TARA, SCAN.<br />
              LOGIN/LOGOUT/PRINT no se cuentan como "actividad operativa" salvo que se configure explícitamente.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}