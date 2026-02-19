import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Copy, CheckCircle2, Terminal, Server, Key, Play, ChevronRight } from "lucide-react";

const PROXY_CODE = `"""
ALMA → Base44 Proxy  (alma_proxy.py)
Requiere: pip install fastapi uvicorn pyodbc python-dotenv
Arrancar:  python alma_proxy.py
"""
import os, json, logging
from datetime import datetime, timezone
from typing import Optional
import pyodbc
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException, Security, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

SQL_SERVER   = os.getenv("SQL_SERVER",   "localhost")
SQL_DATABASE = os.getenv("SQL_DATABASE", "Alma_AlonsoMercader")
SQL_USER     = os.getenv("SQL_USER",     "")
SQL_PASSWORD = os.getenv("SQL_PASSWORD", "")
PROXY_PORT   = int(os.getenv("PROXY_PORT", "8099"))
API_KEY      = os.getenv("API_KEY", "")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("alma_proxy")

app = FastAPI(title="ALMA Proxy", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET"], allow_headers=["*"])

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)
def check_api_key(key: str = Security(api_key_header)):
    if API_KEY and key != API_KEY:
        raise HTTPException(status_code=403, detail="API key inválida")
    return key

def get_conn():
    return pyodbc.connect(
        f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={SQL_SERVER};"
        f"DATABASE={SQL_DATABASE};UID={SQL_USER};PWD={SQL_PASSWORD};TrustServerCertificate=yes;",
        timeout=10
    )

TYPE_MAP = {
    "PICKING":"PICKING","PICKING_FINISHED":"PICKING","ORDER_CLOSED":"PICKING",
    "MOVE_BOBINA":"MOVE_BOBINA","MOV_BOBINA":"MOVE_BOBINA",
    "MOVE_LOTE":"MOVE_LOTE","MOV_LOTE":"MOVE_LOTE",
    "INVENTORY_START":"INVENTORY","INVENTARIO":"INVENTORY","INV_LINE":"INVENTORY",
    "ENTRY_GOODS":"ENTRY","ENTRADA":"ENTRY",
    "MERMA":"WASTE","MERMA_LINE":"WASTE",
    "TARA":"TARE","TARA_LINE":"TARE",
    "PRINT_LABEL":"PRINT","IMPRIMIR":"PRINT",
    "LOGIN":"AUTH","LOGOUT":"AUTH","LOGON":"AUTH",
    "CONFIG":"CONFIG",
}
def normalize_category(op):
    if not op: return "OTHER"
    u = op.upper().replace("-","_").replace(" ","_")
    if u in TYPE_MAP: return TYPE_MAP[u]
    for k,v in TYPE_MAP.items():
        if u.startswith(k): return v
    return "OTHER"

# ⚠️  AJUSTA tabla y columnas después del discovery
QUERY_EVENTS = """
SELECT TOP 5000
    {col_ts} AS ts, {col_user} AS user_id,
    {col_optype} AS operation_type,
    {col_doc} AS document_id, {col_device} AS device_id
FROM {table}
WHERE {col_ts} >= ?
ORDER BY {col_ts} ASC
""".format(
    table="dbo.TU_TABLA_AQUI",   # ← CAMBIAR
    col_ts="FechaHora",           # ← CAMBIAR
    col_user="IdUsuario",         # ← CAMBIAR
    col_optype="TipoOperacion",   # ← CAMBIAR
    col_doc="IdDocumento",        # ← CAMBIAR
    col_device="Terminal",        # ← CAMBIAR
)

DISC_TABLES = """
SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE='BASE TABLE' AND (
  TABLE_NAME LIKE '%Oper%' OR TABLE_NAME LIKE '%Mov%' OR
  TABLE_NAME LIKE '%Recuen%' OR TABLE_NAME LIKE '%Invent%' OR
  TABLE_NAME LIKE '%Log%' OR TABLE_NAME LIKE '%Traza%' OR
  TABLE_NAME LIKE '%Hist%' OR TABLE_NAME LIKE '%PDA%' OR
  TABLE_NAME LIKE '%User%' OR TABLE_NAME LIKE '%Usu%'
) ORDER BY TABLE_NAME"""

DISC_COLS = """
SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
WHERE COLUMN_NAME IN (
  'Fecha','FechaHora','Date','CreatedAt','Timestamp',
  'Usuario','User','Operario','IdUsuario','Terminal','PDA','Device','TipoOperacion','Operacion'
) ORDER BY TABLE_NAME, COLUMN_NAME"""

@app.get("/health")
def health():
    try:
        conn = get_conn(); conn.close()
        return {"status": "ok", "db": SQL_DATABASE, "server": SQL_SERVER}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.get("/events", dependencies=[Depends(check_api_key)])
def get_events(
    since: Optional[str] = Query(None),
    date:  Optional[str] = Query(None),
):
    since_dt = f"{date}T00:00:00" if date else (since or datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00"))
    conn = get_conn(); cur = conn.cursor()
    cur.execute(QUERY_EVENTS, (since_dt,))
    rows = cur.fetchall(); cols = [d[0] for d in cur.description]; conn.close()
    events = []
    for row in rows:
        r = dict(zip(cols, row))
        op = str(r.get("operation_type") or "").strip()
        ts = r.get("ts")
        events.append({
            "timestamp": ts.isoformat() if hasattr(ts,"isoformat") else str(ts),
            "user_id": str(r.get("user_id") or ""),
            "operator_id": str(r.get("user_id") or ""),
            "operation_type": op,
            "operation_category": normalize_category(op),
            "document_id": str(r.get("document_id") or ""),
            "device_id": str(r.get("device_id") or ""),
            "source": "sql_sync",
            "meta_json": json.dumps(r, default=str),
        })
    logger.info("GET /events since=%s → %d eventos", since_dt, len(events))
    return {"count": len(events), "since": since_dt, "events": events}

@app.get("/users", dependencies=[Depends(check_api_key)])
def get_users():
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT DISTINCT IdUsuario FROM dbo.TU_TABLA_AQUI WHERE IdUsuario IS NOT NULL")
    users = [{"user_id": str(r[0])} for r in cur.fetchall()]; conn.close()
    return {"count": len(users), "users": users}

@app.get("/discovery/tables", dependencies=[Depends(check_api_key)])
def discovery_tables():
    conn = get_conn(); cur = conn.cursor(); cur.execute(DISC_TABLES)
    rows = [{"schema": r[0], "table": r[1]} for r in cur.fetchall()]; conn.close()
    return {"count": len(rows), "tables": rows}

@app.get("/discovery/columns", dependencies=[Depends(check_api_key)])
def discovery_columns():
    conn = get_conn(); cur = conn.cursor(); cur.execute(DISC_COLS)
    rows = [{"table": r[0], "column": r[1], "type": r[2]} for r in cur.fetchall()]; conn.close()
    return {"count": len(rows), "columns": rows}

if __name__ == "__main__":
    import uvicorn
    logger.info("Iniciando ALMA Proxy en puerto %d", PROXY_PORT)
    uvicorn.run("alma_proxy:app", host="0.0.0.0", port=PROXY_PORT, reload=False)
`;

