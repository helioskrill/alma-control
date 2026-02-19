import { createPageUrl } from "../utils";
export { createPageUrl };

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build the shift start/end Date objects once and reuse them. */
export function buildShiftWindow(date, startTime, endTime) {
  return {
    shiftStart: new Date(`${date}T${startTime}:00`),
    shiftEnd:   new Date(`${date}T${endTime}:00`),
  };
}

/** Determine the activity status. Red if ≥3 gaps or maxGap > threshold×3, yellow if any gap, green otherwise. */
function deriveStatus(gaps, maxGap, thresholdMinutes) {
  if (gaps.length === 0) return "green";
  if (gaps.length >= 3 || maxGap > thresholdMinutes * 3) return "red";
  return "yellow";
}

// ─── Cadencia ─────────────────────────────────────────────────────────────────

/**
 * Compute cadence metrics from a sorted list of events (with _ts Date property).
 * Returns ordersPerHour and avgIntervalMin (average minutes between consecutive events).
 */
export function computeCadence(sortedEvents) {
  if (sortedEvents.length === 0) return { ordersPerHour: null, avgIntervalMin: null };

  // Effective working time = span from first to last event
  const spanMs = sortedEvents[sortedEvents.length - 1]._ts - sortedEvents[0]._ts;
  const spanHours = spanMs / 3600000;
  const ordersPerHour = spanHours > 0 ? +(sortedEvents.length / spanHours).toFixed(1) : null;

  // Average interval between consecutive events
  let totalIntervalMs = 0;
  for (let i = 1; i < sortedEvents.length; i++) {
    totalIntervalMs += sortedEvents[i]._ts - sortedEvents[i - 1]._ts;
  }
  const avgIntervalMin =
    sortedEvents.length > 1
      ? +((totalIntervalMs / (sortedEvents.length - 1)) / 60000).toFixed(1)
      : null;

  return { ordersPerHour, avgIntervalMin };
}

// ─── Core computation ────────────────────────────────────────────────────────

/**
 * Compute the activity summary for a SINGLE operator.
 * Includes cadence metrics (ordersPerHour, avgIntervalMin).
 * @param {string[]} [activityCategories] - categories that count as activity for gap detection.
 *   If null/undefined, ALL events count (legacy behaviour).
 */
export function computeOperatorSummary(operator, events, date, startTime, endTime, thresholdMinutes, activityCategories) {
  const { shiftStart, shiftEnd } = buildShiftWindow(date, startTime, endTime);

  const allOpEvents = events
    .filter((e) => e.operator_id === operator.id)
    .map((e) => ({ ...e, _ts: new Date(e.timestamp) }))
    .filter((e) => e._ts >= shiftStart && e._ts <= shiftEnd)
    .sort((a, b) => a._ts - b._ts);

  // Events that count as activity (for gap detection)
  const opEvents = activityCategories && activityCategories.length > 0
    ? allOpEvents.filter((e) => activityCategories.includes(e.operation_category))
    : allOpEvents;

  if (opEvents.length === 0) {
    return {
      operatorId:    operator.id,
      operatorName:  operator.name,
      totalOrders:   0,
      firstClose:    null,
      lastClose:     null,
      maxGap:        null,
      gapCount:      0,
      gaps:          [],
      events:        [],
      status:        "none",
      ordersPerHour: null,
      avgIntervalMin: null,
    };
  }

  const gaps = [];
  let maxGap = 0;

  const addGap = (from, to) => {
    const minutes = (to - from) / 60000;
    if (minutes > thresholdMinutes) {
      gaps.push({ from, to, minutes });
      if (minutes > maxGap) maxGap = minutes;
    }
  };

  addGap(shiftStart, opEvents[0]._ts);
  for (let i = 1; i < opEvents.length; i++) {
    addGap(opEvents[i - 1]._ts, opEvents[i]._ts);
  }
  addGap(opEvents[opEvents.length - 1]._ts, shiftEnd);

  const { ordersPerHour, avgIntervalMin } = computeCadence(opEvents);

  const { ordersPerHour, avgIntervalMin } = computeCadence(opEvents);

  return {
    operatorId:      operator.id,
    operatorName:    operator.name,
    totalOrders:     allOpEvents.length,       // total all events
    activityEvents:  opEvents.length,           // events that count for gap detection
    firstClose:      opEvents[0].timestamp,
    lastClose:       opEvents[opEvents.length - 1].timestamp,
    maxGap,
    gapCount:        gaps.length,
    gaps,
    events:          allOpEvents,
    status:          deriveStatus(gaps, maxGap, thresholdMinutes),
    ordersPerHour,
    avgIntervalMin,
  };
}

/**
 * Compute per-operator summaries for ALL operators (used by Dashboard / heatmap).
 * @param {string[]} [activityCategories] - categories that count as activity.
 */
