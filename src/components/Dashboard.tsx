"use client";

import { useState } from "react";
import {
  RefreshCw, BookOpen, ClipboardList, Bell,
  AlertCircle, Clock, CheckCircle2, Filter,
} from "lucide-react";
import { ISPCData } from "@/types";
import MateriaCard from "./MateriaCard";
import WeeklyCalendar from "./WeeklyCalendar";
import InicioPanel from "./InicioPanel";
import HistorialPanel from "./HistorialPanel";

type MainTab = "inicio" | "calendario" | "historial" | "TSDS" | "TSCDIA";

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

  const materias = data.materias.filter(
    (m, i, arr) => arr.findIndex((x) => x.nombre === m.nombre && x.carrera === m.carrera) === i
  );

  const materiasPorCarrera = (carrera: string) =>
    materias.filter((m) => m.carrera === carrera);

  const pendientesPorCarrera = (carrera: string) =>
    materiasPorCarrera(carrera).reduce(
      (s, m) => s + m.tareas.filter((t) => t.estado === "pendiente").length,
      0
    );

  const avisosHoy = (() => {
    const today = new Date().toISOString().slice(0, 10);
    return materias.reduce(
      (s, m) => s + m.avisos.filter((a) => a.fecha.startsWith(today)).length,
      0
    );
  })();

  const generadoEl = new Date(data.generado_el).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
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

  const carreraActiva = mainTab === "TSDS" || mainTab === "TSCDIA" ? mainTab : null;
  const materiaSeleccionada = materiaActiva
    ? materias.find((m) => m.nombre === materiaActiva) ?? null
    : null;

  const tabBadge = (tab: MainTab): number | null => {
    if (tab === "inicio") return avisosHoy || null;
    if (tab === "calendario" || tab === "historial") return null;
    return pendientesPorCarrera(tab) || null;
  };

  const NAV_TABS: { key: MainTab; label: string }[] = [
    { key: "inicio",     label: "Inicio"     },
    { key: "calendario", label: "Calendario" },
    { key: "historial",  label: "Historial"  },
    { key: "TSDS",       label: "TSDS"       },
    { key: "TSCDIA",     label: "TSCDIA"     },
  ];

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-300 font-sans selection:bg-indigo-500/30">

      {/* ── Ambient background ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-violet-600/4 rounded-full blur-[100px]" />
      </div>

      {/* ── Floating glassmorphism nav ── */}
      <div className="sticky top-0 z-50 flex justify-center pt-5 px-4 mb-10">
        <nav className="bg-[#0a0c12]/80 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl flex items-center gap-1 shadow-2xl shadow-black/50 max-w-full overflow-x-auto">

          {/* Logo */}
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-xs flex-shrink-0 mr-2 shadow-lg shadow-indigo-500/30">
            IS
          </div>

          {NAV_TABS.map(({ key, label }) => {
            const isActive = mainTab === key;
            const badge = tabBadge(key);
            return (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                {label}
                {badge !== null && (
                  <span className={`text-[10px] px-1.5 py-px rounded-full font-bold leading-none ${
                    isActive ? "bg-indigo-500 text-white" : "bg-slate-700 text-slate-400"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

          <button
            onClick={handleRefresh}
            title={`Actualizado ${generadoEl}`}
            className={`flex-shrink-0 p-2 rounded-xl hover:bg-white/10 text-slate-500 hover:text-white transition-all ${
              spinning ? "animate-spin text-indigo-400" : ""
            }`}
          >
            <RefreshCw size={15} />
          </button>
        </nav>
      </div>

      {/* ── Main content ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pb-16">

        {mainTab === "inicio" && (
          <InicioPanel
            materias={materias}
            onSelectMateria={handleSelectMateria}
            onVerHistorial={() => handleTabChange("historial")}
          />
        )}

        {mainTab === "calendario" && <WeeklyCalendar />}

        {mainTab === "historial" && <HistorialPanel materias={materias} />}

        {carreraActiva && (
          <div className="space-y-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                  {carreraActiva}
                </p>
                <h2 className="text-2xl font-bold text-white">
                  {CARRERA_LABELS[carreraActiva]}
                </h2>
              </div>
              {materiaActiva && (
                <button
                  onClick={() => setMateriaActiva(null)}
                  className="text-sm text-slate-500 hover:text-white px-4 py-2 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  ← Volver
                </button>
              )}
            </div>

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
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <div className="p-2 bg-slate-900/60 border border-white/5 rounded-xl text-slate-500 flex-shrink-0">
          <Filter size={16} />
        </div>
        <button
          onClick={() => setFilter(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            !filter
              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
              : "bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
        >
          Todas
        </button>
        {materias.map((m) => (
          <button
            key={m.nombre}
            title={m.nombre}
            onClick={() => setFilter(filter === m.nombre ? null : m.nombre)}
            className={`flex-shrink-0 max-w-[160px] truncate px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              filter === m.nombre
                ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                : "bg-slate-900/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {m.nombre}
          </button>
        ))}
      </div>

      {/* Glass cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((m) => {
          const pendientes = m.tareas.filter((t) => t.estado === "pendiente").length;
          const isCancelled = m.avisos[0]?.mensaje?.toLowerCase().includes("cancelad") ?? false;
          return (
            <button
              key={m.nombre}
              onClick={() => onSelect(m.nombre)}
              className="group relative flex flex-col text-left bg-slate-900/40 border border-white/5 rounded-3xl p-6 hover:bg-slate-800/50 hover:border-indigo-500/25 transition-all overflow-hidden"
            >
              {/* Hover glow */}
              <div className="absolute -inset-12 bg-gradient-to-br from-indigo-500/0 via-indigo-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500 pointer-events-none" />

              {/* Status + pending badge */}
              <div className="flex justify-between items-start mb-5 relative z-10">
                <div className={`p-2 rounded-xl ${
                  isCancelled
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-emerald-500/10 text-emerald-400"
                }`}>
                  {isCancelled ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                </div>
                {pendientes > 0 && (
                  <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg shadow-amber-500/20">
                    {pendientes} pendiente{pendientes > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Name + schedule */}
              <div className="mb-6 flex-1 relative z-10">
                <h3 className="text-lg font-bold text-white leading-snug mb-2 group-hover:text-indigo-300 transition-colors">
                  {m.nombre}
                </h3>
                <p className="text-slate-500 text-sm flex items-center gap-1.5">
                  <Clock size={13} /> {m.horario}
                </p>
              </div>

              {/* Stats pills */}
              <div className="flex flex-wrap gap-2 relative z-10">
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  m.tareas.length > 0 ? "bg-indigo-500/10 text-indigo-300" : "bg-white/5 text-slate-600"
                }`}>
                  <ClipboardList size={12} /> {m.tareas.length} tareas
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  m.unidades.length > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-white/5 text-slate-600"
                }`}>
                  <BookOpen size={12} /> {m.unidades.length} unid.
                </span>
                <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${
                  m.avisos.length > 0 ? "bg-amber-500/10 text-amber-300" : "bg-white/5 text-slate-600"
                }`}>
                  <Bell size={12} /> {m.avisos.length} avisos
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
