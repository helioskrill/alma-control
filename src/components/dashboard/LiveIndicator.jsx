import React, { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Displays "● Actualizado hace X min" and a live/manual indicator.
 * Props:
 *   updatedAt  — timestamp (ms) of last successful data fetch
 *   isLive     — boolean, whether auto-refresh is active
 */
export default function LiveIndicator({ updatedAt, isLive }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!updatedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - updatedAt) / 1000));
    tick();
    const id = setInterval(tick, 10000); // update every 10s
    return () => clearInterval(id);
  }, [updatedAt]);

  const label =
    elapsed < 60
      ? "ahora mismo"
      : elapsed < 3600
      ? `hace ${Math.floor(elapsed / 60)} min`
      : `hace ${Math.floor(elapsed / 3600)}h`;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 select-none">
      {isLive ? (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
      ) : (
        <RefreshCw className="w-3 h-3 text-gray-300" />
      )}
      <span>
        {isLive ? "Live" : "Manual"} · actualizado {label}
      </span>
    </div>
  );
}
