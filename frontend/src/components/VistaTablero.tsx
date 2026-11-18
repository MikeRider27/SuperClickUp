import { useEffect, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Estado, Lista, TareaResumen } from "../api/types";
import { BanderaPrioridad, Fecha, GrupoAvatares, useEditarTarea } from "./comunes";
import NuevaTarea from "./NuevaTarea";
import { Contadores, useAbrirTarea } from "./VistaLista";

type Columnas = Record<number, TareaResumen[]>;

const idColumna = (estadoId: number) => `col-${estadoId}`;

function agrupar(tareas: TareaResumen[], estados: Estado[]): Columnas {
  const cols: Columnas = Object.fromEntries(estados.map((e) => [e.id, []]));
  for (const t of tareas) cols[t.estado.id]?.push(t);
  return cols;
}

/** Posición intermedia entre los vecinos, para no tener que renumerar toda la lista. */
function posicionEntre(antes?: TareaResumen, despues?: TareaResumen) {
  if (antes && despues) return (antes.posicion + despues.posicion) / 2;
  if (antes) return antes.posicion + 1000;
  if (despues) return despues.posicion - 1000;
  return 1000;
}

function Tarjeta({ tarea, fantasma }: { tarea: TareaResumen; fantasma?: boolean }) {
  return (
    <div className={`tarjeta ${fantasma ? "tarjeta-arrastrada" : ""}`}>
      <div className={`tarjeta-titulo ${tarea.estado.es_final ? "tachada" : ""}`}>{tarea.titulo}</div>
      <div className="tarjeta-pie">
        <GrupoAvatares usuarios={tarea.asignados} />
        <Fecha iso={tarea.fecha_vencimiento} completada={tarea.estado.es_final} />
        {tarea.prioridad && <BanderaPrioridad prioridad={tarea.prioridad} />}
        <span className="separador" />
        <Contadores tarea={tarea} />
      </div>
    </div>
  );
}

function TarjetaOrdenable({ tarea }: { tarea: TareaResumen }) {
  const abrir = useAbrirTarea();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: tarea.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      {...attributes}
      {...listeners}
      onClick={() => abrir(tarea.id)}
    >
      <Tarjeta tarea={tarea} />
    </div>
  );
}

function Columna({ estado, tareas, listaId }: { estado: Estado; tareas: TareaResumen[]; listaId: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: idColumna(estado.id) });
  return (
    <div
      className={`columna ${isOver ? "columna-activa" : ""}`}
      style={{ "--color-estado": estado.color } as CSSProperties}
    >
      <div className="columna-cabecera">
        <span className="pildora-estado" style={{ background: estado.color }}>
          {estado.nombre}
        </span>
        <span className="tenue">{tareas.length}</span>
      </div>
      <SortableContext items={tareas.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="columna-tareas">
          {tareas.map((t) => (
            <TarjetaOrdenable key={t.id} tarea={t} />
          ))}
        </div>
      </SortableContext>
      <NuevaTarea listaId={listaId} estadoId={estado.id} />
    </div>
  );
}

export default function VistaTablero({ lista, tareas }: { lista: Lista; tareas: TareaResumen[] }) {
  const editar = useEditarTarea();
  const [columnas, setColumnas] = useState<Columnas>(() => agrupar(tareas, lista.estados));
  const [activa, setActiva] = useState<TareaResumen | null>(null);

  // Sincroniza con el servidor, salvo en medio de un arrastre
  useEffect(() => {
    if (!activa) setColumnas(agrupar(tareas, lista.estados));
  }, [tareas, lista.estados]);

  const sensores = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const columnaDe = (id: UniqueIdentifier, cols = columnas): number | undefined => {
    if (typeof id === "string" && id.startsWith("col-")) return Number(id.slice(4));
    return lista.estados.find((e) => cols[e.id]?.some((t) => t.id === id))?.id;
  };

  const alIniciar = ({ active }: DragStartEvent) => {
    setActiva(tareas.find((t) => t.id === active.id) ?? null);
  };

  // Mover la tarjeta entre columnas mientras se arrastra
  const alPasar = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    setColumnas((cols) => {
      const origen = columnaDe(active.id, cols);
      const destino = columnaDe(over.id, cols);
      if (origen === undefined || destino === undefined || origen === destino) return cols;
      const tarea = cols[origen]!.find((t) => t.id === active.id)!;
      const destinoLista = cols[destino]!;
      const indice = destinoLista.findIndex((t) => t.id === over.id);
      const nuevoDestino = [...destinoLista];
      nuevoDestino.splice(indice >= 0 ? indice : destinoLista.length, 0, tarea);
      return { ...cols, [origen]: cols[origen]!.filter((t) => t.id !== active.id), [destino]: nuevoDestino };
    });
  };

  const alSoltar = ({ active, over }: DragEndEvent) => {
    const original = activa;
    setActiva(null);
    const estadoId = columnaDe(active.id);
    if (!over || !original || estadoId === undefined) {
      setColumnas(agrupar(tareas, lista.estados));
      return;
    }

    let col = columnas[estadoId]!;
    const desde = col.findIndex((t) => t.id === active.id);
    const hasta = col.findIndex((t) => t.id === over.id);
    if (hasta >= 0 && desde !== hasta) col = arrayMove(col, desde, hasta);

    const i = col.findIndex((t) => t.id === active.id);
    const estado = lista.estados.find((e) => e.id === estadoId)!;
    const posicion = posicionEntre(col[i - 1], col[i + 1]);
    col = col.map((t) => (t.id === active.id ? { ...t, posicion, estado } : t));
    setColumnas((c) => ({ ...c, [estadoId]: col }));

    if (estadoId !== original.estado.id || (hasta >= 0 && desde !== hasta)) {
      editar.mutate({ id: original.id, datos: { estado_id: estadoId, posicion }, optimista: { estado } });
    }
  };

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={closestCorners}
      onDragStart={alIniciar}
      onDragOver={alPasar}
      onDragEnd={alSoltar}
      onDragCancel={() => {
        setActiva(null);
        setColumnas(agrupar(tareas, lista.estados));
      }}
    >
      <div className="tablero">
        {lista.estados.map((e) => (
          <Columna key={e.id} estado={e} tareas={columnas[e.id] ?? []} listaId={lista.id} />
        ))}
      </div>
      <DragOverlay>{activa && <Tarjeta tarea={activa} fantasma />}</DragOverlay>
    </DndContext>
  );
}
