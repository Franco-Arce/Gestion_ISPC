"use client";

import { useState } from "react";
import {
  RefreshCw,
  BookOpen,
  ClipboardList,
  Bell,
  AlertCircle,
  Clock,
} from "lucide-react";
import { ISPCData } from "@/types";
import MateriaCard from "./MateriaCard";
import WeeklyCalendar from "./WeeklyCalendar";
import InicioPanel from "./InicioPanel";

type MainTab = "inicio" | "TSDS" | "TSCDIA";

const CARRERA_LABELS: Record<string, string> = {
  TSDS: "Tecnicatura en Desarrollo de Software",
  TSCDIA: "Tecnicatura en Ciencia de Datos e IA",
};

function getTagColor(carrera: string) {
  return carrera === "TSCDIA"
    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border border-rose-500/20";
}

export default function Dashboard({ data }: { data: ISPCData }) {
  const [mainTab, setMainTab] = useState<MainTab>("inicio");
  const [materiaActiva, setMateriaActiva] = useState<string | null>(null);
  const [spinning, setSpinning] = useState(false);

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

  function handleRefresh() {
    setSpinning(true);
    setTimeout(() => setSpinning(false), 1200);
  }

  const carreraActiva =
    mainTab === "TSDS" || mainTab === "TSCDIA" ? mainTab : null;
  const materiaSeleccionada = materiaActiva
    ? data.materias.find((m) => m.nombre === materiaActiva) ?? null
    : null;

  const tabBadge = (tab: MainTab) => {
    if (tab === "inicio") return avisosHoy || null;
    return pendientesPorCarrera(tab) || null;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-300 font-sans selection:bg-indigo-500/30 p-4 md:p-8">

      {/* ── Header ── */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            IS
          </div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            ISPC
            <span className="text-slate-600">•</span>
            <span className="text-indigo-400">Franco Arce</span>
          </h1>
        </div>

        <div className="flex items-center gap-2 text-slate-400 bg-slate-900/50 px-4 py-2 rounded-full border border-slate-800 text-sm">
          <span>Actualizado {generadoEl}</span>
          <button
            onClick={handleRefresh}
            title="Última actualización del scraper"
            className={`p-1.5 hover:bg-slate-700 rounded-full transition-colors ${
              spinning ? "animate-spin text-indigo-400" : "hover:text-white"
            }`}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      {/* ── Nav tabs ── */}
      <nav className="max-w-7xl mx-auto flex gap-6 border-b border-slate-800 mb-8 overflow-x-auto pb-px">
        {(["inicio", "TSDS", "TSCDIA"] as MainTab[]).map((tab) => {
          const isActive = mainTab === tab;
          const badge = tabBadge(tab);
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`pb-4 px-2 font-medium transition-colors relative whitespace-nowrap flex items-center gap-2 ${
                isActive ? "text-white" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab === "inicio" ? "Inicio" : tab}
              {badge !== null && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {badge}
                </span>
              )}
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full shadow-[0_-2px_8px_rgba(99,102,241,0.5)]" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── Main content ── */}
      <main className="max-w-7xl mx-auto">

        {/* ══ INICIO ══ */}
        {mainTab === "inicio" && (
          <div className="space-y-8">
            <InicioPanel materias={data.materias} onSelectMateria={handleSelectMateria} />
            <WeeklyCalendar />
          </div>
        )}

        {/* ══ CARRERA ══ */}
        {carreraActiva && (
          <div className="space-y-6">
            {/* Header carrera */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {carreraActiva}
                </p>
                <h2 className="text-2xl font-semibold text-white">
                  {CARRERA_LABELS[carreraActiva]}
                </h2>
              </div>
              {materiaActiva && (
                <button
                  onClick={() => setMateriaActiva(null)}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mt-1 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-600"
                >
                  ← Volver
                </button>
              )}
            </div>

            {/* Detalle o grid */}
            {materiaSeleccionada ? (
              <MateriaCard
                materia={materiaSeleccionada}
                color={carreraActiva === "TSDS" ? "red" : "green"}
              />
            ) : (
              <CarreraGrid
                materias={materiasPorCarrera(carreraActiva)}
                carrera={carreraActiva}
                getTagColor={getTagColor}
                onSelect={setMateriaActiva}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

/* ── Career subject grid ── */
function CarreraGrid({
  materias,
  carrera,
  getTagColor,
  onSelect,
}: {
  materias: ReturnType<ISPCData["materias"]["filter"]>;
  carrera: string;
  getTagColor: (c: string) => string;
  onSelect: (nombre: string) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const filtered = filter ? materias.filter((m) => m.nombre === filter) : materias;

  return (
    <div className="space-y-6">
      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
            !filter
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          Todas
        </button>
        {materias.map((m) => (
          <button
            key={m.nombre}
            onClick={() => setFilter(filter === m.nombre ? null : m.nombre)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filter === m.nombre
                ? "bg-indigo-600 border-indigo-500 text-white"
                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => {
          const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
          return (
            <button
              key={m.nombre}
              onClick={() => onSelect(m.nombre)}
              className="group relative flex flex-col text-left bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 hover:bg-slate-800/60 hover:border-slate-700 transition-all overflow-hidden"
            >
              {/* Hover glow top */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Status + badge */}
              <div className="flex justify-between items-start mb-4">
                <span
                  className={`mt-1 w-2.5 h-2.5 rounded-full shadow-lg flex-shrink-0 ${
                    carrera === "TSDS"
                      ? "bg-rose-500 shadow-rose-500/40"
                      : "bg-emerald-500 shadow-emerald-500/40"
                  }`}
                />
                {pendientes > 0 && (
                  <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2.5 py-1 rounded-lg text-xs font-semibold">
                    <AlertCircle size={11} />
                    {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              {/* Name + schedule */}
              <div className="mb-5 flex-1">
                <h3 className="text-base font-medium text-slate-100 leading-snug mb-2 group-hover:text-white transition-colors">
                  {m.nombre}
                </h3>
                <p className="text-indigo-300/70 text-sm flex items-center gap-1.5">
                  <Clock size={13} className="opacity-60" />
                  {m.horario}
                </p>
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800/60 text-sm">
                <div className={`flex items-center gap-1.5 ${m.tareas.length > 0 ? "text-indigo-400" : "text-slate-700"}`}>
                  <ClipboardList size={15} />
                  <span>
                    <strong className={m.tareas.length > 0 ? "text-white" : ""}>{m.tareas.length}</strong>{" "}
                    <span className="text-slate-500">tareas</span>
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 ${m.unidades.length > 0 ? "text-emerald-400" : "text-slate-700 opacity-50"}`}>
                  <BookOpen size={15} />
                  <span>
                    <strong className={m.unidades.length > 0 ? "text-white" : ""}>{m.unidades.length}</strong>{" "}
                    <span className="text-slate-500">unidades</span>
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 ${m.avisos.length > 0 ? "text-amber-500" : "text-slate-700"}`}>
                  <Bell size={15} />
                  <span>
                    <strong className={m.avisos.length > 0 ? "text-white" : ""}>{m.avisos.length}</strong>{" "}
                    <span className="text-slate-500">avisos</span>
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
