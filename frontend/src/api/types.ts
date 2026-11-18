export type Prioridad = "urgente" | "alta" | "normal" | "baja";

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
  color: string;
}

export interface ListaResumen {
  id: number;
  nombre: string;
  espacio_id: number;
}

export interface Espacio {
  id: number;
  nombre: string;
  color: string;
  propietario_id: number;
  listas: ListaResumen[];
}

export interface Estado {
  id: number;
  nombre: string;
  color: string;
  posicion: number;
  es_final: boolean;
}

export interface Lista {
  id: number;
  nombre: string;
  espacio_id: number;
  espacio_nombre: string;
  espacio_color: string;
  estados: Estado[];
  miembros: Usuario[];
}

export interface TareaResumen {
  id: number;
  lista_id: number;
  padre_id: number | null;
  titulo: string;
  estado: Estado;
  prioridad: Prioridad | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  posicion: number;
  asignados: Usuario[];
  num_subtareas: number;
  num_subtareas_hechas: number;
  num_comentarios: number;
  lista_nombre: string;
}

export interface Comentario {
  id: number;
  contenido: string;
  creado_en: string;
  autor: Usuario;
}

export interface TareaDetalle extends TareaResumen {
  descripcion: string;
  creado_en: string;
  actualizado_en: string;
  creador: Usuario;
  subtareas: TareaResumen[];
  comentarios: Comentario[];
}

export interface TareaPatch {
  titulo?: string;
  descripcion?: string;
  estado_id?: number;
  prioridad?: Prioridad | null;
  fecha_inicio?: string | null;
  fecha_vencimiento?: string | null;
  asignados?: number[];
  posicion?: number;
}

export interface TareaNueva {
  titulo: string;
  estado_id?: number;
  padre_id?: number;
  prioridad?: Prioridad | null;
  asignados?: number[];
  fecha_vencimiento?: string | null;
}
