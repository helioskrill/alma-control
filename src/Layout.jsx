import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { LayoutDashboard, UserCog, Menu, X, PackageX, Smartphone, TrendingUp, ShieldAlert, Plug } from "lucide-react";

const navItems = [
  { name: "Dashboard",        label: "Dashboard",         icon: LayoutDashboard },
  { name: "PedidosAtrasados", label: "Pedidos Atrasados", icon: PackageX },
  { name: "DevicePanel",      label: "PDAs",              icon: Smartphone },
  { name: "HistoryView",      label: "Histórico",         icon: TrendingUp },
  { name: "Anomalies",        label: "Anomalías",         icon: ShieldAlert },
  { name: "AlmaIntegration",  label: "Integración ALMA",  icon: Plug },
  { name: "ManageData",       label: "Gestión de Datos",  icon: UserCog },
];

export default function Layout({ children, currentPageName }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <style>{`
        :root {
          --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;
        }
        body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
      `}</style>

      {/* Top bar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 transition"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3">
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995bafcde2f3bc019c1d4bc/40821ef0e_AlonsoMercader2025_LOGOTIPO1.png"
                alt="Alonso Mercader"
                className="h-8 object-contain hidden sm:block"
              />
              <span className="text-gray-300 hidden sm:block">|</span>
              <img
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995bafcde2f3bc019c1d4bc/4b6fa1110_solucion-gestion-almacen-removebg-preview.png"
                alt="ALMA Software"
                className="h-16 object-contain hidden sm:block"
              />
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const isActive = currentPageName === item.name;
              return (
                <Link
                  key={item.name}
                  to={createPageUrl(item.name)}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}