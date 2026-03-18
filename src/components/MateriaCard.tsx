"use client";

import { useState } from "react";
import { Materia } from "@/types";

type Tab = "programa" | "tareas" | "materiales" | "avisos";

const TAB_LABELS: Record<Tab, string> = {
  programa: "Programa",
  tareas: "Tareas",
  materiales: "Materiales",
  avisos: "Avisos",
};

export default function MateriaCard({
  materia,
  color,
}: {
  materia: Materia;
  color: string;
}) {
  const [tab, setTab] = useState<Tab>("programa");

  const activeClass =
    color === "blue"
      ? "border-blue-500 text-blue-300"
      : "border-violet-500 text-violet-300";

  const pendientes = materia.tareas.filter((t) => t.estado === "pendiente").length;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header de materia */}
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">{materia.nombre}</h2>
            <p className="text-sm text-gray-400 mt-1">
              {materia.horario} · Com. {materia.comision}
            </p>
          </div>
          {materia.url_campus && (
            <a
              href={materia.url_campus}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1"
            >
              Ver en campus →
            </a>
          )}
        </div>
      </div>

      {/* Tabs internos */}
      <div className="flex border-b border-gray-800">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
              tab === t
                ? `${activeClass} border-b-2`
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {TAB_LABELS[t]}
            {t === "tareas" && pendientes > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {pendientes}
              </span>
            )}
            {t === "avisos" && materia.avisos.length > 0 && (
              <span className="ml-1.5 bg-yellow-500 text-black text-xs rounded-full px-1.5 py-0.5">
                {materia.avisos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="p-5 min-h-48">
        {tab === "programa" && (
          <div>
            {materia.programa ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                  {materia.programa}
                </pre>
              </div>
            ) : (
              <EmptyState mensaje="El programa aún no está disponible en el campus." />
            )}
            {materia.criterios && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Criterios de evaluación
                </h4>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans">
                  {materia.criterios}
                </pre>
              </div>
            )}
          </div>
        )}

        {tab === "tareas" && (
          <div>
            {materia.tareas.length === 0 ? (
              <EmptyState mensaje="No hay tareas publicadas aún." />
            ) : (
              <div className="space-y-3">
                {materia.tareas.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg"
                  >
                    <StatusBadge estado={t.estado} />
                    <div className="flex-1 min-w-0">
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-400 hover:underline truncate block"
                      >
                        {t.nombre}
                      </a>
                      {t.fecha_entrega && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          Entrega:{" "}
                          {new Date(t.fecha_entrega).toLocaleDateString("es-AR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "materiales" && (
          <div>
            {materia.materiales.length === 0 ? (
              <EmptyState mensaje="No hay materiales publicados aún." />
            ) : (
              <div className="space-y-2">
                {materia.materiales.map((m, i) => (
                  <a
                    key={i}
                    href={m.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors group"
                  >
                    <TipoIcon tipo={m.tipo} />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {m.nombre}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "avisos" && (
          <div>
            {materia.avisos.length === 0 ? (
              <EmptyState mensaje="Sin avisos por el momento." />
            ) : (
              <div className="space-y-3">
                {materia.avisos.map((a, i) => (
                  <div key={i} className="p-4 bg-yellow-950 border border-yellow-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-yellow-400">{a.autor}</span>
                      <span className="text-xs text-yellow-600">{a.fecha}</span>
                    </div>
                    <p className="text-sm text-yellow-100 leading-relaxed whitespace-pre-wrap">{a.mensaje}</p>
                    <a href={a.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-yellow-500 hover:underline mt-2 inline-block">
                      Ver en campus →
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-gray-800">
        <p className="text-xs text-gray-600">
          Actualizado:{" "}
          {new Date(materia.ultima_actualizacion).toLocaleString("es-AR")}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ mensaje }: { mensaje: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-600 text-sm">
      {mensaje}
    </div>
  );
}

function StatusBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "bg-yellow-500",
    entregada: "bg-green-500",
    vencida: "bg-red-500",
  };
  return (
    <span
      className={`w-2 h-2 rounded-full flex-shrink-0 ${map[estado] ?? "bg-gray-500"}`}
    />
  );
}

function TipoIcon({ tipo }: { tipo: string }) {
  const icons: Record<string, string> = {
    pdf: "📄",
    video: "🎥",
    link: "🔗",
    otro: "📎",
  };
  return <span>{icons[tipo] ?? "📎"}</span>;
}