const ENV_TEMPLATE = `# El proxy corre EN el propio SRV2019, así que el servidor es localhost
SQL_SERVER=localhost
SQL_DATABASE=Alma_AlonsoMercader
SQL_USER=alma_readonly
SQL_PASSWORD=TU_PASSWORD_AQUI
PROXY_PORT=8099
API_KEY=GENERA_UNA_CLAVE_SECRETA_AQUI
`;

const BAT_CONTENT = `@echo off
cd /d "%~dp0"
echo Iniciando ALMA Proxy...
python alma_proxy.py
pause
`;

const INSTALL_STEPS = [
  {
    icon: Download,
    title: "1. Instala Python en SRV2019",
    desc: "Conéctate a SRV2019 por RDP e instala Python si no está ya:",
    action: { label: "Descargar Python 3.11 (64-bit)", href: "https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe" },
    note: "Marca '✓ Add Python to PATH' durante la instalación. Verifica con: python --version",
  },
  {
    icon: Terminal,
    title: "2. Instala dependencias",
    desc: "Abre CMD o PowerShell en SRV2019 y ejecuta:",
    code: "pip install fastapi uvicorn pyodbc python-dotenv",
    note: "El driver ODBC 17 suele estar ya instalado en el servidor SQL. Si no: descarga 'ODBC Driver 17 for SQL Server' de Microsoft.",
  },
  {
    icon: Server,
    title: "3. Crea la carpeta y copia los archivos",
    desc: "Crea C:\\alma_proxy\\ en SRV2019 y copia los dos archivos descargados arriba:",
    files: ["alma_proxy.py", ".env"],
    note: "Puedes usar una carpeta compartida de red o copiar por RDP (portapapeles).",
  },
  {
    icon: Key,
    title: "4. Configura el .env",
    desc: "Edita el .env — como el proxy corre en el mismo servidor, SQL_SERVER=localhost:",
    code: ENV_TEMPLATE,
    note: "Usa un usuario SQL con permisos de solo lectura sobre Alma_AlonsoMercader.",
  },
  {
    icon: Play,
    title: "5. Arranca el proxy",
    desc: "Desde CMD en SRV2019, dentro de C:\\alma_proxy\\:",
    code: "python alma_proxy.py",
    note: "Para que arranque automáticamente con Windows, usa el .bat como tarea programada o servicio Windows (NSSM).",
  },
  {
    icon: CheckCircle2,
    title: "6. Abre el firewall de Windows",
    desc: "Permite el puerto 8099 en el firewall de SRV2019 (PowerShell como administrador):",
    code: `netsh advfirewall firewall add rule name="ALMA Proxy" dir=in action=allow protocol=TCP localport=8099`,
    note: "Después verifica desde otro PC: http://SRV2019:8099/health",
  },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-indigo-600 transition-colors ml-auto shrink-0">
      {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function ProxyInstaller() {
  const [expandedStep, setExpandedStep] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold text-indigo-900 text-base flex items-center gap-2">
              <Server className="w-4 h-4" /> Proxy Local ALMA → Base44
            </h2>
            <p className="text-sm text-indigo-700 mt-1 max-w-xl">
              Un pequeño servicio que corre en un PC de oficina con acceso a SRV2019.
              Lee SQL Server y entrega los eventos normalizados a Base44. Nada queda expuesto en internet.
            </p>
          </div>
          <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 self-start shrink-0">Python / FastAPI</Badge>
        </div>

        {/* Arquitectura visual */}
        <div className="mt-4 flex items-center gap-2 text-xs text-indigo-600 flex-wrap">
          <span className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5 font-mono">SRV2019\Alma_AlonsoMercader</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-white border border-indigo-200 rounded-lg px-3 py-1.5">PC Oficina :8099</span>
          <ChevronRight className="w-4 h-4 text-indigo-400" />
          <span className="bg-indigo-600 text-white rounded-lg px-3 py-1.5">Base44</span>
        </div>
      </div>

      {/* Descarga rápida */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5">
        <h3 className="font-semibold text-gray-800 mb-3 text-sm">Descarga rápida de archivos</h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => downloadFile("alma_proxy.py", PROXY_CODE)}
          >
            <Download className="w-4 h-4" /> alma_proxy.py
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => downloadFile(".env", ENV_TEMPLATE)}
          >
            <Download className="w-4 h-4" /> .env (plantilla)
          </Button>
          <Button
            variant="outline"
            className="gap-2 rounded-xl"
            onClick={() => downloadFile("arrancar.bat", BAT_CONTENT)}
          >
            <Download className="w-4 h-4" /> arrancar.bat
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-3">Guarda los tres archivos en la misma carpeta (ej: <code>C:\alma_proxy\</code>)</p>
      </div>

      {/* Pasos */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Guía paso a paso</h3>
        {INSTALL_STEPS.map((step, i) => (
          <div key={i} className="bg-white border border-gray-100 shadow-sm rounded-2xl overflow-hidden">
            <button
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpandedStep(expandedStep === i ? null : i)}
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                <step.icon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm text-gray-800">{step.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
              </div>
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedStep === i ? "rotate-90" : ""}`} />
            </button>

            {expandedStep === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-50">
                {step.action && (
                  <a href={step.action.href} target="_blank" rel="noreferrer">
                    <Button className="mt-3 gap-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                      <Download className="w-4 h-4" /> {step.action.label}
                    </Button>
                  </a>
                )}
                {step.files && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.files.map(f => (
                      <Badge key={f} variant="outline" className="font-mono text-xs">{f}</Badge>
                    ))}
                  </div>
                )}
                {step.code && (
                  <div className="mt-3 bg-gray-950 rounded-xl p-3 flex items-start gap-2">
                    <pre className="text-xs text-green-400 flex-1 overflow-x-auto whitespace-pre-wrap">{step.code}</pre>
                    <CopyButton text={step.code} />
                  </div>
                )}
                {step.note && (
                  <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{step.note}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Discovery */}
      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold text-gray-800 text-sm">Discovery de tablas (tras arrancar el proxy)</h3>
        <p className="text-xs text-gray-500">Una vez el proxy esté corriendo, accede a estos endpoints para descubrir qué tablas tienen los eventos:</p>
        <div className="space-y-2">
          {[
            { url: "http://PC_OFICINA:8099/discovery/tables", desc: "Tablas candidatas a eventos" },
            { url: "http://PC_OFICINA:8099/discovery/columns", desc: "Columnas de timestamp/usuario" },
            { url: "http://PC_OFICINA:8099/events?date=2026-02-19", desc: "Prueba de eventos de hoy" },
          ].map(({ url, desc }) => (
            <div key={url} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <code className="text-xs text-indigo-700 break-all">{url}</code>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <CopyButton text={url} />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 border-t pt-3">
          Pega el resultado del discovery aquí en el chat y actualizamos el mapping de columnas automáticamente.
        </p>
      </div>
    </div>
  );
}