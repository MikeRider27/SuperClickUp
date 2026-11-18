import type {
  Comentario,
  Espacio,
  Estado,
  Lista,
  ListaResumen,
  TareaDetalle,
  TareaNueva,
  TareaPatch,
  TareaResumen,
  Usuario,
} from "./types";

const CLAVE_TOKEN = "superclickup.token";

export const tokenGuardado = {
  get: () => localStorage.getItem(CLAVE_TOKEN),
  set: (t: string) => localStorage.setItem(CLAVE_TOKEN, t),
  borrar: () => localStorage.removeItem(CLAVE_TOKEN),
};

export class ErrorApi extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

/** Se dispara cuando el servidor rechaza la sesión, para volver al login. */
export const alExpirarSesion = new EventTarget();

async function pedir<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = tokenGuardado.get();
  const res = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const datos = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && token) alExpirarSesion.dispatchEvent(new Event("expirada"));
    throw new ErrorApi(res.status, mensajeDeError(datos));
  }
  return datos as T;
}

function mensajeDeError(datos: unknown): string {
  const detalle = (datos as { detail?: unknown } | null)?.detail;
  if (typeof detalle === "string") return detalle;
  if (Array.isArray(detalle)) {
    const campo = detalle[0]?.loc?.at(-1);
    if (campo === "email") return "El correo no es válido";
    if (campo === "password") return "La contraseña debe tener al menos 6 caracteres";
    return "Revisa los datos introducidos";
  }
  return "Algo salió mal. Inténtalo de nuevo.";
}

type Sesion = { token: string; usuario: Usuario };

export const api = {
  registro: (nombre: string, email: string, password: string) =>
    pedir<Sesion>("POST", "/auth/registro", { nombre, email, password }),
  login: (email: string, password: string) => pedir<Sesion>("POST", "/auth/login", { email, password }),
  yo: () => pedir<Usuario>("GET", "/auth/yo"),

  espacios: () => pedir<Espacio[]>("GET", "/espacios"),
  crearEspacio: (nombre: string, color: string) => pedir<Espacio>("POST", "/espacios", { nombre, color }),
  editarEspacio: (id: number, datos: { nombre?: string; color?: string }) =>
    pedir<Espacio>("PATCH", `/espacios/${id}`, datos),
  eliminarEspacio: (id: number) => pedir<void>("DELETE", `/espacios/${id}`),
  miembros: (id: number) => pedir<Usuario[]>("GET", `/espacios/${id}/miembros`),
  agregarMiembro: (id: number, email: string) => pedir<Usuario[]>("POST", `/espacios/${id}/miembros`, { email }),
  quitarMiembro: (id: number, usuarioId: number) =>
    pedir<Usuario[]>("DELETE", `/espacios/${id}/miembros/${usuarioId}`),

  crearLista: (espacioId: number, nombre: string) =>
    pedir<ListaResumen>("POST", `/espacios/${espacioId}/listas`, { nombre }),
  lista: (id: number) => pedir<Lista>("GET", `/listas/${id}`),
  renombrarLista: (id: number, nombre: string) => pedir<Lista>("PATCH", `/listas/${id}`, { nombre }),
  eliminarLista: (id: number) => pedir<void>("DELETE", `/listas/${id}`),

  crearEstado: (listaId: number, datos: { nombre: string; color: string; es_final?: boolean }) =>
    pedir<Estado>("POST", `/listas/${listaId}/estados`, datos),
  editarEstado: (id: number, datos: Partial<Omit<Estado, "id">>) => pedir<Estado>("PATCH", `/estados/${id}`, datos),
  eliminarEstado: (id: number) => pedir<void>("DELETE", `/estados/${id}`),

  tareas: (listaId: number, filtros: Record<string, string | number | undefined> = {}) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(filtros)) if (v !== undefined && v !== "") params.set(k, String(v));
    const qs = params.toString();
    return pedir<TareaResumen[]>("GET", `/listas/${listaId}/tareas${qs ? `?${qs}` : ""}`);
  },
  crearTarea: (listaId: number, datos: TareaNueva) => pedir<TareaResumen>("POST", `/listas/${listaId}/tareas`, datos),
  tarea: (id: number) => pedir<TareaDetalle>("GET", `/tareas/${id}`),
  editarTarea: (id: number, datos: TareaPatch) => pedir<TareaResumen>("PATCH", `/tareas/${id}`, datos),
  eliminarTarea: (id: number) => pedir<void>("DELETE", `/tareas/${id}`),
  misTareas: () => pedir<TareaResumen[]>("GET", "/tareas/mias"),
  buscar: (q: string) => pedir<TareaResumen[]>("GET", `/tareas/buscar?q=${encodeURIComponent(q)}`),

  comentar: (tareaId: number, contenido: string) =>
    pedir<Comentario>("POST", `/tareas/${tareaId}/comentarios`, { contenido }),
  eliminarComentario: (id: number) => pedir<void>("DELETE", `/comentarios/${id}`),
};
