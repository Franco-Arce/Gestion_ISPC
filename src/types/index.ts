export interface Tarea {
  nombre: string;
  url: string;
  fecha_entrega: string | null;
  estado: "pendiente" | "entregada" | "vencida";
}

export interface Material {
  nombre: string;
  url: string;
  tipo: "pdf" | "link" | "video" | "otro";
}

export interface Materia {
  nombre: string;
  carrera: "TSDS" | "TSCDIA";
  horario: string;
  comision: string;
  url_campus: string;
  programa: string;
  criterios: string;
  avisos: string[];
  tareas: Tarea[];
  materiales: Material[];
  ultima_actualizacion: string;
}

export interface ISPCData {
  usuario: string;
  generado_el: string;
  materias: Materia[];
}
