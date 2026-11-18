import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { api } from "../api/client";
import { invalidarTareas } from "./comunes";

/** Botón "+ Nueva tarea" que se convierte en un campo de texto para crear tareas rápido. */
export default function NuevaTarea({ listaId, estadoId }: { listaId: number; estadoId: number }) {
  const qc = useQueryClient();
  const [abierta, setAbierta] = useState(false);
  const [titulo, setTitulo] = useState("");

  const crear = useMutation({
    mutationFn: (t: string) => api.crearTarea(listaId, { titulo: t, estado_id: estadoId }),
    onSuccess: () => {
      setTitulo("");
      invalidarTareas(qc);
    },
  });

  if (!abierta) {
    return (
      <button className="nueva-tarea-boton" onClick={() => setAbierta(true)}>
        <Plus size={14} /> Nueva tarea
      </button>
    );
  }

  return (
    <form
      className="nueva-tarea-form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        if (titulo.trim()) crear.mutate(titulo.trim());
      }}
    >
      <input
        autoFocus
        placeholder="Nombre de la tarea y Enter (Esc para cancelar)"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setAbierta(false)}
        onBlur={() => !titulo.trim() && setAbierta(false)}
        disabled={crear.isPending}
      />
      <button className="boton-primario">Guardar</button>
    </form>
  );
}
