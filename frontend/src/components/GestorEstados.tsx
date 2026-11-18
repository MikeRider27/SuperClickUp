import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { api } from "../api/client";
import type { Estado, Lista } from "../api/types";
import { Modal, invalidarTareas } from "./comunes";

const COLORES_ESTADO = ["#87909e", "#5f55ee", "#0086c0", "#f8ae00", "#ff7800", "#e2445c", "#ff5ac4", "#00b884"];

export default function GestorEstados({ lista, onCerrar }: { lista: Lista; onCerrar: () => void }) {
  const qc = useQueryClient();
  const [nuevo, setNuevo] = useState("");
  const [error, setError] = useState("");

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["lista", lista.id] });
    invalidarTareas(qc);
  };
  const alFallar = (e: Error) => setError(e.message);

  const editar = useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Partial<Omit<Estado, "id">> }) => api.editarEstado(id, datos),
    onSuccess: refrescar,
    onError: alFallar,
  });
  const crear = useMutation({
    mutationFn: () =>
      api.crearEstado(lista.id, {
        nombre: nuevo.trim(),
        color: COLORES_ESTADO[lista.estados.length % COLORES_ESTADO.length]!,
      }),
    onSuccess: () => {
      setNuevo("");
      refrescar();
    },
    onError: alFallar,
  });
  const eliminar = useMutation({ mutationFn: api.eliminarEstado, onSuccess: refrescar, onError: alFallar });

  // Intercambia la posición con el vecino
  const mover = (i: number, dir: -1 | 1) => {
    const a = lista.estados[i]!;
    const b = lista.estados[i + dir]!;
    editar.mutate({ id: a.id, datos: { posicion: b.posicion } });
    editar.mutate({ id: b.id, datos: { posicion: a.posicion } });
  };

  return (
    <Modal titulo={`Estados de "${lista.nombre}"`} onCerrar={onCerrar} ancho={520}>
      <div className="formulario">
        <p className="ayuda">
          Los estados son las columnas del tablero. Marca como <strong>final</strong> los que significan que la tarea
          está terminada.
        </p>
        <ul className="lista-estados">
          {lista.estados.map((e, i) => (
            <li key={e.id}>
              <label className="color-estado" style={{ background: e.color }} title="Cambiar color">
                <input
                  type="color"
                  value={e.color}
                  onChange={(ev) => editar.mutate({ id: e.id, datos: { color: ev.target.value } })}
                />
              </label>
              <input
                className="nombre-estado"
                defaultValue={e.nombre}
                onBlur={(ev) => {
                  const v = ev.target.value.trim();
                  if (v && v !== e.nombre) editar.mutate({ id: e.id, datos: { nombre: v } });
                  else ev.target.value = e.nombre;
                }}
              />
              <label className="check-final">
                <input
                  type="checkbox"
                  checked={e.es_final}
                  onChange={(ev) => editar.mutate({ id: e.id, datos: { es_final: ev.target.checked } })}
                />
                Final
              </label>
              <button className="boton-icono" disabled={i === 0} onClick={() => mover(i, -1)} title="Subir">
                <ArrowUp size={15} />
              </button>
              <button
                className="boton-icono"
                disabled={i === lista.estados.length - 1}
                onClick={() => mover(i, 1)}
                title="Bajar"
              >
                <ArrowDown size={15} />
              </button>
              <button
                className="boton-icono"
                disabled={lista.estados.length === 1}
                title="Eliminar estado"
                onClick={() =>
                  confirm(`¿Eliminar "${e.nombre}"? Sus tareas pasarán al primer estado.`) && eliminar.mutate(e.id)
                }
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
        <form
          className="fila-invitar"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (nuevo.trim()) crear.mutate();
          }}
        >
          <input placeholder="Nuevo estado, p. ej. Bloqueado" value={nuevo} onChange={(e) => setNuevo(e.target.value)} />
          <button className="boton-primario">Añadir</button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
    </Modal>
  );
}