export function computeOperatorSummaries(operators, events, date, startTime, endTime, thresholdMinutes, activityCategories) {
  return operators.map((op) =>
    computeOperatorSummary(op, events, date, startTime, endTime, thresholdMinutes, activityCategories)
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────

/**
 * Build heatmap data: for each operator, compute activity per 15-min slot.
 */
export function buildHeatmapData(operators, events, date, startTime, endTime) {
  const { shiftStart, shiftEnd } = buildShiftWindow(date, startTime, endTime);
  const slotMs = 15 * 60000;
  const totalSlots = Math.ceil((shiftEnd.getTime() - shiftStart.getTime()) / slotMs);

  const slots = Array.from({ length: totalSlots }, (_, i) => {
    const slotStart = new Date(shiftStart.getTime() + i * slotMs);
    return slotStart.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  });

  const rows = operators.map((op) => {
    const counts = new Array(totalSlots).fill(0);
    events
      .filter((e) => e.operator_id === op.id)
      .forEach((e) => {
        const ts = new Date(e.timestamp);
        if (ts >= shiftStart && ts < shiftEnd) {
          const idx = Math.floor((ts.getTime() - shiftStart.getTime()) / slotMs);
          if (idx >= 0 && idx < totalSlots) counts[idx]++;
        }
      });
    return { operatorId: op.id, operatorName: op.name, counts };
  });

  return { slots, rows };
}

// ─── Anomaly detection ────────────────────────────────────────────────────────

/**
 * Detect data quality and operational anomalies from a set of events.
 *
 * @param {Array} operators  - List of operator objects { id, name }
 * @param {Array} events     - Raw events for the period (any date range)
 * @param {object} [shiftWindow] - Optional { date, startTime, endTime } for out-of-shift check
 * @returns {Array<{ id, type, severity, title, description, relatedIds }>}
 */
export function detectAnomalies(operators, events, shiftWindow) {
  const anomalies = [];
  const opMap = Object.fromEntries(operators.map((o) => [o.id, o.name]));

  // 1. Duplicate order_id (same order closed ≥2 times)
  const orderMap = {};
  events.forEach((ev) => {
    if (!ev.order_id) return;
    if (!orderMap[ev.order_id]) orderMap[ev.order_id] = [];
    orderMap[ev.order_id].push(ev);
  });
  Object.entries(orderMap).forEach(([orderId, evs]) => {
    if (evs.length >= 2) {
      const ops = [...new Set(evs.map((e) => opMap[e.operator_id] || e.operator_id))];
      anomalies.push({
        id:          `dup-${orderId}`,
        type:        "duplicate_order",
        severity:    "error",
        title:       `Pedido duplicado: ${orderId}`,
        description: `El pedido ${orderId} aparece ${evs.length} veces (operarios: ${ops.join(", ")})`,
        relatedIds:  evs.map((e) => e.id),
      });
    }
  });

  // 2. Shared device (same pda_id used by ≥2 different operators in the period)
  const deviceMap = {};
  events.forEach((ev) => {
    if (!ev.pda_id) return;
    if (!deviceMap[ev.pda_id]) deviceMap[ev.pda_id] = new Set();
    deviceMap[ev.pda_id].add(ev.operator_id);
  });
  Object.entries(deviceMap).forEach(([deviceId, opIds]) => {
    if (opIds.size >= 2) {
      const names = [...opIds].map((id) => opMap[id] || id);
      anomalies.push({
        id:          `shared-${deviceId}`,
        type:        "shared_device",
        severity:    "warning",
        title:       `PDA compartida: ${deviceId}`,
        description: `La PDA ${deviceId} ha sido usada por ${names.join(", ")} en el mismo período`,
        relatedIds:  [...opIds],
      });
    }
  });

  // 3. Unusually high speed (avgIntervalMin < 2 min — possible PDA error)
  const opEventMap = {};
  events.forEach((ev) => {
    if (!opEventMap[ev.operator_id]) opEventMap[ev.operator_id] = [];
    opEventMap[ev.operator_id].push({ ...ev, _ts: new Date(ev.timestamp) });
  });
  Object.entries(opEventMap).forEach(([opId, opEvs]) => {
    if (opEvs.length < 3) return;
    opEvs.sort((a, b) => a._ts - b._ts);
    const { avgIntervalMin } = computeCadence(opEvs);
    if (avgIntervalMin !== null && avgIntervalMin < 2) {
      anomalies.push({
        id:          `speed-${opId}`,
        type:        "high_speed",
        severity:    "warning",
        title:       `Velocidad anómala: ${opMap[opId] || opId}`,
        description: `Intervalo medio de ${avgIntervalMin} min/pedido (< 2 min — posible error de PDA)`,
        relatedIds:  [opId],
      });
    }
  });

  // 4. Events outside shift window (if provided)
  if (shiftWindow) {
    const { shiftStart, shiftEnd } = buildShiftWindow(
      shiftWindow.date,
      shiftWindow.startTime,
      shiftWindow.endTime
    );
    const outsideEvents = events.filter((ev) => {
      const ts = new Date(ev.timestamp);
      return ts < shiftStart || ts > shiftEnd;
    });
    if (outsideEvents.length > 0) {
      anomalies.push({
        id:          "out-of-shift",
        type:        "out_of_shift",
        severity:    "warning",
        title:       `${outsideEvents.length} evento(s) fuera del turno`,
        description: `Se detectaron eventos fuera de la ventana horaria ${shiftWindow.startTime}–${shiftWindow.endTime}`,
        relatedIds:  outsideEvents.map((e) => e.id),
      });
    }
  }

  // Sort: errors first, then warnings
  anomalies.sort((a, b) => (a.severity === "error" ? -1 : 1) - (b.severity === "error" ? -1 : 1));
  return anomalies;
}