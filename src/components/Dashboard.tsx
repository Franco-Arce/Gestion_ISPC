"use client";

import { useState } from "react";
import { ISPCData } from "@/types";
import MateriaCard from "./MateriaCard";
import AvisosPanel from "./AvisosPanel";
import WeeklyCalendar from "./WeeklyCalendar";

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

  const totalAvisos = data.materias.reduce((s, m) => s + m.avisos.length, 0);

  const pendientesPorCarrera = (carrera: string) =>
    materiasPorCarrera(carrera).reduce(
      (s, m) => s + m.tareas.filter((t) => t.estado === "pendiente").length,
      0
    );

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

  const carreraActiva = mainTab === "TSDS" || mainTab === "TSCDIA" ? mainTab : null;
  const materiaSeleccionada = materiaActiva
    ? data.materias.find((m) => m.nombre === materiaActiva) ?? null
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4">
          {/* Top row */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-green-500 flex items-center justify-center text-xs font-bold text-white">
                IS
              </div>
              <div>
                <h1 className="text-sm font-bold text-white leading-none">ISPC Dashboard</h1>
                <p className="text-xs text-gray-500 mt-0.5">Franco Arce · 2026</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-600">Actualizado</p>
              <p className="text-xs text-gray-400 font-mono">{generadoEl}</p>
            </div>
          </div>

          {/* Navigation tabs */}
          <nav className="flex gap-0.5 -mb-px">
            {(["inicio", "TSDS", "TSCDIA"] as MainTab[]).map((tab) => {
              const isActive = mainTab === tab;
              const base = "relative px-5 py-2.5 text-sm font-medium border-b-2 transition-all duration-150";
              const activeStyle =
                tab === "TSDS"
                  ? "border-red-500 text-red-300"
                  : tab === "TSCDIA"
                  ? "border-green-500 text-green-300"
                  : "border-gray-400 text-white";
              const inactiveStyle = "border-transparent text-gray-500 hover:text-gray-300";
              const pending =
                tab === "TSDS" || tab === "TSCDIA" ? pendientesPorCarrera(tab) : 0;

              return (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`${base} ${isActive ? activeStyle : inactiveStyle}`}
                >
                  {tab === "inicio" ? "Inicio" : tab}
                  {tab === "inicio" && totalAvisos > 0 && (
                    <span className="ml-1.5 bg-yellow-500 text-black text-xs rounded-full px-1.5 py-px font-semibold">
                      {totalAvisos}
                    </span>
                  )}
                  {pending > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-px font-semibold">
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
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        {/* ── INICIO ── */}
        {mainTab === "inicio" && (
          <>
            <AvisosPanel materias={data.materias} />

            <WeeklyCalendar />

            {tareasProximas.length > 0 && (
              <section className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h2 className="text-sm font-semibold text-gray-300">Próximas entregas</h2>
                  <span className="text-xs bg-red-900/60 text-red-300 px-2 py-px rounded-full">
                    {tareasProximas.length}
                  </span>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {tareasProximas.map((t, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-20 text-xs font-mono text-red-400 flex-shrink-0">
                        {new Date(t.fecha_entrega!).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                          t.carrera === "TSDS"
                            ? "bg-red-900/60 text-red-300"
                            : "bg-green-900/60 text-green-300"
                        }`}
                      >
                        {t.carrera}
                      </span>
                      <span className="text-xs text-gray-500 flex-shrink-0 hidden sm:block">
                        {t.materia}
                      </span>
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-200 hover:text-white truncate hover:underline"
                      >
                        {t.nombre}
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {tareasProximas.length === 0 && totalAvisos === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm">Todo al día por ahora.</p>
              </div>
            )}
          </>
        )}

        {/* ── TSDS / TSCDIA ── */}
        {carreraActiva && (
          <>
            {/* Career header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{carreraActiva}</p>
                <h2 className="text-base font-semibold text-white">{CARRERA_LABELS[carreraActiva]}</h2>
              </div>
              {materiaActiva && (
                <button
                  onClick={() => setMateriaActiva(null)}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver
                </button>
              )}
            </div>

            {/* Subject pills */}
            <div className="flex flex-wrap gap-2">
              {materiasPorCarrera(carreraActiva).map((m) => {
                const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                const isSelected = materiaActiva === m.nombre;
                const selectedCls =
                  carreraActiva === "TSDS"
                    ? "border-red-500 bg-red-950/60 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                    : "border-green-500 bg-green-950/60 text-green-200 shadow-[0_0_12px_rgba(34,197,94,0.15)]";

                return (
                  <button
                    key={m.nombre}
                    onClick={() => setMateriaActiva(isSelected ? null : m.nombre)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      isSelected
                        ? selectedCls
                        : "border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-500 hover:bg-gray-800"
                    }`}
                  >
                    {m.nombre}
                    {pendientes > 0 && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-px font-semibold">
                        {pendientes}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Detail or grid */}
            {materiaSeleccionada ? (
              <MateriaCard
                materia={materiaSeleccionada}
                color={carreraActiva === "TSDS" ? "red" : "green"}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {materiasPorCarrera(carreraActiva).map((m) => {
                  const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
                  const accentBorder =
                    carreraActiva === "TSDS"
                      ? "hover:border-red-800"
                      : "hover:border-green-800";

                  return (
                    <button
                      key={m.nombre}
                      onClick={() => setMateriaActiva(m.nombre)}
                      className={`text-left bg-gray-900 border border-gray-800 rounded-2xl p-5 transition-all group ${accentBorder} hover:bg-gray-900/80`}
                    >
                      <h3 className="font-semibold text-white mb-1 group-hover:text-white text-sm leading-snug">
                        {m.nombre}
                      </h3>
                      <p className="text-xs text-gray-600 mb-4">
                        {m.horario} · Com. {m.comision}
                      </p>
                      <div className="flex gap-3 text-xs">
                        <span className="text-gray-500">
                          <span className="text-gray-300 font-medium">{m.tareas.length}</span> tareas
                        </span>
                        <span className="text-gray-500">
                          <span className="text-gray-300 font-medium">{m.unidades.length}</span> unidades
                        </span>
                        {pendientes > 0 && (
                          <span className="text-red-400 font-semibold ml-auto">
                            {pendientes} pendiente{pendientes > 1 ? "s" : ""}
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
