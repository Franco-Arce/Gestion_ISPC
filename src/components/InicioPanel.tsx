"use client";

import { Clock, FileText, ChevronRight } from "lucide-react";
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
  const diaLabel = todayDia ? `Clases de hoy · ${todayDia}` : "Sin clases programadas hoy";

  // Para revisar: 1 aviso + 1 evidencia por materia
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">

      {/* ── IZQUIERDA: Clases de hoy ── */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        <div className="mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            {diaLabel}
          </p>
          <h2 className="text-2xl font-semibold text-white capitalize">{fechaHoy}</h2>
        </div>

        {clasesHoy.length === 0 ? (
          <div className="flex items-center justify-center h-40 rounded-2xl border border-slate-800/60 bg-slate-900/30 text-slate-600 text-sm">
            No hay clases programadas hoy
          </div>
        ) : (
          <div className="space-y-3">
            {clasesHoy.map((clase, i) => {
              const materia = materias.find((m) => m.nombre === clase.nombre);
              const aviso = materia?.avisos[0] ?? null;
              const isCancelled = aviso?.mensaje?.toLowerCase().includes("cancelad") ?? false;

              return (
                <button
                  key={i}
                  onClick={() => materia && onSelectMateria(clase.nombre, clase.carrera)}
                  disabled={!materia}
                  className="w-full text-left group p-5 rounded-2xl border border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-700 transition-all disabled:opacity-50 disabled:cursor-default"
                >
                  {/* Header */}
                  <div className="flex flex-wrap md:flex-nowrap justify-between items-start gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full shadow-lg flex-shrink-0 ${
                          !materia
                            ? "bg-slate-600"
                            : isCancelled
                            ? "bg-rose-500 shadow-rose-500/50"
                            : "bg-emerald-500 shadow-emerald-500/50"
                        }`}
                      />
                      <h3 className="text-lg font-medium text-slate-100 group-hover:text-indigo-300 transition-colors">
                        {clase.nombre}
                      </h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-md border text-xs font-semibold tracking-wide ${getTagColor(clase.carrera)}`}
                      >
                        {clase.carrera}
                      </span>
                      <span className="text-indigo-400 font-medium font-mono">
                        {clase.inicio}–{clase.fin}
                      </span>
                    </div>
                  </div>

                  {/* Autor + mensaje */}
                  {aviso ? (
                    <>
                      <p className="text-indigo-300/70 text-sm mb-1.5">{aviso.autor}</p>
                      <p className="text-slate-400 text-sm leading-relaxed line-clamp-2">
                        {aviso.mensaje}
                      </p>
                    </>
                  ) : (
                    <p className="text-slate-600 text-sm">
                      {materia ? "Sin avisos publicados" : "Aún no disponible en el campus"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DERECHA: Para revisar (sticky) ── */}
      <div className="lg:col-span-5 xl:col-span-4">
        <div className="sticky top-8 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
            Para revisar
          </p>
          <h2 className="text-xl font-semibold text-white mb-6">Avisos y evidencias</h2>

          {paraRevisar.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-slate-600 text-sm">
              Sin novedades
            </div>
          ) : (
            <div className="space-y-4">
              {paraRevisar.slice(0, 5).map(({ m, aviso, evidencia }, i) => {
                const fechaEv =
                  evidencia?.fecha_entrega && !isNaN(new Date(evidencia.fecha_entrega).getTime())
                    ? fmtFecha(evidencia.fecha_entrega)
                    : null;

                return (
                  <button
                    key={i}
                    onClick={() => onSelectMateria(m.nombre, m.carrera)}
                    className="w-full text-left group relative p-4 rounded-xl border border-slate-800/40 bg-slate-950/50 hover:bg-slate-900 transition-all"
                  >
                    {/* Materia + tag */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <h4 className="font-medium text-slate-200 text-sm leading-snug">
                          {m.nombre}
                        </h4>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold flex-shrink-0 ml-2 ${getTagColor(m.carrera)}`}
                      >
                        {m.carrera}
                      </span>
                    </div>

                    {/* Aviso */}
                    {aviso && (
                      <>
                        <p className="text-indigo-300/60 text-xs mb-1">{aviso.autor}</p>
                        <p className="text-slate-400 text-sm mb-3 line-clamp-2 leading-relaxed">
                          {aviso.mensaje}
                        </p>
                      </>
                    )}

                    {/* Evidencia chip */}
                    {evidencia && (
                      <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-lg transition-colors">
                        {fechaEv ? <Clock size={13} /> : <FileText size={13} />}
                        <span className="truncate max-w-[180px]">{evidencia.nombre}</span>
                        {fechaEv && (
                          <span className="text-amber-600 font-mono flex-shrink-0">{fechaEv}</span>
                        )}
                        <ChevronRight size={13} className="opacity-50 flex-shrink-0" />
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
            className="w-full mt-4 py-2.5 rounded-xl border border-slate-700 text-slate-500 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
          >
            Ver historial completo
          </button>
        </div>
      </div>
    </div>
  );
}
