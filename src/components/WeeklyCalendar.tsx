"use client";

const DIAS = ["Martes", "Miércoles", "Jueves"] as const;
type Dia = (typeof DIAS)[number];

const HOUR_START = 14;
const HOUR_END = 21;
const HOURS = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i);
const HOUR_PX = 64;
const TOTAL_HEIGHT = (HOUR_END - HOUR_START) * HOUR_PX;

type CourseEvent = {
  nombre: string;
  dia: Dia;
  inicio: string;
  fin: string;
  carrera: "TSDS" | "TSCDIA";
};

const SCHEDULE: CourseEvent[] = [
  // TSDS — rojo
  { nombre: "Programación III", dia: "Martes", inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  { nombre: "Interfaz de Usuario", dia: "Martes", inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  { nombre: "Práctica Profesionalizante II", dia: "Miércoles", inicio: "18:20", fin: "19:20", carrera: "TSDS" },
  { nombre: "Ciencia de Datos", dia: "Miércoles", inicio: "19:40", fin: "20:40", carrera: "TSDS" },
  { nombre: "Ingeniería de Software", dia: "Jueves", inicio: "18:20", fin: "19:20", carrera: "TSDS" },
  { nombre: "Gestión de Proyectos", dia: "Jueves", inicio: "19:40", fin: "20:40", carrera: "TSDS" },
  // TSCDIA — verde
  { nombre: "Estadística y Expl. de Datos I", dia: "Martes", inicio: "15:40", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Procesamiento de Datos", dia: "Martes", inicio: "15:40", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Ciencia de Datos I", dia: "Miércoles", inicio: "15:40", fin: "16:40", carrera: "TSCDIA" },
  { nombre: "Tecnología y Sociedad", dia: "Miércoles", inicio: "17:00", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Inglés II", dia: "Jueves", inicio: "14:20", fin: "15:20", carrera: "TSCDIA" },
  { nombre: "Ciberseguridad", dia: "Jueves", inicio: "15:40", fin: "16:40", carrera: "TSCDIA" },
];

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

type LayoutEvent = CourseEvent & { left: number; width: number };

function layoutDay(events: CourseEvent[]): LayoutEvent[] {
  const tsdsEvs = events.filter((e) => e.carrera === "TSDS");
  const tscdiaEvs = events.filter((e) => e.carrera === "TSCDIA");
  const hasBoth = tsdsEvs.length > 0 && tscdiaEvs.length > 0;
  const tsdsRange: [number, number] = hasBoth ? [0, 50] : [0, 100];
  const tscdiaRange: [number, number] = hasBoth ? [50, 100] : [0, 100];

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
    ...(tsdsEvs.length > 0 ? layoutGroup(tsdsEvs, tsdsRange) : []),
    ...(tscdiaEvs.length > 0 ? layoutGroup(tscdiaEvs, tscdiaRange) : []),
  ];
}

export default function WeeklyCalendar() {
  const todayDow = new Date().getDay(); // 0=Sun,1=Mon,2=Tue,3=Wed,4=Thu
  const DOW_TO_DIA: Record<number, Dia | undefined> = { 2: "Martes", 3: "Miércoles", 4: "Jueves" };
  const todayDia = DOW_TO_DIA[todayDow];

  return (
    <section className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h2 className="text-sm font-semibold text-gray-200">Horario semanal</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-600 inline-block" />
            TSDS
          </span>
          <span className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-green-600 inline-block" />
            TSCDIA
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
                  className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${
                    d === todayDia
                      ? "bg-blue-500/20 text-blue-300"
                      : "text-gray-500"
                  }`}
                >
                  {d}
                  {d === todayDia && <span className="ml-1 text-blue-400 opacity-80">·</span>}
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
                  className="absolute right-2 text-xs text-gray-700 tabular-nums select-none"
                  style={{ top: i * HOUR_PX - 8 }}
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
                  className={`flex-1 relative mx-1 rounded-lg transition-colors ${
                    isToday ? "bg-blue-950/20" : ""
                  }`}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((_, i) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-gray-800/60"
                      style={{ top: i * HOUR_PX }}
                    />
                  ))}

                  {/* Events */}
                  {laid.map((ev, i) => {
                    const startMins = toMin(ev.inicio) - HOUR_START * 60;
                    const endMins = toMin(ev.fin) - HOUR_START * 60;
                    const top = (startMins / 60) * HOUR_PX;
                    const height = ((endMins - startMins) / 60) * HOUR_PX;
                    const isTs = ev.carrera === "TSDS";

                    const bg = isTs
                      ? "bg-red-950 border-red-800/70 text-red-200"
                      : "bg-green-950 border-green-800/70 text-green-200";
                    const dot = isTs ? "bg-red-500" : "bg-green-500";

                    return (
                      <div
                        key={i}
                        className={`absolute border rounded-lg overflow-hidden px-2 py-1.5 ${bg}`}
                        style={{
                          top: top + 1,
                          height: height - 2,
                          left: `${ev.left + 0.5}%`,
                          width: `${ev.width - 1}%`,
                        }}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                          <p className="text-xs font-semibold leading-tight truncate">{ev.nombre}</p>
                        </div>
                        <p className="text-xs opacity-50 leading-tight pl-2.5">
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
