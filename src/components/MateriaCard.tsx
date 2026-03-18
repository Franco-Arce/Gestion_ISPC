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

export default function MateriaCard({
  materia,
  color,
}: {
  materia: Materia;
  color: string;
}) {
  const [tab, setTab] = useState<Tab>("contenido");

  const accentActive =
    color === "red"
      ? "border-red-500 text-red-400"
      : "border-green-500 text-green-400";

  const accentDot = color === "red" ? "bg-red-500" : "bg-green-500";

  const pendientes = materia.tareas.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[#1a1a1a]">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${accentDot}`} />
            <div>
              <h2 className="text-base font-semibold text-white leading-tight">
                {materia.nombre}
              </h2>
              <p className="text-xs text-zinc-600 mt-1">
                {materia.horario} · Com. {materia.comision}
              </p>
            </div>
          </div>
          {materia.url_campus && (
            <a
              href={materia.url_campus}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-zinc-600 hover:text-zinc-300 transition-colors flex-shrink-0 flex items-center gap-1"
            >
              Campus
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a1a1a] px-2">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              tab === t ? accentActive : "border-transparent text-zinc-600 hover:text-zinc-400"
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

      {/* Content */}
      <div className="p-6 min-h-48">

        {/* Contenido */}
        {tab === "contenido" && (
          <div>
            {materia.unidades.length === 0 ? (
              <EmptyState mensaje="El contenido aún no está publicado en el campus." />
            ) : (
              <div className="space-y-1.5">
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-3">
                  {materia.unidades.length} unidades
                </p>
                {materia.unidades.map((u, i) => (
                  <a
                    key={i}
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#161616] hover:bg-[#1c1c1c] transition-colors group"
                  >
                    <span className="w-5 h-5 rounded-lg bg-[#222] text-zinc-600 text-xs flex items-center justify-center flex-shrink-0 font-mono">
                      {i + 1}
                    </span>
                    <span className="text-sm text-zinc-400 group-hover:text-zinc-200 transition-colors">
                      {u.nombre}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actividades */}
        {tab === "actividades" && (
          <div>
            {materia.tareas.length === 0 ? (
              <EmptyState mensaje="Sin actividades publicadas por el momento." />
            ) : (
              <div className="space-y-2">
                {materia.tareas.map((t, i) => (
                  <div key={i} className="rounded-xl bg-[#161616] overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <a
                          href={t.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-zinc-200 hover:text-white transition-colors"
                        >
                          {t.nombre}
                        </a>
                        <StatusDot estado={t.estado} />
                      </div>
                      {t.seccion && (
                        <span className="text-[11px] text-zinc-600 bg-[#222] px-2 py-0.5 rounded-full">
                          {t.seccion}
                        </span>
                      )}
                      {t.descripcion && (
                        <p className="text-xs text-zinc-600 mt-2 leading-relaxed line-clamp-2">
                          {t.descripcion}
                        </p>
                      )}
                      {t.fecha_entrega && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-red-400 font-medium">
                            {(() => {
                              const d = new Date(t.fecha_entrega);
                              return isNaN(d.getTime())
                                ? t.fecha_entrega
                                : d.toLocaleDateString("es-AR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  });
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Programa */}
        {tab === "programa" && (
          <div>
            {materia.programa ? (
              <pre className="whitespace-pre-wrap text-sm text-zinc-400 font-sans leading-relaxed">
                {materia.programa}
              </pre>
            ) : (
              <EmptyState mensaje="El programa aún no está disponible en el campus." />
            )}
            {materia.criterios && (
              <div className="mt-5 pt-5 border-t border-[#1a1a1a]">
                <p className="text-[10px] text-zinc-700 uppercase tracking-widest mb-3">
                  Criterios de evaluación
                </p>
                <pre className="whitespace-pre-wrap text-sm text-zinc-500 font-sans leading-relaxed">
                  {materia.criterios}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Avisos */}
        {tab === "avisos" && (
          <div>
            {materia.avisos.length === 0 ? (
              <EmptyState mensaje="Sin avisos por el momento." />
            ) : (
              <div className="space-y-2">
                {materia.avisos.map((a, i) => {
                  const fecha = (() => {
                    const d = new Date(a.fecha);
                    return isNaN(d.getTime())
                      ? a.fecha
                      : d.toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                  })();

                  return (
                    <div key={i} className="p-4 bg-[#161616] border border-[#222] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-zinc-300">{a.autor}</span>
                        <span className="text-[11px] text-zinc-700 font-mono">{fecha}</span>
                      </div>
                      <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-wrap">
                        {a.mensaje}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#1a1a1a]">
        <p className="text-[11px] text-zinc-800">
          Scraped {new Date(materia.ultima_actualizacion).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center h-36 text-zinc-700 text-sm">
      {mensaje}
    </div>
  );
}

function StatusDot({ estado }: { estado: string }) {
  const colors: Record<string, string> = {
    pendiente: "bg-amber-400",
    entregada: "bg-green-500",
    vencida: "bg-red-500",
  };
  return (
    <span
      title={estado}
      className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${colors[estado] ?? "bg-zinc-600"}`}
    />
  );
}
