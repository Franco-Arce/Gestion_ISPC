"use client";

import { useState } from "react";
import { ISPCData, Materia } from "@/types";
import MateriaCard from "./MateriaCard";
import AvisosPanel from "./AvisosPanel";

const CARRERAS = ["TSDS", "TSCDIA"] as const;

const CARRERA_LABELS: Record<string, string> = {
  TSDS: "Tecnicatura en Desarrollo de Software",
  TSCDIA: "Tecnicatura en Ciencia de Datos e IA",
};

const CARRERA_COLORS: Record<string, string> = {
  TSDS: "blue",
  TSCDIA: "violet",
};

export default function Dashboard({ data }: { data: ISPCData }) {
  const [carreraActiva, setCarreraActiva] = useState<"TSDS" | "TSCDIA">("TSDS");
  const [materiaActiva, setMateriaActiva] = useState<string | null>(null);

  const materiasPorCarrera = (carrera: string) =>
    data.materias.filter((m) => m.carrera === carrera);

  const tareasProximas = data.materias
    .flatMap((m) =>
      m.tareas
        .filter((t) => t.estado === "pendiente")
        .map((t) => ({ ...t, materia: m.nombre, carrera: m.carrera }))
    )
    .filter((t) => t.fecha_entrega)
    .sort((a, b) =>
      new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime()
    )
    .slice(0, 5);

  const generadoEl = new Date(data.generado_el).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const materiaSeleccionada =
    materiaActiva
      ? data.materias.find((m) => m.nombre === materiaActiva) ?? null
      : null;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">ISPC Dashboard</h1>
            <p className="text-sm text-gray-400">Franco Arce · 2026</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Última actualización</p>
            <p className="text-xs text-gray-400">{generadoEl}</p>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* Panel de notificaciones */}
        <AvisosPanel materias={data.materias} />

        {/* Próximas entregas */}
        {tareasProximas.length > 0 && (
          <section className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Próximas entregas
            </h2>
            <div className="space-y-2">
              {tareasProximas.map((t, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="w-24 text-red-400 font-mono text-xs">
                    {t.fecha_entrega
                      ? new Date(t.fecha_entrega).toLocaleDateString("es-AR")
                      : "—"}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.carrera === "TSDS"
                      ? "bg-blue-900 text-blue-300"
                      : "bg-violet-900 text-violet-300"
                  }`}>
                    {t.carrera}
                  </span>
                  <span className="text-gray-300">{t.materia}</span>
                  <span className="text-gray-500">·</span>
                  <a href={t.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400 hover:underline truncate">
                    {t.nombre}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Tabs de carrera */}
        <div className="flex gap-2">
          {CARRERAS.map((c) => (
            <button
              key={c}
              onClick={() => { setCarreraActiva(c); setMateriaActiva(null); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                carreraActiva === c
                  ? c === "TSDS"
                    ? "bg-blue-600 text-white"
                    : "bg-violet-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {c}
              <span className="ml-2 text-xs opacity-70">
                ({materiasPorCarrera(c).length})
              </span>
            </button>
          ))}
        </div>

        <p className="text-sm text-gray-500 -mt-2">{CARRERA_LABELS[carreraActiva]}</p>

        {/* Tabs de materias */}
        <div className="flex flex-wrap gap-2">
          {materiasPorCarrera(carreraActiva).map((m) => {
            const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
            return (
              <button
                key={m.nombre}
                onClick={() => setMateriaActiva(materiaActiva === m.nombre ? null : m.nombre)}
                className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                  materiaActiva === m.nombre
                    ? carreraActiva === "TSDS"
                      ? "border-blue-500 bg-blue-950 text-blue-200"
                      : "border-violet-500 bg-violet-950 text-violet-200"
                    : "border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500"
                }`}
              >
                {m.nombre}
                {pendientes > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                    {pendientes}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detalle de materia seleccionada */}
        {materiaSeleccionada ? (
          <MateriaCard materia={materiaSeleccionada} color={CARRERA_COLORS[carreraActiva]} />
        ) : (
          /* Grid resumen de todas las materias de la carrera */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materiasPorCarrera(carreraActiva).map((m) => (
              <button
                key={m.nombre}
                onClick={() => setMateriaActiva(m.nombre)}
                className="text-left bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-all"
              >
                <h3 className="font-semibold text-white mb-1">{m.nombre}</h3>
                <p className="text-xs text-gray-500 mb-3">{m.horario} · Com. {m.comision}</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-400">
                    <span className="text-white font-medium">{m.tareas.length}</span> tareas
                  </span>
                  <span className="text-gray-400">
                    <span className="text-white font-medium">{m.materiales.length}</span> materiales
                  </span>
                  {m.tareas.filter((t) => t.estado === "pendiente").length > 0 && (
                    <span className="text-red-400 font-medium">
                      {m.tareas.filter((t) => t.estado === "pendiente").length} pendientes
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
