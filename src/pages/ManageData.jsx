import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Download, Trash2, Users, Package } from "lucide-react";

export default function ManageData() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("operators");
  const [showAddOp, setShowAddOp] = useState(false);
  const [newOp, setNewOp] = useState({ name: "", pda_id: "", team: "", active: true, daily_target: "" });
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ timestamp: "", operator_id: "", order_id: "", pda_id: "" });
  const fileInputRef = useRef(null);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["allEvents"],
    queryFn: () => base44.entities.OrderCloseEvent.list("timestamp", 500),
  });

  const handleExportExcel = () => {
    const op = (id) => operators.find((o) => o.id === id)?.name || id;
    const rows = [
      ["Fecha/Hora", "Operario", "Pedido", "PDA"],
      ...events.map((ev) => [
        ev.timestamp ? new Date(ev.timestamp).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "",
        op(ev.operator_id),
        ev.order_id,
        ev.pda_id || "",
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos_cerrados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const createOp = useMutation({
    mutationFn: (data) => base44.entities.Operator.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["operators"] }); setShowAddOp(false); setNewOp({ name: "", pda_id: "", team: "", active: true, daily_target: "" }); },
  });

  const deleteOp = useMutation({
    mutationFn: (id) => base44.entities.Operator.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operators"] }),
  });

  const createEvent = useMutation({
    mutationFn: (data) => base44.entities.OrderCloseEvent.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allEvents"] }); queryClient.invalidateQueries({ queryKey: ["events"] }); setShowAddEvent(false); setNewEvent({ timestamp: "", operator_id: "", order_id: "", pda_id: "" }); },
  });

  const deleteEvent = useMutation({
    mutationFn: (id) => base44.entities.OrderCloseEvent.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["allEvents"] }); queryClient.invalidateQueries({ queryKey: ["events"] }); },
  });

  const handleCSVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            timestamp: { type: "string" },
            operator_id: { type: "string" },
            order_id: { type: "string" },
            pda_id: { type: "string" },
          },
        },
      },
    });

    if (result.status === "success" && Array.isArray(result.output)) {
      await base44.entities.OrderCloseEvent.bulkCreate(
        result.output.map((r) => ({
          timestamp: r.timestamp,
          operator_id: r.operator_id,
          order_id: r.order_id,
          pda_id: r.pda_id || "",
          action: "order_closed",
        }))
      );
      queryClient.invalidateQueries({ queryKey: ["allEvents"] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    }
    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Datos</h1>
        <p className="text-sm text-gray-500 mt-1">Administra operarios y eventos de cierre</p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="operators" className="gap-1.5 text-xs">
            <Users className="w-3.5 h-3.5" />
            Operarios
          </TabsTrigger>
          <TabsTrigger value="events" className="gap-1.5 text-xs">
            <Package className="w-3.5 h-3.5" />
            Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operators" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Dialog open={showAddOp} onOpenChange={setShowAddOp}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 rounded-xl">
                  <Plus className="w-4 h-4" /> Añadir operario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo operario</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Nombre *</Label>
                    <Input value={newOp.name} onChange={(e) => setNewOp({ ...newOp, name: e.target.value })} placeholder="Nombre del operario" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>PDA ID</Label>
                      <Input value={newOp.pda_id} onChange={(e) => setNewOp({ ...newOp, pda_id: e.target.value })} placeholder="PDA-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Equipo/Zona</Label>
                      <Input value={newOp.team} onChange={(e) => setNewOp({ ...newOp, team: e.target.value })} placeholder="Zona A" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Objetivo diario (pedidos)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newOp.daily_target}
                      onChange={(e) => setNewOp({ ...newOp, daily_target: e.target.value })}
                      placeholder="ej: 60"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={newOp.active} onCheckedChange={(v) => setNewOp({ ...newOp, active: v })} />
                    <Label>Activo</Label>
                  </div>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={() => createOp.mutate(newOp)} disabled={!newOp.name}>
                    Crear operario
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Nombre</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">PDA</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Equipo</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider text-center">Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operators.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell className="font-medium">{op.name}</TableCell>
                    <TableCell className="text-gray-500">{op.pda_id || "—"}</TableCell>
                    <TableCell className="text-gray-500">{op.team || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={op.active !== false ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}>
                        {op.active !== false ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteOp.mutate(op.id)}>
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {operators.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center py-12 text-gray-400">No hay operarios registrados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6 space-y-4">
          <div className="flex justify-end gap-3">
            <Button variant="outline" className="gap-2 rounded-xl" onClick={handleExportExcel}>
              <Download className="w-4 h-4" /> Exportar CSV
            </Button>
            <Dialog open={showAddEvent} onOpenChange={setShowAddEvent}>
              <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 rounded-xl">
                  <Plus className="w-4 h-4" /> Añadir evento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nuevo evento de cierre</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Fecha y hora *</Label>
                    <Input type="datetime-local" value={newEvent.timestamp} onChange={(e) => setNewEvent({ ...newEvent, timestamp: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Operario *</Label>
                    <select
                      className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
                      value={newEvent.operator_id}
                      onChange={(e) => setNewEvent({ ...newEvent, operator_id: e.target.value })}
                    >
                      <option value="">Seleccionar operario</option>
                      {operators.map((op) => (
                        <option key={op.id} value={op.id}>{op.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>ID Pedido *</Label>
                    <Input value={newEvent.order_id} onChange={(e) => setNewEvent({ ...newEvent, order_id: e.target.value })} placeholder="PED-001" />
                  </div>
                  <Button
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => createEvent.mutate({ ...newEvent, action: "order_closed" })}
                    disabled={!newEvent.timestamp || !newEvent.operator_id || !newEvent.order_id}
                  >
                    Crear evento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Fecha/Hora</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Operario</TableHead>
                  <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Pedido</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.slice(0, 100).map((ev) => {
                  const op = operators.find((o) => o.id === ev.operator_id);
                  return (
                    <TableRow key={ev.id}>
                      <TableCell className="text-gray-600 tabular-nums">
                        {ev.timestamp ? new Date(ev.timestamp).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{op?.name || ev.operator_id}</TableCell>
                      <TableCell className="text-gray-500">{ev.order_id}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteEvent.mutate(ev.id)}>
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {events.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center py-12 text-gray-400">No hay eventos registrados</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}