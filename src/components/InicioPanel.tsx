"use client";

import { Clock, FileText, ChevronRight, Video, Bell, ClipboardList, Calendar, AlertCircle } from "lucide-react";
import { Materia } from "@/types";
import { SCHEDULE, DOW_TO_DIA, toMin } from "@/lib/schedule";

function getTagColor(carrera: string) {
  return carrera === "TSCDIA"
    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
    : "bg-rose-500/10 text-rose-400 border-rose-500/20";
}

function fmtFecha(iso: string) {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? null
    : d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function InicioPanel({
  materias,
  onSelectMateria,
  onVerHistorial,
}: {
  materias: Materia[];
  onSelectMateria: (nombre: string, carrera: "TSDS" | "TSCDIA") => void;
  onVerHistorial: () => void;
}) {
  const todayDia = DOW_TO_DIA[new Date().getDay()];

  const clasesHoy = todayDia
    ? SCHEDULE.filter((e) => e.dia === todayDia)
        .sort((a, b) => toMin(a.inicio) - toMin(b.inicio))
        .filter((e, i, arr) => arr.findIndex((x) => x.nombre === e.nombre) === i)
    : [];

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Stats
  const today = new Date().toISOString().slice(0, 10);
  const totalPendientes = materias.reduce(
    (s, m) => s + m.tareas.filter((t) => t.estado === "pendiente").length,
    0
  );
  const avisosHoy = materias.reduce(
    (s, m) => s + m.avisos.filter((a) => a.fecha.startsWith(today)).length,
    0
  );

  // Para revisar
  const paraRevisar = materias
    .map((m) => {
      const aviso = m.avisos[0] ?? null;
      const evidencia =
        m.tareas
          .filter((t) => t.estado === "pendiente")
          .sort((a, b) => {
            const da = a.fecha_entrega ? new Date(a.fecha_entrega).getTime() : Infinity;
            const db = b.fecha_entrega ? new Date(b.fecha_entrega).getTime() : Infinity;
            return da - db;
          })[0] ?? null;
      return { m, aviso, evidencia };
    })
    .filter(({ aviso, evidencia }) => aviso || evidencia);

  return (
    <div className="space-y-8">

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 flex-shrink-0">
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalPendientes}</p>
            <p className="text-xs text-slate-500 font-medium">pendientes</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 flex-shrink-0">
            <Bell size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{avisosHoy}</p>
            <p className="text-xs text-slate-500 font-medium">avisos hoy</p>
          </div>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 flex-shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{clasesHoy.length}</p>
            <p className="text-xs text-slate-500 font-medium">clases hoy</p>
          </div>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

        {/* ── LEFT: Timeline ── */}
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex items-center gap-2 mb-2">
            <Calendar size={14} className="text-indigo-400" />
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {todayDia ? `Clases de hoy · ${todayDia}` : "Sin clases programadas hoy"}
            </p>
          </div>
          <h2 className="text-2xl font-bold text-white capitalize mb-8">{fechaHoy}</h2>

          {clasesHoy.length === 0 ? (
            <div className="flex items-center justify-center h-40 rounded-2xl border border-white/5 bg-slate-900/30 text-slate-600 text-sm">
              No hay clases programadas hoy
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800/50 ml-5 space-y-8 pb-4">
              {clasesHoy.map((clase, i) => {
                const materia = materias.find((m) => m.nombre === clase.nombre);
                const aviso = materia?.avisos[0] ?? null;
                const isCancelled = aviso?.mensaje?.toLowerCase().includes("cancelad") ?? false;

                return (
                  <div key={i} className="relative pl-8">
                    {/* Glow dot */}
                    <div className={`absolute -left-[9px] top-2 w-4 h-4 rounded-full border-4 border-[#06080d] ${
                      !materia
                        ? "bg-slate-600"
                        : isCancelled
                        ? "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]"
                        : "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    }`} />

                    <button
                      onClick={() => materia && onSelectMateria(clase.nombre, clase.carrera)}
                      disabled={!materia}
                      className="w-full text-left group bg-slate-950/50 hover:bg-slate-900/80 border border-white/5 hover:border-white/10 p-5 rounded-2xl transition-all disabled:opacity-50 disabled:cursor-default"
                    >
                      <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors">
                          {clase.nombre}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold tracking-wide ${getTagColor(clase.carrera)}`}>
                            {clase.carrera}
                          </span>
                          <span className="text-slate-400 font-mono text-sm bg-slate-900/80 px-3 py-1 rounded-lg border border-white/5">
                            {clase.inicio}–{clase.fin}
                          </span>
                          {clase.meet && (
                            <a
                              href={clase.meet}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/40 hover:text-white transition-colors text-xs font-semibold"
                            >
                              <Video size={12} /> Unirse
                            </a>
                          )}
                        </div>
                      </div>

                      {aviso ? (
                        <>
                          <p className="text-indigo-400/70 text-sm font-medium mb-2">{aviso.autor}</p>
                          <div className="bg-slate-900/50 p-3 rounded-xl border border-white/5 text-slate-400 text-sm leading-relaxed line-clamp-2">
                            {aviso.mensaje}
                          </div>
                        </>
                      ) : (
                        <p className="text-slate-600 text-sm">
                          {materia ? "Sin avisos publicados" : "Aún no disponible en el campus"}
                        </p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Para revisar ── */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="sticky top-24 bg-slate-900/30 border border-white/5 rounded-3xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={13} className="text-amber-400" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Para revisar
              </p>
            </div>
            <h2 className="text-xl font-semibold text-white mb-6">Avisos y evidencias</h2>

            {paraRevisar.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-600 text-sm">
                Sin novedades
              </div>
            ) : (
              <div className="space-y-3">
                {paraRevisar.slice(0, 5).map(({ m, aviso, evidencia }, i) => {
                  const fechaEv =
                    evidencia?.fecha_entrega && !isNaN(new Date(evidencia.fecha_entrega).getTime())
                      ? fmtFecha(evidencia.fecha_entrega)
                      : null;

                  return (
                    <button
                      key={i}
                      onClick={() => onSelectMateria(m.nombre, m.carrera)}
                      className="w-full text-left p-4 rounded-2xl border border-white/5 bg-slate-950/50 hover:bg-slate-900 hover:border-white/10 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-slate-200 text-sm group-hover:text-indigo-300 transition-colors leading-snug">
                          {m.nombre}
                        </h4>
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold flex-shrink-0 ml-2 ${getTagColor(m.carrera)}`}>
                          {m.carrera}
                        </span>
                      </div>

                      {aviso && (
                        <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-3">
                          {aviso.mensaje}
                        </p>
                      )}

                      {evidencia && (
                        <div className="flex items-center justify-between w-full text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-2 rounded-xl transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            {fechaEv ? <Clock size={12} className="flex-shrink-0" /> : <FileText size={12} className="flex-shrink-0" />}
                            <span className="truncate">{evidencia.nombre}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            {fechaEv && <span className="font-mono text-indigo-400/70">{fechaEv}</span>}
                            <ChevronRight size={12} className="opacity-50" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {paraRevisar.length > 5 && (
              <p className="text-center text-[11px] text-slate-600 mt-3">
                +{paraRevisar.length - 5} más
              </p>
            )}

            <button
              onClick={onVerHistorial}
              className="w-full mt-4 py-2.5 rounded-xl border border-white/10 text-slate-500 hover:text-white hover:bg-white/5 transition-all text-sm font-medium flex items-center justify-center gap-2"
            >
              Ver historial completo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
