"use client";

import { useState } from "react";
import { Clock, ExternalLink } from "lucide-react";
import { Materia } from "@/types";

type Tab = "contenido" | "actividades" | "programa" | "avisos";
const TAB_LABELS: Record<Tab, string> = {
  contenido: "Contenido",
  actividades: "Actividades",
  programa: "Programa",
  avisos: "Avisos",
};

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtFechaHora(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function getTagColor(carrera: string) {
  return carrera === "TSCDIA"
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border border-rose-500/20";
}

export default function MateriaCard({ materia, color }: { materia: Materia; color: string }) {
  const [tab, setTab] = useState<Tab>("contenido");

  const accentBorder =
    color === "red" ? "border-rose-500 text-rose-400" : "border-emerald-500 text-emerald-400";
  const accentDot = color === "red" ? "bg-rose-500 shadow-rose-500/50" : "bg-emerald-500 shadow-emerald-500/50";
  const pendientes = materia.tareas.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800/60">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`w-2.5 h-2.5 rounded-full shadow-lg mt-1.5 flex-shrink-0 ${accentDot}`} />
            <div>
              <h2 className="text-lg font-semibold text-white leading-tight">{materia.nombre}</h2>
              <p className="text-indigo-300/70 text-sm mt-1 flex items-center gap-1.5">
                <Clock size={13} className="opacity-60" />
                {materia.horario} · Com. {materia.comision}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${getTagColor(materia.carrera)}`}>
              {materia.carrera}
            </span>
            {materia.url_campus && (
              <a href={materia.url_campus} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-300 transition-colors">
                <ExternalLink size={13} />
                Campus
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 px-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all relative ${
              tab === t ? accentBorder : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "actividades" && pendientes > 0 && (
              <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-px font-semibold">
                {pendientes}
              </span>
            )}
            {t === "avisos" && materia.avisos.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/25 rounded-full px-1.5 py-px font-semibold">
                {materia.avisos.length}
              </span>
            )}
            {tab === t && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-current rounded-t-full opacity-60" />
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO ── */}
      {tab === "contenido" && (
        <div className="p-6">
          {materia.unidades.length === 0 ? (
            <EmptyState msg="El contenido aún no está publicado en el campus." />
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-4">
                {materia.unidades.length} unidades
              </p>
              {materia.unidades.map((u, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800/40">
                  <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-500 text-[11px] flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-snug">{u.nombre}</p>
                    {u.descripcion && (
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{u.descripcion}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ACTIVIDADES ── */}
      {tab === "actividades" && (
        <div className="p-6">
          {materia.tareas.length === 0 ? (
            <EmptyState msg="Sin actividades publicadas por el momento." />
          ) : (
            <div className="space-y-3">
              {materia.tareas.map((t, i) => {
                const dias = t.fecha_entrega ? daysUntil(t.fecha_entrega) : null;
                const fechaFmt = t.fecha_entrega ? fmtFecha(t.fecha_entrega) : null;
                const urgent = dias !== null && dias >= 0 && dias <= 7;
                const vencida = dias !== null && dias < 0;

                return (
                  <div key={i} className="rounded-xl bg-slate-900/60 border border-slate-800/40 overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-slate-200 leading-snug">{t.nombre}</p>
                        <StatusDot estado={t.estado} />
                      </div>
                      {t.seccion && (
                        <span className="inline-block text-[11px] text-slate-500 bg-slate-800/60 px-2 py-px rounded-full mb-2">
                          {t.seccion}
                        </span>
                      )}
                      {t.descripcion && (
                        <p className="text-xs text-slate-500 leading-relaxed mt-1 mb-3 border-l-2 border-slate-700 pl-3">
                          {t.descripcion}
                        </p>
                      )}
                      {fechaFmt && (
                        <div className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg ${
                          vencida ? "bg-rose-950/40 border border-rose-900/30"
                          : urgent ? "bg-amber-950/40 border border-amber-900/30"
                          : "bg-slate-900 border border-slate-800/60"
                        }`}>
                          <Clock size={13} className={
                            vencida ? "text-rose-500" : urgent ? "text-amber-400" : "text-slate-600"
                          } />
                          <span className={`text-xs font-medium ${
                            vencida ? "text-rose-400" : urgent ? "text-amber-300" : "text-slate-400"
                          }`}>
                            {vencida
                              ? `Vencida el ${fechaFmt}`
                              : dias === 0 ? `Vence hoy · ${fechaFmt}`
                              : dias !== null ? `Vence en ${dias} días · ${fechaFmt}`
                              : `Entrega: ${fechaFmt}`}
                          </span>
                        </div>
                      )}
                      {!fechaFmt && t.estado === "pendiente" && (
                        <p className="text-[11px] text-slate-700 mt-2">Sin fecha asignada aún</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PROGRAMA ── */}
      {tab === "programa" && (
        <div className="p-6">
          {materia.programa ? (
            <pre className="whitespace-pre-wrap text-sm text-slate-400 font-sans leading-relaxed">
              {materia.programa}
            </pre>
          ) : (
            <EmptyState msg="El programa aún no está disponible en el campus." />
          )}
          {materia.criterios && (
            <div className="mt-6 pt-6 border-t border-slate-800/60">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-3">
                Criterios de evaluación
              </p>
              <pre className="whitespace-pre-wrap text-sm text-slate-500 font-sans leading-relaxed">
                {materia.criterios}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── AVISOS ── */}
      {tab === "avisos" && (
        <div className="p-6">
          {materia.avisos.length === 0 ? (
            <EmptyState msg="Sin avisos por el momento." />
          ) : (
            <div className="space-y-3">
              {materia.avisos.map((a, i) => (
                <div key={i} className="p-4 bg-slate-900/60 border border-slate-800/40 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-indigo-300/80">{a.autor}</span>
                    <span className="text-[11px] text-slate-600 font-mono">
                      {fmtFechaHora(a.fecha)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">
                    {a.mensaje}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-6 py-3 border-t border-slate-800/40">
        <p className="text-[10px] text-slate-700">
          Scraped {new Date(materia.ultima_actualizacion).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center h-36 text-slate-700 text-sm">{msg}</div>
  );
}

function StatusDot({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-amber-400",
    entregada: "bg-emerald-500",
    vencida: "bg-rose-500",
  };
  return (
    <span title={estado} className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${map[estado] ?? "bg-slate-600"}`} />
  );
}
