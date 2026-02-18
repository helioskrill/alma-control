import React from "react";
import { Users, Package, AlertTriangle, Activity, Target } from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, bgColor, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-24 h-24 ${bgColor} rounded-full -translate-y-8 translate-x-8 opacity-30`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
        <p className="text-3xl font-bold mt-1.5 text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      <div className={`p-2.5 rounded-xl ${bgColor} bg-opacity-20`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
    </div>
  </div>
);

export default function StatsOverview({ operators, summaries }) {
  const totalOrders = summaries.reduce((sum, s) => sum + s.totalOrders, 0);
  const totalGaps   = summaries.reduce((sum, s) => sum + s.gapCount, 0);
  const activeCount = summaries.filter((s) => s.totalOrders > 0).length;

  // Operators with a daily_target configured
  const withTarget = operators.filter((op) => op.daily_target && Number(op.daily_target) > 0);
  const inTarget   = withTarget.filter((op) => {
    const summary = summaries.find((s) => s.operatorId === op.id);
    return summary && summary.totalOrders >= Number(op.daily_target);
  });
  const targetLabel = withTarget.length > 0
    ? `${inTarget.length} de ${withTarget.length} con objetivo`
    : "Sin objetivos config.";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard icon={Users}         label="Operarios"        value={operators.length} color="text-indigo-600" bgColor="bg-indigo-500" />
      <StatCard icon={Activity}      label="Activos hoy"      value={activeCount}      color="text-emerald-600" bgColor="bg-emerald-500" />
      <StatCard icon={Package}       label="Pedidos cerrados" value={totalOrders}      color="text-sky-600"   bgColor="bg-sky-500" />
      <StatCard icon={AlertTriangle} label="Huecos detectados" value={totalGaps}       color="text-amber-600" bgColor="bg-amber-500" />
      <StatCard
        icon={Target}
        label="En objetivo"
        value={withTarget.length > 0 ? inTarget.length : "—"}
        color="text-violet-600"
        bgColor="bg-violet-500"
        sub={targetLabel}
      />
    </div>
  );
}
