export type Dia = "Lunes" | "Martes" | "Miércoles" | "Jueves";
export type Carrera = "TSDS" | "TSCDIA";

export interface CourseEvent {
  nombre: string;
  dia: Dia;
  inicio: string;
  fin: string;
  carrera: Carrera;
  meet?: string;
}

// Meet links extraídos del campus por el scraper
// TSCDIA comisión A (Martes/Miércoles/Jueves tarde)
const MEET_TSCDIA_A = "https://meet.google.com/qam-wget-kaq";

export const SCHEDULE: CourseEvent[] = [
  // MARTES — TSDS
  { nombre: "Programación III",                dia: "Martes",    inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  { nombre: "Interfaz de Usuario",             dia: "Martes",    inicio: "18:20", fin: "20:40", carrera: "TSDS" },
  // MARTES — TSCDIA
  { nombre: "Estadística y Expl. de Datos I",  dia: "Martes",    inicio: "15:40", fin: "18:00", carrera: "TSCDIA", meet: MEET_TSCDIA_A },
  { nombre: "Procesamiento de Datos",          dia: "Martes",    inicio: "15:40", fin: "18:00", carrera: "TSCDIA", meet: MEET_TSCDIA_A },
  // MIÉRCOLES — TSDS
  { nombre: "Práctica Profesionalizante II",   dia: "Miércoles", inicio: "18:20", fin: "19:20", carrera: "TSDS",   meet: "https://meet.google.com/yww-aikn-asr" },
  { nombre: "Ciencia de Datos",                dia: "Miércoles", inicio: "19:40", fin: "20:40", carrera: "TSDS",   meet: "https://meet.google.com/tcn-vkoy-uhb" },
  // MIÉRCOLES — TSCDIA
  { nombre: "Ciencia de Datos I",              dia: "Miércoles", inicio: "15:40", fin: "16:40", carrera: "TSCDIA", meet: "https://meet.google.com/qma-wqxy-kwk" },
  { nombre: "Tecnología y Sociedad",           dia: "Miércoles", inicio: "17:00", fin: "18:00", carrera: "TSCDIA", meet: "https://meet.google.com/rgk-eexy-duc" },
  // JUEVES — TSDS
  { nombre: "Ingeniería de Software",          dia: "Jueves",    inicio: "18:20", fin: "19:20", carrera: "TSDS",   meet: "https://meet.google.com/stm-stcr-std" },
  { nombre: "Gestión de Proyectos",            dia: "Jueves",    inicio: "19:40", fin: "20:40", carrera: "TSDS",   meet: "https://meet.google.com/vts-ttna-wxs" },
  // JUEVES — TSCDIA
  { nombre: "Inglés II",                       dia: "Jueves",    inicio: "14:20", fin: "15:20", carrera: "TSCDIA", meet: MEET_TSCDIA_A },
  { nombre: "Ciberseguridad",                  dia: "Jueves",    inicio: "15:40", fin: "16:40", carrera: "TSCDIA", meet: "https://meet.google.com/eps-eita-tks" },
];

export const DOW_TO_DIA: Record<number, Dia | undefined> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
};

export function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
