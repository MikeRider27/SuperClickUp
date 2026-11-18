import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, isPast, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Check, Flag, UserPlus, X } from "lucide-react";
import { api } from "../api/client";
import type { Estado, Prioridad, TareaDetalle, TareaPatch, TareaResumen, Usuario } from "../api/types";

// ---------- Prioridades ----------

export const PRIORIDADES: Record<Prioridad, { etiqueta: string; color: string }> = {
  urgente: { etiqueta: "Urgente", color: "#f50000" },
  alta: { etiqueta: "Alta", color: "#f8ae00" },
  normal: { etiqueta: "Normal", color: "#6fddff" },
  baja: { etiqueta: "Baja", color: "#a3a8b4" },
};

export function BanderaPrioridad({ prioridad, conTexto }: { prioridad: Prioridad | null; conTexto?: boolean }) {
  if (!prioridad) return conTexto ? <span className="tenue">Sin prioridad</span> : <Flag size={15} className="tenue" />;
  const p = PRIORIDADES[prioridad];
  return (
    <span className="bandera" title={`Prioridad ${p.etiqueta.toLowerCase()}`}>
      <Flag size={15} color={p.color} fill={p.color} />
      {conTexto && p.etiqueta}
    </span>
  );
}

// ---------- Usuarios ----------

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function Avatar({ usuario, tam = 24 }: { usuario: Usuario; tam?: number }) {
  return (
    <span
      className="avatar"
      title={usuario.nombre}
      style={{ background: usuario.color, width: tam, height: tam, fontSize: tam * 0.42 }}
    >
      {iniciales(usuario.nombre)}
    </span>
  );
}

export function GrupoAvatares({ usuarios, max = 3 }: { usuarios: Usuario[]; max?: number }) {
  if (usuarios.length === 0) return <UserPlus size={16} className="tenue" />;
  return (
    <span className="grupo-avatares">
      {usuarios.slice(0, max).map((u) => (
        <Avatar key={u.id} usuario={u} />
      ))}
      {usuarios.length > max && <span className="avatar avatar-mas">+{usuarios.length - max}</span>}
    </span>
  );
}

// ---------- Fechas ----------

export function textoFecha(iso: string) {
  const f = parseISO(iso);
  if (isToday(f)) return "Hoy";
  if (isTomorrow(f)) return "Mañana";
  if (isYesterday(f)) return "Ayer";
  return format(f, f.getFullYear() === new Date().getFullYear() ? "d MMM" : "d MMM yyyy", { locale: es });
}

export function estaVencida(iso: string | null, completada: boolean) {
  if (!iso || completada) return false;
  const f = parseISO(iso);
  return isPast(f) && !isToday(f);
}

export function Fecha({ iso, completada }: { iso: string | null; completada: boolean }) {
  if (!iso) return null;
  const vencida = estaVencida(iso, completada);
  const hoy = isToday(parseISO(iso));
  return (
    <span className={`fecha ${vencida ? "vencida" : ""} ${hoy && !completada ? "hoy" : ""}`}>{textoFecha(iso)}</span>
  );
}

/** Muestra la fecha y abre el selector nativo del navegador al hacer clic. */
export function FechaEditable({
  iso,
  completada,
  onCambio,
}: {
  iso: string | null;
  completada: boolean;
  onCambio: (iso: string | null) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <span className="fecha-editable" onClick={(e) => e.stopPropagation()}>
      <button type="button" className="boton-limpio" onClick={() => ref.current?.showPicker()} title="Fecha de vencimiento">
        {iso ? <Fecha iso={iso} completada={completada} /> : <Calendar size={15} className="tenue" />}
      </button>
      <input ref={ref} type="date" tabIndex={-1} value={iso ?? ""} onChange={(e) => onCambio(e.target.value || null)} />
    </span>
  );
}

// ---------- Estado ----------

export function PildoraEstado({ estado }: { estado: Estado }) {
  return (
    <span className="pildora-estado" style={{ background: estado.color }}>
      {estado.nombre}
    </span>
  );
}

// ---------- Desplegable ----------

export function Desplegable({
  disparador,
  children,
  alineacion = "izquierda",
}: {
  disparador: (abrir: () => void) => ReactNode;
  children: (cerrar: () => void) => ReactNode;
  alineacion?: "izquierda" | "derecha";
}) {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", esc);
    };
  }, [abierto]);

  return (
    <div className="desplegable" ref={ref} onClick={(e) => e.stopPropagation()}>
      {disparador(() => setAbierto((a) => !a))}
      {abierto && <div className={`menu menu-${alineacion}`}>{children(() => setAbierto(false))}</div>}
    </div>
  );
}

