"use client";

import { useState } from "react";
import { ISPCData } from "@/types";
import MateriaCard from "./MateriaCard";
import WeeklyCalendar from "./WeeklyCalendar";
import InicioPanel from "./InicioPanel";

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

  const pendientesPorCarrera = (carrera: string) =>
    materiasPorCarrera(carrera).reduce(
      (s, m) => s + m.tareas.filter((t) => t.estado === "pendiente").length,
      0
    );

  const avisosHoy = (() => {
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
    <div className="min-h-screen bg-[#09090f] text-white">

      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[#09090f]/90 backdrop-blur-md border-b border-violet-900/20">
        <div className="max-w-5xl mx-auto px-5">

          {/* Brand */}
          <div className="flex items-center justify-between py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-violet-900 flex items-center justify-center">
                <span className="text-[10px] font-bold text-violet-200">IS</span>
              </div>
              <span className="text-sm font-semibold text-violet-100 tracking-tight">ISPC</span>
              <span className="text-violet-800">·</span>
              <span className="text-sm text-violet-600">Franco Arce</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-violet-800">Actualizado</span>
              <span className="text-[11px] text-violet-600 font-mono">{generadoEl}</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex -mb-px">
            {(["inicio", "TSDS", "TSCDIA"] as MainTab[]).map((tab) => {
              const isActive = mainTab === tab;
              const activeStyle =
                tab === "TSDS"
                  ? "border-red-500 text-red-400"
                  : tab === "TSCDIA"
                  ? "border-green-500 text-green-400"
                  : "border-violet-400 text-violet-200";
              const inactiveStyle = "border-transparent text-violet-700 hover:text-violet-400";
              const pending =
                tab === "TSDS" || tab === "TSCDIA" ? pendientesPorCarrera(tab) : 0;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
                    isActive ? activeStyle : inactiveStyle
                  }`}
                >
                  {tab === "inicio" ? "Inicio" : tab}
                  {tab === "inicio" && avisosHoy > 0 && (
                    <span className="ml-1.5 text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full px-1.5 py-px font-semibold">
                      {avisosHoy}
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="ml-1.5 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-px font-semibold">
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
            <InicioPanel materias={data.materias} onSelectMateria={handleSelectMateria} />
            <WeeklyCalendar />
          </>
        )}

        {/* ══ TSDS / TSCDIA ══ */}
        {carreraActiva && (
          <>
            {/* Carrera header */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-violet-700 uppercase tracking-widest mb-1">
                  {carreraActiva}
                </p>
                <h2 className="text-base font-medium text-violet-100">
                  {CARRERA_LABELS[carreraActiva]}
                </h2>
              </div>
              {materiaActiva && (
                <button
                  onClick={() => setMateriaActiva(null)}
                  className="flex items-center gap-1.5 text-xs text-violet-700 hover:text-violet-400 transition-colors mt-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </button>
              )}
            </div>

            {/* Subject pills (solo si no hay materia activa) */}
            {!materiaActiva && (
              <div className="flex flex-wrap gap-2">
                {materiasPorCarrera(carreraActiva).map((m) => {
                  const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                  const dot = carreraActiva === "TSDS" ? "bg-red-600" : "bg-green-600";
                  return (
                    <button
                      key={m.nombre}
                      onClick={() => setMateriaActiva(m.nombre)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-violet-400 bg-[#0e0e1a] border border-violet-900/25 hover:border-violet-700/40 hover:text-violet-200 transition-all"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                      {m.nombre}
                      {pendientes > 0 && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-px font-semibold">
                          {pendientes}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Materia detail o grid */}
            {materiaSeleccionada ? (
              <MateriaCard
                materia={materiaSeleccionada}
                color={carreraActiva === "TSDS" ? "red" : "green"}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {materiasPorCarrera(carreraActiva).map((m) => {
                  const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                  const hoverBorder =
                    carreraActiva === "TSDS"
                      ? "hover:border-red-900/50"
                      : "hover:border-green-900/50";
                  const dot = carreraActiva === "TSDS" ? "bg-red-600" : "bg-green-600";

                  return (
                    <button
                      key={m.nombre}
                      onClick={() => setMateriaActiva(m.nombre)}
                      className={`text-left bg-[#0e0e1a] border border-violet-900/25 rounded-2xl p-5 transition-all group ${hoverBorder}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <span className={`w-2 h-2 rounded-full mt-0.5 flex-shrink-0 ${dot}`} />
                        {pendientes > 0 && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-full px-2 py-0.5 font-semibold">
                            {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-medium text-violet-100 mb-1 leading-snug group-hover:text-white transition-colors">
                        {m.nombre}
                      </h3>
                      <p className="text-xs text-violet-700 mb-4">{m.horario}</p>
                      <div className="flex gap-4 text-xs">
                        <span className="text-violet-700">
                          <span className="text-violet-400 font-medium">{m.tareas.length}</span> tareas
                        </span>
                        <span className="text-violet-700">
                          <span className="text-violet-400 font-medium">{m.unidades.length}</span> unidades
                        </span>
                        {m.avisos.length > 0 && (
                          <span className="text-violet-700 ml-auto">
                            <span className="text-amber-500 font-medium">{m.avisos.length}</span> avisos
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
