"use client";

import { useState } from "react";
import { ISPCData } from "@/types";
import MateriaCard from "./MateriaCard";
import WeeklyCalendar from "./WeeklyCalendar";
import ResumenHoy from "./ResumenHoy";

type MainTab = "inicio" | "TSDS" | "TSCDIA";

const CARRERA_LABELS: Record<string, string> = {
  TSDS: "Tecnicatura en Desarrollo de Software",
  TSCDIA: "Tecnicatura en Ciencia de Datos e IA",
};

export default function Dashboard({ data }: { data: ISPCData }) {
  const [mainTab, setMainTab] = useState<MainTab>("inicio");
  const [materiaActiva, setMateriaActiva] = useState<string | null>(null);

  const materiasPorCarrera = (carrera: string) =>
    data.materias.filter((m) => m.carrera === carrera);

  const tareasProximas = data.materias
    .flatMap((m) =>
      m.tareas
        .filter((t) => t.estado === "pendiente" && t.fecha_entrega)
        .map((t) => ({ ...t, materia: m.nombre, carrera: m.carrera }))
    )
    .filter((t) => !isNaN(new Date(t.fecha_entrega!).getTime()))
    .sort((a, b) => new Date(a.fecha_entrega!).getTime() - new Date(b.fecha_entrega!).getTime())
    .slice(0, 5);

  const pendientesPorCarrera = (carrera: string) =>
    materiasPorCarrera(carrera).reduce(
      (s, m) => s + m.tareas.filter((t) => t.estado === "pendiente").length,
      0
    );

  const totalAvisosHoy = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return data.materias.reduce(
      (s, m) => s + m.avisos.filter((a) => a.fecha.startsWith(today)).length,
      0
    );
  })();

  const generadoEl = new Date(data.generado_el).toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  function handleTabChange(tab: MainTab) {
    setMainTab(tab);
    setMateriaActiva(null);
  }

  function handleSelectMateria(nombre: string, carrera: "TSDS" | "TSCDIA") {
    setMainTab(carrera);
    setMateriaActiva(nombre);
  }

  const carreraActiva = mainTab === "TSDS" || mainTab === "TSCDIA" ? mainTab : null;
  const materiaSeleccionada = materiaActiva
    ? data.materias.find((m) => m.nombre === materiaActiva) ?? null
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5">
          {/* Brand row */}
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 via-zinc-700 to-green-500 opacity-90" />
              <span className="text-sm font-semibold text-white tracking-tight">ISPC</span>
              <span className="text-zinc-700 text-sm">·</span>
              <span className="text-sm text-zinc-500">Franco Arce</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-zinc-700">Actualizado</span>
              <span className="text-[11px] text-zinc-500 font-mono">{generadoEl}</span>
            </div>
          </div>

          {/* Nav tabs */}
          <nav className="flex -mb-px">
            {(["inicio", "TSDS", "TSCDIA"] as MainTab[]).map((tab) => {
              const isActive = mainTab === tab;
              const activeColor =
                tab === "TSDS"
                  ? "border-red-500 text-red-400"
                  : tab === "TSCDIA"
                  ? "border-green-500 text-green-400"
                  : "border-zinc-400 text-zinc-100";
              const inactiveColor =
                "border-transparent text-zinc-600 hover:text-zinc-400";

              const pending =
                tab === "TSDS" || tab === "TSCDIA" ? pendientesPorCarrera(tab) : 0;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all duration-150 ${
                    isActive ? activeColor : inactiveColor
                  }`}
                >
                  {tab === "inicio" ? "Inicio" : tab}
                  {tab === "inicio" && totalAvisosHoy > 0 && (
                    <span className="ml-1.5 text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-1.5 py-px font-semibold">
                      {totalAvisosHoy}
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="ml-1.5 text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-1.5 py-px font-semibold">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-5xl mx-auto px-5 py-7 space-y-5">

        {/* ══ INICIO ══ */}
        {mainTab === "inicio" && (
          <>
            {/* Resumen de actividad del día */}
            <ResumenHoy materias={data.materias} onSelectMateria={handleSelectMateria} />

            {/* Calendario */}
            <WeeklyCalendar />

            {/* Próximas entregas */}
            {tareasProximas.length > 0 && (
              <section className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1e1e1e]">
                  <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium">
                    Próximas entregas
                  </p>
                  <span className="text-[11px] bg-zinc-800 text-zinc-500 px-2 py-px rounded-full">
                    {tareasProximas.length}
                  </span>
                </div>
                <div className="divide-y divide-[#1a1a1a]">
                  {tareasProximas.map((t, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-3">
                      <span className="text-xs font-mono text-red-500 w-16 flex-shrink-0">
                        {new Date(t.fecha_entrega!).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          t.carrera === "TSDS"
                            ? "bg-red-950/50 text-red-400"
                            : "bg-green-950/50 text-green-400"
                        }`}
                      >
                        {t.carrera}
                      </span>
                      <span className="text-xs text-zinc-600 hidden sm:block flex-shrink-0">
                        {t.materia}
                      </span>
                      <span className="text-zinc-700 hidden sm:block">·</span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-zinc-300 hover:text-white truncate transition-colors"
                      >
                        {t.nombre}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Estado vacío */}
            {tareasProximas.length === 0 &&
              data.materias.every((m) => m.avisos.length === 0) && (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center mb-5">
                    <svg className="w-6 h-6 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-zinc-600 text-sm">Todo al día</p>
                </div>
              )}
          </>
        )}

        {/* ══ TSDS / TSCDIA ══ */}
        {carreraActiva && (
          <>
            {/* Career header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] text-zinc-600 uppercase tracking-widest mb-1">
                  {carreraActiva}
                </p>
                <h2 className="text-base font-medium text-zinc-200">
                  {CARRERA_LABELS[carreraActiva]}
                </h2>
              </div>
              {materiaActiva && (
                <button
                  onClick={() => setMateriaActiva(null)}
                  className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </button>
              )}
            </div>

            {/* Subject pills */}
            {!materiaActiva && (
              <div className="flex flex-wrap gap-2">
                {materiasPorCarrera(carreraActiva).map((m) => {
                  const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                  return (
                    <button
                      key={m.nombre}
                      onClick={() => setMateriaActiva(m.nombre)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-zinc-400 bg-[#111] border border-[#222] hover:border-[#333] hover:text-zinc-200 transition-all"
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          carreraActiva === "TSDS" ? "bg-red-600" : "bg-green-600"
                        }`}
                      />
                      {m.nombre}
                      {pendientes > 0 && (
                        <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-1.5 py-px font-semibold">
                          {pendientes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Materia detail or grid */}
            {materiaSeleccionada ? (
              <MateriaCard
                materia={materiaSeleccionada}
                color={carreraActiva === "TSDS" ? "red" : "green"}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materiasPorCarrera(carreraActiva).map((m) => {
                  const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                  const accentHover =
                    carreraActiva === "TSDS"
                      ? "hover:border-red-900/50"
                      : "hover:border-green-900/50";

                  return (
                    <button
                      key={m.nombre}
                      onClick={() => setMateriaActiva(m.nombre)}
                      className={`text-left bg-[#111] border border-[#1e1e1e] rounded-2xl p-5 transition-all group ${accentHover}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span
                          className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                            carreraActiva === "TSDS" ? "bg-red-600" : "bg-green-600"
                          }`}
                        />
                        {pendientes > 0 && (
                          <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 rounded-full px-2 py-0.5 font-semibold">
                            {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-zinc-200 mb-1 leading-snug group-hover:text-white transition-colors">
                        {m.nombre}
                      </h3>
                      <p className="text-xs text-zinc-700 mb-4">
                        {m.horario}
                      </p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-zinc-600">
                          <span className="text-zinc-400 font-medium">{m.tareas.length}</span>{" "}
                          tareas
                        </span>
                        <span className="text-zinc-600">
                          <span className="text-zinc-400 font-medium">{m.unidades.length}</span>{" "}
                          unidades
                        </span>
                        {m.avisos.length > 0 && (
                          <span className="text-zinc-600 ml-auto">
                            <span className="text-amber-500 font-medium">{m.avisos.length}</span>{" "}
                            avisos
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
