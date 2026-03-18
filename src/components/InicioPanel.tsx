"use client";

import { Materia } from "@/types";
import { SCHEDULE, DOW_TO_DIA, toMin } from "@/lib/schedule";

export default function InicioPanel({
  materias,
  onSelectMateria,
}: {
  materias: Materia[];
  onSelectMateria: (nombre: string, carrera: "TSDS" | "TSCDIA") => void;
}) {
  const todayDia = DOW_TO_DIA[new Date().getDay()];

  // Clases de hoy ordenadas por hora, sin duplicados de nombre
  const clasesHoy = todayDia
    ? SCHEDULE.filter((e) => e.dia === todayDia)
        .sort((a, b) => toMin(a.inicio) - toMin(b.inicio))
        .filter((e, i, arr) => arr.findIndex((x) => x.nombre === e.nombre) === i)
    : [];

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

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  function fmtFecha(iso: string) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">

      {/* ── IZQUIERDA: Clases de hoy ── */}
      <section className="bg-[#0e0e1a] border border-violet-900/25 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-violet-900/20">
          <p className="text-[10px] text-violet-400/50 uppercase tracking-widest mb-0.5">
            {todayDia ? `Clases de hoy · ${todayDia}` : "Sin clases hoy"}
          </p>
          <p className="text-sm text-violet-100 capitalize">{fechaHoy}</p>
        </div>

        {clasesHoy.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-violet-800 text-sm">
            No hay clases programadas hoy
          </div>
        ) : (
          <div className="divide-y divide-violet-900/15">
            {clasesHoy.map((clase, i) => {
              const materia = materias.find((m) => m.nombre === clase.nombre);
              const aviso = materia?.avisos[0] ?? null;
              const isTs = clase.carrera === "TSDS";

              return (
                <button
                  key={i}
                  onClick={() => materia && onSelectMateria(clase.nombre, clase.carrera)}
                  disabled={!materia}
                  className="w-full text-left px-6 py-4 hover:bg-violet-950/30 transition-colors group disabled:opacity-50 disabled:cursor-default"
                >
                  {/* Curso header */}
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isTs ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    <span className="text-sm font-semibold text-violet-100 flex-1">
                      {clase.nombre}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-px rounded-full font-medium flex-shrink-0 ${
                        isTs
                          ? "bg-red-950/60 text-red-400"
                          : "bg-green-950/60 text-green-400"
                      }`}
                    >
                      {clase.carrera}
                    </span>
                    <span className="text-[11px] text-violet-700 flex-shrink-0">
                      {clase.inicio}–{clase.fin}
                    </span>
                  </div>

                  {/* Último aviso */}
                  <div className="pl-3.5 border-l border-violet-800/30">
                    {aviso ? (
                      <>
                        <p className="text-[11px] text-violet-500/80 mb-0.5 truncate">
                          {aviso.autor}
                        </p>
                        <p className="text-xs text-violet-300/50 line-clamp-2 leading-relaxed">
                          {aviso.mensaje}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-violet-800">
                        {materia ? "Sin avisos publicados" : "Aún no disponible en el campus"}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── DERECHA: Para revisar ── */}
      <section className="bg-[#0e0e1a] border border-violet-900/25 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-violet-900/20">
          <p className="text-[10px] text-violet-400/50 uppercase tracking-widest mb-0.5">
            Para revisar
          </p>
          <p className="text-sm text-violet-100">Avisos y evidencias</p>
        </div>

        {paraRevisar.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-violet-800 text-sm">
            Sin novedades
          </div>
        ) : (
          <div className="divide-y divide-violet-900/15">
            {paraRevisar.map(({ m, aviso, evidencia }, i) => {
              const isTs = m.carrera === "TSDS";
              const vence =
                evidencia?.fecha_entrega && !isNaN(new Date(evidencia.fecha_entrega).getTime())
                  ? fmtFecha(evidencia.fecha_entrega)
                  : null;

              return (
                <button
                  key={i}
                  onClick={() => onSelectMateria(m.nombre, m.carrera)}
                  className="w-full text-left px-5 py-4 hover:bg-violet-950/30 transition-colors group"
                >
                  {/* Header materia */}
                  <div className="flex items-center gap-2 mb-2.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                        isTs ? "bg-red-500" : "bg-green-500"
                      }`}
                    />
                    <span className="text-xs font-semibold text-violet-200 flex-1 truncate">
                      {m.nombre}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-px rounded-full flex-shrink-0 ${
                        isTs
                          ? "bg-red-950/50 text-red-500"
                          : "bg-green-950/50 text-green-500"
                      }`}
                    >
                      {m.carrera}
                    </span>
                  </div>

                  {/* 1 aviso */}
                  {aviso && (
                    <div className="mb-2 pl-3 border-l border-violet-800/25">
                      <p className="text-[10px] text-violet-500/70 mb-px truncate">
                        {aviso.autor}
                      </p>
                      <p className="text-[11px] text-violet-300/45 line-clamp-2 leading-relaxed">
                        {aviso.mensaje}
                      </p>
                    </div>
                  )}

                  {/* 1 evidencia */}
                  {evidencia && (
                    <div className="flex items-start gap-2 pl-3">
                      <svg
                        className="w-3 h-3 text-amber-500/60 flex-shrink-0 mt-px"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-amber-400/60 truncate">
                          {evidencia.nombre}
                        </p>
                        {vence && (
                          <p className="text-[10px] text-amber-600/50">Vence {vence}</p>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
