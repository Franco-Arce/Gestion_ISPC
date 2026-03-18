"use client";

import { useState } from "react";
import { Materia, Aviso } from "@/types";

interface AvisoConMateria extends Aviso {
  materia: string;
  carrera: "TSDS" | "TSCDIA";
}

function parseDate(fechaStr: string): Date {
  // Intentar parsear formatos como "jueves, 12 marzo 2026, 7:41 PM"
  const meses: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
  };
  const match = fechaStr.match(/(\d+)\s+(\w+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = meses[match[2].toLowerCase()] ?? 0;
    const year = parseInt(match[3]);
    return new Date(year, month, day);
  }
  return new Date(fechaStr);
}

export default function AvisosPanel({ materias }: { materias: Materia[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  const todosLosAvisos: AvisoConMateria[] = materias
    .flatMap((m) =>
      m.avisos.map((a) => ({ ...a, materia: m.nombre, carrera: m.carrera }))
    )
    .sort((a, b) => parseDate(b.fecha).getTime() - parseDate(a.fecha).getTime());

  if (todosLosAvisos.length === 0) return null;

  return (
    <section className="bg-gray-900 border border-yellow-900/40 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-yellow-900/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-yellow-300">
            Notificaciones
          </h2>
          <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-0.5 rounded-full">
            {todosLosAvisos.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-800">
        {todosLosAvisos.map((aviso, i) => (
          <div key={i} className="px-5 py-4">
            <div
              className="flex items-start gap-3 cursor-pointer"
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              {/* Badge carrera */}
              <span
                className={`mt-0.5 flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${
                  aviso.carrera === "TSDS"
                    ? "bg-blue-900 text-blue-300"
                    : "bg-violet-900 text-violet-300"
                }`}
              >
                {aviso.carrera}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-200 truncate">
                    {aviso.materia}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    {aviso.fecha}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{aviso.autor}</p>

                {/* Preview o mensaje completo */}
                {expanded === i ? (
                  <div className="mt-3">
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                      {aviso.mensaje}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {aviso.mensaje}
                  </p>
                )}
              </div>

              <span className="text-gray-600 text-xs flex-shrink-0 mt-1">
                {expanded === i ? "▲" : "▼"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
