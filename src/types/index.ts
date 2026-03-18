export interface Tarea {
  nombre: string;
  url: string;
  fecha_entrega: string | null;
  estado: "pendiente" | "entregada" | "vencida";
  descripcion?: string;
  seccion?: string; // "Evidencias de Aprendizajes" | "Proyecto ABP" | "Coloquio - Promoción"
}

export interface Unidad {
  nombre: string;
  url: string;
  descripcion?: string;
}

export interface Material {
  nombre: string;
  url: string;
  tipo: "pdf" | "link" | "video" | "otro";
}

export interface Aviso {
  titulo: string;
  autor: string;
  fecha: string;
  mensaje: string;
  url: string;
}

export interface Materia {
  nombre: string;
  carrera: "TSDS" | "TSCDIA";
  horario: string;
  comision: string;
  url_campus: string;
  programa: string;
  criterios: string;
  avisos: Aviso[];
  unidades: Unidad[];
  tareas: Tarea[];
  materiales: Material[];
  ultima_actualizacion: string;
}

export interface ISPCData {
  usuario: string;
  generado_el: string;
  materias: Materia[];
}
