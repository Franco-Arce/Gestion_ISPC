"use client";

import { Materia } from "@/types";

interface MateriaResumen {
  nombre: string;
  carrera: "TSDS" | "TSCDIA";
  nuevosHoy: number;
  recientes: number;
  total: number;
}

export default function ResumenHoy({
  materias,
  onSelectMateria,
}: {
  materias: Materia[];
  onSelectMateria: (nombre: string, carrera: "TSDS" | "TSCDIA") => void;
}) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const resumen: MateriaResumen[] = materias
    .filter((m) => m.avisos.length > 0)
    .map((m) => ({
      nombre: m.nombre,
      carrera: m.carrera,
      nuevosHoy: m.avisos.filter((a) => a.fecha.startsWith(today)).length,
      recientes: m.avisos.filter((a) => {
        const d = new Date(a.fecha);
        return !isNaN(d.getTime()) && Date.now() - d.getTime() < 7 * 86400000;
      }).length,
      total: m.avisos.length,
    }))
    .sort((a, b) => b.nuevosHoy - a.nuevosHoy || b.recientes - a.recientes);

  if (resumen.length === 0) return null;

  const hoy = resumen.filter((m) => m.nuevosHoy > 0);
  const anteriores = resumen.filter((m) => m.nuevosHoy === 0);

  const fechaHoy = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <section className="bg-[#111] border border-[#222] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
        <div>
          <p className="text-[11px] text-zinc-600 uppercase tracking-widest font-medium mb-0.5">
            Actividad del campus
          </p>
          <p className="text-sm text-zinc-300 capitalize">{fechaHoy}</p>
        </div>
        {hoy.length > 0 && (
          <span className="text-[11px] bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full">
            {hoy.length} materia{hoy.length > 1 ? "s" : ""} con novedad
          </span>
        )}
      </div>

      {/* Hoy */}
      {hoy.length > 0 && (
        <div className="px-3 py-3">
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 mb-2">Hoy</p>
          <div className="space-y-0.5">
            {hoy.map((m) => (
              <button
                key={m.nombre}
                onClick={() => onSelectMateria(m.nombre, m.carrera)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group text-left"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    m.carrera === "TSDS" ? "bg-red-500" : "bg-green-500"
                  }`}
                />
                <span className="flex-1 text-sm font-medium text-zinc-200">{m.nombre}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                    m.carrera === "TSDS"
                      ? "bg-red-950/60 text-red-400"
                      : "bg-green-950/60 text-green-400"
                  }`}
                >
                  {m.carrera}
                </span>
                <span className="text-[11px] text-zinc-500 flex-shrink-0 w-24 text-right">
                  {m.nuevosHoy} nuevo{m.nuevosHoy > 1 ? "s" : ""}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Anteriores */}
      {anteriores.length > 0 && (
        <div
          className={`px-3 py-3 ${hoy.length > 0 ? "border-t border-[#1e1e1e]" : ""}`}
        >
          {hoy.length > 0 && (
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest px-3 mb-2">
              Sin novedades hoy
            </p>
          )}
          <div className="space-y-0.5">
            {anteriores.map((m) => (
              <button
                key={m.nombre}
                onClick={() => onSelectMateria(m.nombre, m.carrera)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group text-left"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-30 ${
                    m.carrera === "TSDS" ? "bg-red-500" : "bg-green-500"
                  }`}
                />
                <span className="flex-1 text-sm text-zinc-500">{m.nombre}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 opacity-50 ${
                    m.carrera === "TSDS"
                      ? "bg-red-950/40 text-red-500"
                      : "bg-green-950/40 text-green-500"
                  }`}
                >
                  {m.carrera}
                </span>
                <span className="text-[11px] text-zinc-700 flex-shrink-0 w-24 text-right">
                  {m.total} aviso{m.total > 1 ? "s" : ""}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-zinc-800 group-hover:text-zinc-600 transition-colors flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
