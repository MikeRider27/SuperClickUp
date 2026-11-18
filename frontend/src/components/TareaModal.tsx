import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowUpLeft, Calendar, CircleDot, Flag, MessageSquare, Plus, Trash2, Users, X } from "lucide-react";
import { api } from "../api/client";
import type { TareaPatch, TareaResumen } from "../api/types";
import { useAuth } from "../auth";
import {
  Avatar,
  BanderaPrioridad,
  Fecha,
  GrupoAvatares,
  Modal,
  SelectorAsignados,
  SelectorEstado,
  SelectorPrioridad,
  invalidarTareas,
  useEditarTarea,
} from "./comunes";

export default function TareaModal({ tareaId, onCerrar }: { tareaId: number; onCerrar: () => void }) {
  const qc = useQueryClient();
  const { usuario } = useAuth();
  const [, setParams] = useSearchParams();
  const { data: tarea, error } = useQuery({ queryKey: ["tarea", tareaId], queryFn: () => api.tarea(tareaId) });
  const { data: lista } = useQuery({
    queryKey: ["lista", tarea?.lista_id],
    queryFn: () => api.lista(tarea!.lista_id),
    enabled: !!tarea,
  });

  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [nuevaSub, setNuevaSub] = useState("");
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    if (tarea) {
      setTitulo(tarea.titulo);
      setDescripcion(tarea.descripcion);
    }
    // Solo al cargar otra tarea, para no pisar lo que el usuario está escribiendo
  }, [tarea?.id]);

  const editar = useEditarTarea();
  const guardar = (datos: TareaPatch, id = tareaId, optimista?: Partial<TareaResumen>) =>
    editar.mutate({ id, datos, optimista });

  const crearSub = useMutation({
    mutationFn: (t: string) => api.crearTarea(tarea!.lista_id, { titulo: t, padre_id: tareaId }),
    onSuccess: () => {
      setNuevaSub("");
      invalidarTareas(qc);
    },
  });

  const comentar = useMutation({
    mutationFn: (texto: string) => api.comentar(tareaId, texto),
    onSuccess: () => {
      setComentario("");
      invalidarTareas(qc);
    },
  });

  const borrarComentario = useMutation({
    mutationFn: api.eliminarComentario,
    onSuccess: () => invalidarTareas(qc),
  });

  const eliminar = useMutation({
    mutationFn: () => api.eliminarTarea(tareaId),
    onSuccess: () => {
      onCerrar();
      invalidarTareas(qc);
    },
  });

  const abrirTarea = (id: number) =>
    setParams((p) => {
      p.set("tarea", String(id));
      return p;
    });

  if (error) {
    return (
      <Modal titulo="Tarea no disponible" onCerrar={onCerrar}>
        <p className="tenue">{error.message}</p>
      </Modal>
    );
  }
  if (!tarea || !lista) {
    return (
      <Modal onCerrar={onCerrar} ancho={1000}>
        <div className="cargando-modal">Cargando…</div>
      </Modal>
    );
  }

  const estadoFinal = lista.estados.find((e) => e.es_final) ?? lista.estados.at(-1)!;
  const estadoInicial = lista.estados.find((e) => !e.es_final) ?? lista.estados[0]!;
  const guardarTitulo = () => {
    const t = titulo.trim();
    if (t && t !== tarea.titulo) guardar({ titulo: t });
    else setTitulo(tarea.titulo);
  };

  return (
    <Modal onCerrar={onCerrar} ancho={1060}>
      <div className="tarea-modal">
        <div className="tarea-cabecera">
          <div className="migas tenue">
            {lista.espacio_nombre} / {lista.nombre}
            {tarea.padre_id && (
              <button className="enlace" onClick={() => abrirTarea(tarea.padre_id!)}>
                <ArrowUpLeft size={13} /> Ir a la tarea principal
              </button>
            )}
          </div>
          <div className="tarea-cabecera-acciones">
            <button
              className="boton-icono"
              title="Eliminar tarea"
              onClick={() => confirm("¿Eliminar esta tarea y sus subtareas?") && eliminar.mutate()}
            >
              <Trash2 size={17} />
            </button>
            <button className="boton-icono" title="Cerrar" onClick={onCerrar}>
              <X size={19} />
            </button>
          </div>
        </div>

        <div className="tarea-cuerpo">
          <section className="tarea-principal">
            <textarea
              className="titulo-tarea"
              rows={1}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={guardarTitulo}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />

            <div className="propiedades">
              <div className="propiedad">
                <span className="propiedad-nombre">
                  <CircleDot size={15} /> Estado
                </span>
                <SelectorEstado
                  estados={lista.estados}
                  actual={tarea.estado}
                  onCambio={(e) => guardar({ estado_id: e.id }, tareaId, { estado: e })}
                />
              </div>
              <div className="propiedad">
                <span className="propiedad-nombre">
                  <Users size={15} /> Asignados
                </span>
                <SelectorAsignados
                  miembros={lista.miembros}
                  asignados={tarea.asignados}
                  onCambio={(ids) =>
                    guardar({ asignados: ids }, tareaId, {
                      asignados: lista.miembros.filter((m) => ids.includes(m.id)),
                    })
                  }
                >
                  {tarea.asignados.length ? (
                    <span className="asignados-texto">
                      <GrupoAvatares usuarios={tarea.asignados} max={5} />
                    </span>
                  ) : (
                    <span className="tenue">Sin asignar</span>
                  )}
                </SelectorAsignados>
              </div>
              <div className="propiedad">
                <span className="propiedad-nombre">
                  <Calendar size={15} /> Fechas
                </span>
                <span className="fechas-editor">
                  <input
                    type="date"
                    value={tarea.fecha_inicio ?? ""}
                    max={tarea.fecha_vencimiento ?? undefined}
                    onChange={(e) => guardar({ fecha_inicio: e.target.value || null })}
                    title="Fecha de inicio"
                  />
                  →
                  <input
                    type="date"
                    value={tarea.fecha_vencimiento ?? ""}
                    min={tarea.fecha_inicio ?? undefined}
                    onChange={(e) => guardar({ fecha_vencimiento: e.target.value || null })}
                    title="Fecha de vencimiento"
                  />
                </span>
              </div>
              <div className="propiedad">
                <span className="propiedad-nombre">
                  <Flag size={15} /> Prioridad
                </span>
                <SelectorPrioridad actual={tarea.prioridad} conTexto onCambio={(p) => guardar({ prioridad: p })} />
              </div>
            </div>

            <textarea
              className="descripcion"
              placeholder="Añade una descripción…"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              onBlur={() => descripcion !== tarea.descripcion && guardar({ descripcion })}
            />

            {!tarea.padre_id && (
              <div className="subtareas">
                <h3>
                  Subtareas
                  {tarea.num_subtareas > 0 && (
                    <span className="tenue">
                      {" "}
                      {tarea.num_subtareas_hechas}/{tarea.num_subtareas}
                    </span>
                  )}
                </h3>
                {tarea.num_subtareas > 0 && (
                  <div className="barra-progreso">
                    <div style={{ width: `${(tarea.num_subtareas_hechas / tarea.num_subtareas) * 100}%` }} />
                  </div>
                )}
                {tarea.subtareas.map((s) => {
                  const hecha = s.estado.es_final;
                  return (
                    <div key={s.id} className="subtarea">
                      <input
                        type="checkbox"
                        checked={hecha}
                        onChange={() => {
                          const nuevo = hecha ? estadoInicial : estadoFinal;
                          guardar({ estado_id: nuevo.id }, s.id, { estado: nuevo });
                        }}
                      />
                      <button className={`subtarea-titulo ${hecha ? "tachada" : ""}`} onClick={() => abrirTarea(s.id)}>
                        {s.titulo}
                      </button>
                      <Fecha iso={s.fecha_vencimiento} completada={hecha} />
                      <BanderaPrioridad prioridad={s.prioridad} />
                      <GrupoAvatares usuarios={s.asignados} />
                    </div>
                  );
                })}
                <form
                  className="nueva-subtarea"
                  onSubmit={(e: FormEvent) => {
                    e.preventDefault();
                    if (nuevaSub.trim()) crearSub.mutate(nuevaSub.trim());
                  }}
                >
                  <Plus size={15} className="tenue" />
                  <input
                    placeholder="Añadir subtarea y pulsar Enter"
                    value={nuevaSub}
                    onChange={(e) => setNuevaSub(e.target.value)}
                  />
                </form>
              </div>
            )}
          </section>

          <aside className="tarea-actividad">
            <h3>
              <MessageSquare size={16} /> Actividad
            </h3>
            <div className="comentarios">
              <div className="evento tenue">
                {tarea.creador.nombre} creó esta tarea ·{" "}
                {formatDistanceToNow(parseISO(tarea.creado_en), { locale: es, addSuffix: true })}
              </div>
              {tarea.comentarios.map((c) => (
                <div key={c.id} className="comentario">
                  <Avatar usuario={c.autor} tam={26} />
                  <div className="comentario-cuerpo">
                    <div className="comentario-meta">
                      <strong>{c.autor.nombre}</strong>
                      <span className="tenue">
                        {formatDistanceToNow(parseISO(c.creado_en), { locale: es, addSuffix: true })}
                      </span>
                      {c.autor.id === usuario?.id && (
                        <button
                          className="boton-icono mini"
                          title="Eliminar comentario"
                          onClick={() => borrarComentario.mutate(c.id)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <p>{c.contenido}</p>
                  </div>
                </div>
              ))}
            </div>
            <form
              className="nuevo-comentario"
              onSubmit={(e: FormEvent) => {
                e.preventDefault();
                if (comentario.trim()) comentar.mutate(comentario.trim());
              }}
            >
              <textarea
                placeholder="Escribe un comentario… (Enter para enviar)"
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <button className="boton-primario" disabled={!comentario.trim() || comentar.isPending}>
                Comentar
              </button>
            </form>
          </aside>
        </div>
      </div>
    </Modal>
  );
}
