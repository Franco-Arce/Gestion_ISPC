"use client";

import { useState, useMemo } from "react";
import { Search, Bell, ClipboardList, X } from "lucide-react";
import { Materia } from "@/types";

type SubTab = "avisos" | "evidencias";

function getTagColor(carrera: string) {
  return carrera === "TSCDIA"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border-rose-500/20";
}

function fmtFechaHora(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function HistorialPanel({ materias }: { materias: Materia[] }) {
  const [subTab, setSubTab] = useState<SubTab>("avisos");
  const [query, setQuery] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // ── Flatten avisos ──
  const allAvisos = useMemo(
    () =>
      materias.flatMap((m) =>
        m.avisos.map((a) => ({ materia: m.nombre, carrera: m.carrera, aviso: a }))
      ).sort((a, b) => new Date(b.aviso.fecha).getTime() - new Date(a.aviso.fecha).getTime()),
    [materias]
  );

  // ── Flatten evidencias/tareas ──
  const allEvidencias = useMemo(
    () =>
      materias.flatMap((m) =>
        m.tareas.map((t) => ({ materia: m.nombre, carrera: m.carrera, tarea: t }))
      ).sort((a, b) => {
        const da = a.tarea.fecha_entrega ? new Date(a.tarea.fecha_entrega).getTime() : Infinity;
        const db = b.tarea.fecha_entrega ? new Date(b.tarea.fecha_entrega).getTime() : Infinity;
        return da - db;
      }),
    [materias]
  );

  const inRange = (isoDate: string | null) => {
    if (!isoDate) return true;
    const d = new Date(isoDate).getTime();
    if (isNaN(d)) return true;
    if (desde && d < new Date(desde).getTime()) return false;
    if (hasta && d > new Date(hasta + "T23:59:59").getTime()) return false;
    return true;
  };

  const q = query.toLowerCase().trim();

  const avisosFiltered = allAvisos.filter(({ materia, aviso }) => {
    if (!inRange(aviso.fecha)) return false;
    if (!q) return true;
    return (
      materia.toLowerCase().includes(q) ||
      aviso.autor.toLowerCase().includes(q) ||
      aviso.mensaje.toLowerCase().includes(q)
    );
  });

  const evidenciasFiltered = allEvidencias.filter(({ materia, tarea }) => {
    if (!inRange(tarea.fecha_entrega)) return false;
    if (!q) return true;
    return (
      materia.toLowerCase().includes(q) ||
      tarea.nombre.toLowerCase().includes(q) ||
      (tarea.seccion ?? "").toLowerCase().includes(q)
    );
  });

  const totalAvisos = allAvisos.length;
  const totalEvidencias = allEvidencias.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Historial</p>
        <h2 className="text-2xl font-semibold text-white">Avisos y evidencias</h2>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por materia, autor, mensaje..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-400 focus:outline-none focus:border-indigo-500/60 transition-colors [color-scheme:dark]"
          />
          <span className="text-slate-600 text-sm flex-shrink-0">→</span>
          <input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="px-3 py-2.5 bg-slate-900/60 border border-slate-800 rounded-xl text-sm text-slate-400 focus:outline-none focus:border-indigo-500/60 transition-colors [color-scheme:dark]"
          />
          {(desde || hasta) && (
            <button
              onClick={() => { setDesde(""); setHasta(""); }}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-slate-800 transition-colors"
              title="Limpiar fechas"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ── Sub-tabs ── */}
      <div className="flex gap-1 bg-slate-900/40 border border-slate-800/60 rounded-xl p-1 w-fit">
        {(["avisos", "evidencias"] as SubTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setSubTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              subTab === t
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t === "avisos" ? <Bell size={14} /> : <ClipboardList size={14} />}
            {t === "avisos" ? "Avisos" : "Evidencias"}
            <span className={`text-[10px] px-1.5 py-px rounded-full font-semibold ${
              subTab === t ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-500"
            }`}>
              {t === "avisos" ? avisosFiltered.length : evidenciasFiltered.length}
            </span>
          </button>
        ))}
      </div>

      {/* ── AVISOS ── */}
      {subTab === "avisos" && (
        <div className="space-y-3">
          {avisosFiltered.length === 0 ? (
            <Empty msg={q || desde || hasta ? "Sin resultados para los filtros aplicados." : "Sin avisos."} />
          ) : (
            avisosFiltered.map(({ materia, carrera, aviso }, i) => (
              <div key={i} className="p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-200">{materia}</span>
                    <span className={`px-2 py-px rounded border text-[10px] font-bold ${getTagColor(carrera)}`}>
                      {carrera}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-600 font-mono flex-shrink-0">
                    {fmtFechaHora(aviso.fecha)}
                  </span>
                </div>
                <p className="text-indigo-300/70 text-xs mb-2">{aviso.autor}</p>
                <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {aviso.mensaje}
                </p>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── EVIDENCIAS ── */}
      {subTab === "evidencias" && (
        <div className="space-y-3">
          {evidenciasFiltered.length === 0 ? (
            <Empty msg={q || desde || hasta ? "Sin resultados para los filtros aplicados." : "Sin evidencias."} />
          ) : (
            evidenciasFiltered.map(({ materia, carrera, tarea }, i) => {
              const dias = tarea.fecha_entrega ? daysUntil(tarea.fecha_entrega) : null;
              const urgent = dias !== null && dias >= 0 && dias <= 7;
              const vencida = dias !== null && dias < 0;

              const estadoColor =
                tarea.estado === "entregada"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : tarea.estado === "vencida"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/20";

              return (
                <div key={i} className="p-5 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-200">{materia}</span>
                      <span className={`px-2 py-px rounded border text-[10px] font-bold ${getTagColor(carrera)}`}>
                        {carrera}
                      </span>
                    </div>
                    <span className={`px-2 py-px rounded border text-[10px] font-bold flex-shrink-0 ${estadoColor}`}>
                      {tarea.estado}
                    </span>
                  </div>

                  <p className="text-slate-200 text-sm font-medium mb-1">{tarea.nombre}</p>

                  {tarea.seccion && (
                    <span className="inline-block text-[11px] text-slate-500 bg-slate-800/60 px-2 py-px rounded-full mb-2">
                      {tarea.seccion}
                    </span>
                  )}

                  {tarea.descripcion && (
                    <p className="text-xs text-slate-500 leading-relaxed mb-3 border-l-2 border-slate-700 pl-3">
                      {tarea.descripcion}
                    </p>
                  )}

                  {tarea.fecha_entrega && (
                    <div className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border mt-1 ${
                      vencida ? "bg-rose-950/40 border-rose-900/30 text-rose-400"
                      : urgent ? "bg-amber-950/40 border-amber-900/30 text-amber-300"
                      : "bg-slate-900 border-slate-800 text-slate-400"
                    }`}>
                      {vencida
                        ? `Vencida el ${fmtFecha(tarea.fecha_entrega)}`
                        : dias === 0 ? `Vence hoy · ${fmtFecha(tarea.fecha_entrega)}`
                        : dias !== null ? `Vence en ${dias} días · ${fmtFecha(tarea.fecha_entrega)}`
                        : `Entrega: ${fmtFecha(tarea.fecha_entrega)}`}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      <p className="text-[10px] text-slate-700 pt-2">
        {totalAvisos} avisos · {totalEvidencias} evidencias en total
      </p>
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-40 rounded-2xl border border-slate-800/60 bg-slate-900/30 text-slate-600 text-sm">
      {msg}
    </div>
  );
}