export function SelectorEstado({
  estados,
  actual,
  onCambio,
  children,
}: {
  estados: Estado[];
  actual: Estado;
  onCambio: (e: Estado) => void;
  children?: ReactNode;
}) {
  return (
    <Desplegable
      disparador={(abrir) => (
        <button type="button" className="boton-limpio" onClick={abrir}>
          {children ?? <PildoraEstado estado={actual} />}
        </button>
      )}
    >
      {(cerrar) =>
        estados.map((e) => (
          <button
            type="button"
            key={e.id}
            className="menu-item"
            onClick={() => {
              cerrar();
              if (e.id !== actual.id) onCambio(e);
            }}
          >
            <span className="punto" style={{ background: e.color }} />
            {e.nombre}
            {e.id === actual.id && <Check size={14} className="menu-check" />}
          </button>
        ))
      }
    </Desplegable>
  );
}

export function SelectorPrioridad({
  actual,
  onCambio,
  conTexto,
}: {
  actual: Prioridad | null;
  onCambio: (p: Prioridad | null) => void;
  conTexto?: boolean;
}) {
  return (
    <Desplegable
      disparador={(abrir) => (
        <button type="button" className="boton-limpio" onClick={abrir} title="Prioridad">
          <BanderaPrioridad prioridad={actual} conTexto={conTexto} />
        </button>
      )}
    >
      {(cerrar) => (
        <>
          {(Object.keys(PRIORIDADES) as Prioridad[]).map((p) => (
            <button
              type="button"
              key={p}
              className="menu-item"
              onClick={() => {
                cerrar();
                onCambio(p);
              }}
            >
              <BanderaPrioridad prioridad={p} conTexto />
              {p === actual && <Check size={14} className="menu-check" />}
            </button>
          ))}
          {actual && (
            <button
              type="button"
              className="menu-item"
              onClick={() => {
                cerrar();
                onCambio(null);
              }}
            >
              <X size={15} /> Quitar prioridad
            </button>
          )}
        </>
      )}
    </Desplegable>
  );
}

export function SelectorAsignados({
  miembros,
  asignados,
  onCambio,
  children,
}: {
  miembros: Usuario[];
  asignados: Usuario[];
  onCambio: (ids: number[]) => void;
  children?: ReactNode;
}) {
  const ids = asignados.map((a) => a.id);
  return (
    <Desplegable
      disparador={(abrir) => (
        <button type="button" className="boton-limpio" onClick={abrir} title="Asignar">
          {children ?? <GrupoAvatares usuarios={asignados} />}
        </button>
      )}
    >
      {() =>
        miembros.map((m) => {
          const marcado = ids.includes(m.id);
          return (
            <button
              type="button"
              key={m.id}
              className="menu-item"
              onClick={() => onCambio(marcado ? ids.filter((i) => i !== m.id) : [...ids, m.id])}
            >
              <Avatar usuario={m} tam={22} />
              {m.nombre}
              {marcado && <Check size={14} className="menu-check" />}
            </button>
          );
        })
      }
    </Desplegable>
  );
}

// ---------- Modal ----------

export function Modal({
  titulo,
  onCerrar,
  children,
  ancho = 440,
}: {
  titulo?: ReactNode;
  onCerrar: () => void;
  children: ReactNode;
  ancho?: number;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector(".menu")) onCerrar();
    };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onCerrar]);

  return createPortal(
    <div className="modal-fondo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div className="modal" style={{ maxWidth: ancho }}>
        {titulo !== undefined && (
          <div className="modal-cabecera">
            <h2>{titulo}</h2>
            <button type="button" className="boton-icono" onClick={onCerrar} aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}

// ---------- Mutaciones de tareas ----------

type EdicionTarea = {
  id: number;
  datos: TareaPatch;
  /** Valores para pintar al instante (p. ej. el objeto Estado o los Usuarios asignados). */
  optimista?: Partial<TareaResumen>;
};

/**
 * Edita una tarea, aplicando el cambio en la caché al momento para que la
 * interfaz responda sin esperar al servidor, y luego refresca todas las vistas.
 */
export function useEditarTarea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: EdicionTarea) => api.editarTarea(id, datos),
    onMutate: ({ id, datos, optimista }) => {
      const { estado_id: _e, asignados: _a, ...simples } = datos;
      const cambios = { ...simples, ...optimista } as Partial<TareaResumen>;
      const aplicar = <T extends TareaResumen>(t: T): T => (t.id === id ? { ...t, ...cambios } : t);
      // Sin await: el cambio debe verse en el mismo render del clic
      qc.cancelQueries({ queryKey: ["tareas"] }, { revert: false });
      qc.cancelQueries({ queryKey: ["tarea"] }, { revert: false });
      qc.setQueriesData<TareaResumen[]>({ queryKey: ["tareas"] }, (viejas) => viejas?.map(aplicar));
      qc.setQueriesData<TareaDetalle>({ queryKey: ["tarea"] }, (d) =>
        d ? { ...aplicar(d), subtareas: d.subtareas.map(aplicar) } : d,
      );
    },
    onSettled: () => invalidarTareas(qc),
  });
}

export function invalidarTareas(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["tareas"] });
  qc.invalidateQueries({ queryKey: ["tarea"] });
  qc.invalidateQueries({ queryKey: ["mias"] });
}
