"use client";

import { useState } from "react";
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
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtFechaHora(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function MateriaCard({
  materia,
  color,
}: {
  materia: Materia;
  color: string;
}) {
  const [tab, setTab] = useState<Tab>("contenido");

  const accentBorder = color === "red" ? "border-red-500 text-red-400" : "border-green-500 text-green-400";
  const accentDot    = color === "red" ? "bg-red-500"   : "bg-green-500";
  const pendientes   = materia.tareas.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="bg-[#0e0e1a] border border-violet-900/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-violet-900/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${accentDot}`} />
            <div>
              <h2 className="text-base font-semibold text-white leading-tight">{materia.nombre}</h2>
              <p className="text-xs text-violet-600 mt-1">
                {materia.horario} · Com. {materia.comision}
              </p>
            </div>
          </div>
          {materia.url_campus && (
            <a
              href={materia.url_campus}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-violet-700 hover:text-violet-400 transition-colors flex-shrink-0 flex items-center gap-1"
            >
              Campus
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-violet-900/20 px-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t ? accentBorder : "border-transparent text-violet-700 hover:text-violet-400"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "actividades" && pendientes > 0 && (
              <span className="ml-1.5 text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-1.5 py-px font-semibold">
                {pendientes}
              </span>
            )}
            {t === "avisos" && materia.avisos.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-px font-semibold">
                {materia.avisos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── CONTENIDO ── */}
      {tab === "contenido" && (
        <div className="p-6">
          {materia.unidades.length === 0 ? (
            <EmptyState mensaje="El contenido aún no está publicado en el campus." />
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-violet-700 uppercase tracking-widest mb-4">
                {materia.unidades.length} unidades
              </p>
              {materia.unidades.map((u, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-violet-950/20 border border-violet-900/20">
                  <span className="w-6 h-6 rounded-lg bg-violet-900/40 text-violet-400 text-[11px] flex items-center justify-center flex-shrink-0 font-mono mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-violet-100 leading-snug">{u.nombre}</p>
                    {u.descripcion && (
                      <p className="text-xs text-violet-500 mt-1 leading-relaxed">{u.descripcion}</p>
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
            <EmptyState mensaje="Sin actividades publicadas por el momento." />
          ) : (
            <div className="space-y-3">
              {materia.tareas.map((t, i) => {
                const dias = t.fecha_entrega ? daysUntil(t.fecha_entrega) : null;
                const fechaFmt = t.fecha_entrega ? fmtFecha(t.fecha_entrega) : null;
                const urgent = dias !== null && dias <= 7 && dias >= 0;
                const vencida = dias !== null && dias < 0;

                return (
                  <div
                    key={i}
                    className="rounded-xl bg-violet-950/20 border border-violet-900/20 overflow-hidden"
                  >
                    <div className="p-4">
                      {/* Nombre + estado */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-sm font-medium text-violet-100 leading-snug">{t.nombre}</p>
                        <StatusDot estado={t.estado} />
                      </div>

                      {/* Sección */}
                      {t.seccion && (
                        <span className="inline-block text-[11px] text-violet-600 bg-violet-900/30 px-2 py-px rounded-full mb-2">
                          {t.seccion}
                        </span>
                      )}

                      {/* Descripción */}
                      {t.descripcion && (
                        <p className="text-xs text-violet-400/70 leading-relaxed mt-1 mb-3 border-l-2 border-violet-800/40 pl-3">
                          {t.descripcion}
                        </p>
                      )}

                      {/* Fecha de entrega */}
                      {fechaFmt && (
                        <div
                          className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg ${
                            vencida
                              ? "bg-red-950/40 border border-red-900/30"
                              : urgent
                              ? "bg-amber-950/40 border border-amber-900/30"
                              : "bg-violet-950/30 border border-violet-900/20"
                          }`}
                        >
                          <svg
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              vencida ? "text-red-500" : urgent ? "text-amber-400" : "text-violet-600"
                            }`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span
                            className={`text-xs font-medium ${
                              vencida ? "text-red-400" : urgent ? "text-amber-300" : "text-violet-400"
                            }`}
                          >
                            {vencida
                              ? `Vencida el ${fechaFmt}`
                              : dias === 0
                              ? `Vence hoy · ${fechaFmt}`
                              : dias !== null
                              ? `Vence en ${dias} días · ${fechaFmt}`
                              : `Entrega: ${fechaFmt}`}
                          </span>
                        </div>
                      )}

                      {!fechaFmt && t.estado === "pendiente" && (
                        <p className="text-[11px] text-violet-800 mt-2">Sin fecha asignada aún</p>
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
            <pre className="whitespace-pre-wrap text-sm text-violet-200/70 font-sans leading-relaxed">
              {materia.programa}
            </pre>
          ) : (
            <EmptyState mensaje="El programa aún no está disponible en el campus." />
          )}
          {materia.criterios && (
            <div className="mt-6 pt-6 border-t border-violet-900/20">
              <p className="text-[10px] text-violet-700 uppercase tracking-widest mb-3">
                Criterios de evaluación
              </p>
              <pre className="whitespace-pre-wrap text-sm text-violet-400/60 font-sans leading-relaxed">
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
            <EmptyState mensaje="Sin avisos por el momento." />
          ) : (
            <div className="space-y-3">
              {materia.avisos.map((a, i) => (
                <div
                  key={i}
                  className="p-4 bg-violet-950/20 border border-violet-900/20 rounded-xl"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-violet-300">{a.autor}</span>
                    <span className="text-[11px] text-violet-700 font-mono">
                      {fmtFechaHora(a.fecha)}
                    </span>
                  </div>
                  <p className="text-sm text-violet-300/60 leading-relaxed whitespace-pre-wrap">
                    {a.mensaje}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-3 border-t border-violet-900/15">
        <p className="text-[10px] text-violet-900">
          Scraped {new Date(materia.ultima_actualizacion).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center h-36 text-violet-800 text-sm">
      {mensaje}
    </div>
  );
}

function StatusDot({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-amber-400",
    entregada: "bg-green-500",
    vencida:   "bg-red-500",
  };
  return (
    <span
      title={estado}
      className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${map[estado] ?? "bg-violet-700"}`}
    />
  );
}
