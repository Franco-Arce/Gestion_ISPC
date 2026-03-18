"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SCHEDULE, DOW_TO_DIA, toMin, type CourseEvent } from "@/lib/schedule";

const DIAS = ["Martes", "Miércoles", "Jueves"] as const;
const HOUR_START = 14;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const HOUR_PX = 64;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX;

type LayoutEvent = CourseEvent & { left: number; width: number };

function layoutDay(events: CourseEvent[]): LayoutEvent[] {
  const tsdsEvs = events.filter((e) => e.carrera === "TSDS");
  const tscdiaEvs = events.filter((e) => e.carrera === "TSCDIA");
  const hasBoth = tsdsEvs.length > 0 && tscdiaEvs.length > 0;

  function layoutGroup(grp: CourseEvent[], [start, end]: [number, number]): LayoutEvent[] {
    const sorted = [...grp].sort((a, b) => toMin(a.inicio) - toMin(b.inicio));
    const cols: CourseEvent[][] = [];
    for (const ev of sorted) {
      let placed = false;
      for (const col of cols) {
        if (toMin(col[col.length - 1].fin) <= toMin(ev.inicio)) {
          col.push(ev);
          placed = true;
          break;
        }
      }
      if (!placed) cols.push([ev]);
    }
    const colW = (end - start) / cols.length;
    const result: LayoutEvent[] = [];
    cols.forEach((col, ci) =>
      col.forEach((ev) => result.push({ ...ev, left: start + ci * colW, width: colW }))
    );
    return result;
  }

  return [
    ...(tsdsEvs.length > 0 ? layoutGroup(tsdsEvs, hasBoth ? [0, 50] : [0, 100]) : []),
    ...(tscdiaEvs.length > 0 ? layoutGroup(tscdiaEvs, hasBoth ? [50, 100] : [0, 100]) : []),
  ];
}

// Full name list grouped by día
const SCHEDULE_BY_DIA = DIAS.map((dia) => ({
  dia,
  events: SCHEDULE.filter((e) => e.dia === dia).sort(
    (a, b) => toMin(a.inicio) - toMin(b.inicio)
  ),
}));

export default function WeeklyCalendar() {
  const todayDia = DOW_TO_DIA[new Date().getDay()];
  const [legendOpen, setLegendOpen] = useState(false);

  return (
    <section className="bg-slate-900/30 border border-slate-800/60 rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">
            Horario semanal
          </p>
          <p className="text-sm text-slate-200">Martes · Miércoles · Jueves</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-rose-400/80">
            <span className="w-2 h-2 rounded-sm bg-rose-600 inline-block" /> TSDS
          </span>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400/80">
            <span className="w-2 h-2 rounded-sm bg-emerald-600 inline-block" /> TSCDIA
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[520px] p-5 pb-4">
          {/* Day headers */}
          <div className="flex mb-1 ml-12">
            {DIAS.map((d) => (
              <div key={d} className="flex-1 text-center">
                <span
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                    d === todayDia
                      ? "bg-indigo-500/20 text-indigo-300"
                      : "text-slate-600"
                  }`}
                >
                  {d}
                  {d === todayDia && (
                    <span className="ml-1 text-indigo-400/60 text-[10px]">· hoy</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Time grid */}
          <div className="flex" style={{ height: TOTAL_HEIGHT }}>
            <div className="w-12 flex-shrink-0 relative">
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-slate-700 tabular-nums select-none"
                  style={{ top: i * HOUR_PX - 7 }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {DIAS.map((dia) => {
              const laid = layoutDay(SCHEDULE.filter((e) => e.dia === dia));
              return (
                <div
                  key={dia}
                  className={`flex-1 relative mx-1 rounded-xl ${
                    dia === todayDia ? "bg-indigo-950/20" : ""
                  }`}
                >
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-slate-800/50"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}
                  {laid.map((ev, i) => {
                    const startMins = toMin(ev.inicio) - HOUR_START * 60;
                    const endMins = toMin(ev.fin) - HOUR_START * 60;
                    const top = (startMins / 60) * HOUR_PX;
                    const height = ((endMins - startMins) / 60) * HOUR_PX;
                    const isTs = ev.carrera === "TSDS";
                    const cls = isTs
                      ? "bg-rose-950/80 border-rose-800/50 text-rose-200"
                      : "bg-emerald-950/80 border-emerald-800/50 text-emerald-200";
                    const dot = isTs ? "bg-rose-500" : "bg-emerald-500";

                    return (
                      <div
                        key={i}
                        title={`${ev.nombre} · ${ev.inicio}–${ev.fin}`}
                        className={`absolute border rounded-lg overflow-hidden px-2 py-1.5 ${cls}`}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `${ev.left + 0.5}%`,
                          width: `${ev.width - 1}%`,
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                          <p className="text-[11px] font-semibold leading-tight truncate">
                            {ev.nombre}
                          </p>
                        </div>
                        <p className="text-[10px] opacity-40 leading-tight pl-2.5">
                          {ev.inicio}–{ev.fin}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Legend tab ── */}
      <div className="border-t border-slate-800/60">
        <button
          onClick={() => setLegendOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-3 text-sm text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-colors"
        >
          <span className="font-medium">Ver materias completas</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${legendOpen ? "rotate-180" : ""}`}
          />
        </button>

        {legendOpen && (
          <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
            {SCHEDULE_BY_DIA.map(({ dia, events }) => (
              <div key={dia}>
                <p
                  className={`text-xs font-bold uppercase tracking-wider mb-3 ${
                    dia === todayDia ? "text-indigo-400" : "text-slate-600"
                  }`}
                >
                  {dia}
                  {dia === todayDia && " · hoy"}
                </p>
                <div className="space-y-2">
                  {events.map((ev, i) => {
                    const isTs = ev.carrera === "TSDS";
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                            isTs ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                        <div>
                          <p className="text-sm text-slate-300 leading-snug">{ev.nombre}</p>
                          <p className="text-[11px] text-slate-600 font-mono">
                            {ev.inicio}–{ev.fin}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
