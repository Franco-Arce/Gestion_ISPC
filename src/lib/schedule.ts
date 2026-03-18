export type Dia = "Martes" | "Miércoles" | "Jueves";
export type Carrera = "TSDS" | "TSCDIA";

export interface CourseEvent {
  nombre: string;
  dia: Dia;
  inicio: string;
  fin: string;
  carrera: Carrera;
}

export const SCHEDULE: CourseEvent[] = [
  // TSDS — rojo
  { nombre: "Programación III",            dia: "Martes",    inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  { nombre: "Interfaz de Usuario",          dia: "Martes",    inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  { nombre: "Práctica Profesionalizante II",dia: "Miércoles", inicio: "18:20", fin: "19:20", carrera: "TSDS" },
  { nombre: "Ciencia de Datos",             dia: "Miércoles", inicio: "19:40", fin: "20:40", carrera: "TSDS" },
  { nombre: "Ingeniería de Software",       dia: "Jueves",    inicio: "18:20", fin: "19:20", carrera: "TSDS" },
  { nombre: "Gestión de Proyectos",         dia: "Jueves",    inicio: "19:40", fin: "20:40", carrera: "TSDS" },
  // TSCDIA — verde
  { nombre: "Estadística y Expl. de Datos I", dia: "Martes",    inicio: "15:40", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Procesamiento de Datos",          dia: "Martes",    inicio: "15:40", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Ciencia de Datos I",              dia: "Miércoles", inicio: "15:40", fin: "16:40", carrera: "TSCDIA" },
  { nombre: "Tecnología y Sociedad",           dia: "Miércoles", inicio: "17:00", fin: "18:00", carrera: "TSCDIA" },
  { nombre: "Inglés II",                       dia: "Jueves",    inicio: "14:20", fin: "15:20", carrera: "TSCDIA" },
  { nombre: "Ciberseguridad",                  dia: "Jueves",    inicio: "15:40", fin: "16:40", carrera: "TSCDIA" },
];

export const DOW_TO_DIA: Record<number, Dia | undefined> = {
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
};

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
