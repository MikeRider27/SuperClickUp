import { useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronRight, GitBranch, MessageSquare } from "lucide-react";
import type { Lista, TareaResumen } from "../api/types";
import { FechaEditable, SelectorAsignados, SelectorEstado, SelectorPrioridad, useEditarTarea } from "./comunes";
import NuevaTarea from "./NuevaTarea";

export function useAbrirTarea() {
  const [, setParams] = useSearchParams();
  return (id: number) =>
    setParams((p) => {
      p.set("tarea", String(id));
      return p;
    });
}

export function Contadores({ tarea }: { tarea: TareaResumen }) {
  return (
    <>
      {tarea.num_subtareas > 0 && (
        <span className="contador" title="Subtareas completadas">
          <GitBranch size={13} /> {tarea.num_subtareas_hechas}/{tarea.num_subtareas}
        </span>
      )}
      {tarea.num_comentarios > 0 && (
        <span className="contador" title="Comentarios">
          <MessageSquare size={13} /> {tarea.num_comentarios}
        </span>
      )}
    </>
  );
}

export default function VistaLista({ lista, tareas }: { lista: Lista; tareas: TareaResumen[] }) {
  const [plegados, setPlegados] = useState<Set<number>>(new Set());
  const editar = useEditarTarea();
  const abrir = useAbrirTarea();

  return (
    <div className="vista-lista">
      {lista.estados.map((estado) => {
        const delEstado = tareas.filter((t) => t.estado.id === estado.id);
        const plegado = plegados.has(estado.id);
        return (
          <section key={estado.id} className="grupo" style={{ "--color-estado": estado.color } as CSSProperties}>
            <div className="grupo-cabecera">
              <button
                className="boton-limpio"
                onClick={() =>
                  setPlegados((p) => {
                    const n = new Set(p);
                    n.has(estado.id) ? n.delete(estado.id) : n.add(estado.id);
                    return n;
                  })
                }
              >
                {plegado ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                <span className="pildora-estado" style={{ background: estado.color }}>
                  {estado.nombre}
                </span>
                <span className="tenue">{delEstado.length}</span>
              </button>
            </div>

            {!plegado && (
              <div className="tabla">
                {delEstado.length > 0 && (
                  <div className="fila fila-cabecera">
                    <span>Nombre</span>
                    <span>Asignados</span>
                    <span>Vencimiento</span>
                    <span>Prioridad</span>
                  </div>
                )}
                {delEstado.map((t) => (
                  <div key={t.id} className="fila" onClick={() => abrir(t.id)}>
                    <span className="celda-nombre">
                      <SelectorEstado
                        estados={lista.estados}
                        actual={t.estado}
                        onCambio={(e) =>
                          editar.mutate({ id: t.id, datos: { estado_id: e.id }, optimista: { estado: e } })
                        }
                      >
                        <span className="punto-estado" style={{ borderColor: t.estado.color }} title="Cambiar estado" />
                      </SelectorEstado>
                      <span className={`truncar ${t.estado.es_final ? "tachada" : ""}`}>{t.titulo}</span>
                      <Contadores tarea={t} />
                    </span>
                    <span>
                      <SelectorAsignados
                        miembros={lista.miembros}
                        asignados={t.asignados}
                        onCambio={(ids) =>
                          editar.mutate({
                            id: t.id,
                            datos: { asignados: ids },
                            optimista: { asignados: lista.miembros.filter((m) => ids.includes(m.id)) },
                          })
                        }
                      />
                    </span>
                    <span>
                      <FechaEditable
                        iso={t.fecha_vencimiento}
                        completada={t.estado.es_final}
                        onCambio={(f) => editar.mutate({ id: t.id, datos: { fecha_vencimiento: f } })}
                      />
                    </span>
                    <span>
                      <SelectorPrioridad
                        actual={t.prioridad}
                        conTexto
                        onCambio={(p) => editar.mutate({ id: t.id, datos: { prioridad: p } })}
                      />
                    </span>
                  </div>
                ))}
                <NuevaTarea listaId={lista.id} estadoId={estado.id} />
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
