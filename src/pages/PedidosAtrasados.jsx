import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

function getDaysLate(generatedDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const gen = new Date(generatedDate);
  gen.setHours(0, 0, 0, 0);
  return Math.floor((today - gen) / (1000 * 60 * 60 * 24));
}

function getDelayColor(days) {
  if (days <= 0) return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  if (days === 1) return { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", badge: "bg-orange-100 text-orange-800 border-orange-300" };
  if (days === 2) return { bg: "bg-red-50", border: "border-red-100", text: "text-red-600", badge: "bg-red-100 text-red-700 border-red-200" };
  return { bg: "bg-red-100", border: "border-red-300", text: "text-red-800", badge: "bg-red-600 text-white border-red-700" };
}

function DelayBadge({ days }) {
  const colors = getDelayColor(days);
  if (days <= 0) return <Badge className={`${colors.badge} border text-xs`}><Clock className="w-3 h-3 mr-1" />Hoy</Badge>;
  return (
    <Badge className={`${colors.badge} border text-xs`}>
      <AlertTriangle className="w-3 h-3 mr-1" />
      {days} {days === 1 ? "día" : "días"} de retraso
    </Badge>
  );
}

export default function PedidosAtrasados() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [newOrder, setNewOrder] = useState({ order_id: "", generated_date: "", operator_id: "", description: "" });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list(),
  });

  const { data: allOrders = [], isLoading } = useQuery({
    queryKey: ["pendingOrders"],
    queryFn: () => base44.entities.PendingOrder.filter({ closed: false }, "generated_date", 500),
  });

  const createOrder = useMutation({
    mutationFn: (data) => base44.entities.PendingOrder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingOrders"] });
      setShowAdd(false);
      setNewOrder({ order_id: "", generated_date: "", operator_id: "", description: "" });
    },
  });

  const closeOrder = useMutation({
    mutationFn: (id) =>
      base44.entities.PendingOrder.update(id, {
        closed: true,
        closed_date: new Date().toISOString().slice(0, 10),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendingOrders"] }),
  });

  const deleteOrder = useMutation({
    mutationFn: (id) => base44.entities.PendingOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pendingOrders"] }),
  });

  // Compute days-late once per order, then sort and aggregate in a single pass
  const withDays = allOrders.map((o) => ({ ...o, _days: getDaysLate(o.generated_date) }));
  const sorted   = [...withDays].sort((a, b) => b._days - a._days);

  const { statsToday, stats1, stats2plus } = sorted.reduce(
    (acc, o) => {
      if (o._days <= 0)       acc.statsToday++;
      else if (o._days === 1) acc.stats1++;
      else                    acc.stats2plus++;
      return acc;
    },
    { statsToday: 0, stats1: 0, stats2plus: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pedidos Atrasados</h1>
          <p className="text-sm text-gray-500 mt-1">Pedidos generados que no se han cerrado en su día</p>
        </div>
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 rounded-xl">
              <Plus className="w-4 h-4" /> Añadir pedido
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nuevo pedido pendiente</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>ID Pedido *</Label>
                <Input value={newOrder.order_id} onChange={(e) => setNewOrder({ ...newOrder, order_id: e.target.value })} placeholder="PED-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de generación *</Label>
                <Input type="date" value={newOrder.generated_date} onChange={(e) => setNewOrder({ ...newOrder, generated_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Operario asignado</Label>
                <select
                  className="w-full h-10 rounded-xl border border-gray-200 px-3 text-sm"
                  value={newOrder.operator_id}
                  onChange={(e) => setNewOrder({ ...newOrder, operator_id: e.target.value })}
                >
                  <option value="">Sin asignar</option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>{op.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Descripción</Label>
                <Input value={newOrder.description} onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })} placeholder="Notas..." />
              </div>
              <Button
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => createOrder.mutate(newOrder)}
                disabled={!newOrder.order_id || !newOrder.generated_date}
              >
                Crear pedido
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{statsToday}</div>
          <div className="text-xs text-yellow-600 mt-1">Generados hoy</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-700">{stats1}</div>
          <div className="text-xs text-orange-600 mt-1">1 día de retraso</div>
        </div>
        <div className="bg-red-100 border border-red-300 rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-red-800">{stats2plus}</div>
          <div className="text-xs text-red-700 mt-1">2+ días de retraso</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Cargando...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/80">
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Pedido</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Fecha generación</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Operario</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Descripción</TableHead>
                <TableHead className="font-semibold text-gray-500 text-xs uppercase tracking-wider">Estado</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((order) => {
                const days = order._days;
                const colors = getDelayColor(days);
                const op = operators.find((o) => o.id === order.operator_id);
                return (
                  <TableRow key={order.id} className={`${colors.bg} border-l-4 ${colors.border}`}>
                    <TableCell className="font-semibold">{order.order_id}</TableCell>
                    <TableCell className="text-gray-600 tabular-nums">
                      {new Date(order.generated_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
                    </TableCell>
                    <TableCell className="text-gray-600">{op?.name || "—"}</TableCell>
                    <TableCell className="text-gray-500 text-sm">{order.description || "—"}</TableCell>
                    <TableCell><DelayBadge days={days} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Marcar como cerrado"
                          onClick={() => closeOrder.mutate(order.id)}
                        >
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteOrder.mutate(order.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                    No hay pedidos atrasados pendientes
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}