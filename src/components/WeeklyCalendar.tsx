"use client";

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
    const nCols = cols.length;
    const colW = (end - start) / nCols;
    const result: LayoutEvent[] = [];
    cols.forEach((col, ci) =>
      col.forEach((ev) => result.push({ ...ev, left: start + ci * colW, width: colW }))
    );
    return result;
  }

  return [
    ...(tsdsEvs.length > 0
      ? layoutGroup(tsdsEvs, hasBoth ? [0, 50] : [0, 100])
      : []),
    ...(tscdiaEvs.length > 0
      ? layoutGroup(tscdiaEvs, hasBoth ? [50, 100] : [0, 100])
      : []),
  ];
}

export default function WeeklyCalendar() {
  const todayDia = DOW_TO_DIA[new Date().getDay()];

  return (
    <section className="bg-[#0e0e1a] border border-violet-900/25 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-violet-900/20 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-violet-400/50 uppercase tracking-widest mb-0.5">
            Horario semanal
          </p>
          <p className="text-sm text-violet-100">Mar · Mié · Jue</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[11px] text-red-400/70">
            <span className="w-2 h-2 rounded-sm bg-red-600 inline-block" /> TSDS
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-green-400/70">
            <span className="w-2 h-2 rounded-sm bg-green-600 inline-block" /> TSCDIA
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[520px] p-4 pb-6">
          {/* Day headers */}
          <div className="flex mb-1 ml-12">
            {DIAS.map((d) => (
              <div key={d} className="flex-1 text-center">
                <span
                  className={`inline-block text-[11px] font-medium px-3 py-1 rounded-full transition-colors ${
                    d === todayDia
                      ? "bg-violet-500/20 text-violet-300"
                      : "text-violet-700"
                  }`}
                >
                  {d}
                  {d === todayDia && (
                    <span className="ml-1 text-violet-400/60 text-[10px]">· hoy</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="flex" style={{ height: TOTAL_HEIGHT }}>
            {/* Hour labels */}
            <div className="w-12 flex-shrink-0 relative">
              {HOURS.map((h, i) => (
                <div
                  key={h}
                  className="absolute right-2 text-[10px] text-violet-900 tabular-nums select-none"
                  style={{ top: i * HOUR_PX - 7 }}
                >
                  {h}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {DIAS.map((dia) => {
              const laid = layoutDay(SCHEDULE.filter((e) => e.dia === dia));
              const isToday = dia === todayDia;

              return (
                <div
                  key={dia}
                  className={`flex-1 relative mx-1 rounded-xl transition-colors ${
                    isToday ? "bg-violet-950/20" : ""
                  }`}
                >
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-violet-900/20"
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
                      ? "bg-red-950/80 border-red-800/50 text-red-200"
                      : "bg-green-950/80 border-green-800/50 text-green-200";
                    const dot = isTs ? "bg-red-500" : "bg-green-500";

                    return (
                      <div
                        key={i}
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
    </section>
  );
}
