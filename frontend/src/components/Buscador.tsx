import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../api/client";
import { BanderaPrioridad, Modal, PildoraEstado } from "./comunes";

export default function Buscador({ onCerrar }: { onCerrar: () => void }) {
  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const navegar = useNavigate();

  // Espera a que el usuario deje de escribir antes de buscar
  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 250);
    return () => clearTimeout(t);
  }, [texto]);

  const { data: resultados = [], isFetching } = useQuery({
    queryKey: ["buscar", q],
    queryFn: () => api.buscar(q),
    enabled: q.length > 0,
  });

  return (
    <Modal onCerrar={onCerrar} ancho={600}>
      <div className="buscador">
        <div className="buscador-entrada">
          <Search size={18} className="tenue" />
          <input
            autoFocus
            placeholder="Buscar tareas por título o descripción…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <div className="buscador-resultados">
          {q && !isFetching && resultados.length === 0 && <p className="tenue centrado">Sin resultados para "{q}"</p>}
          {resultados.map((t) => (
            <button
              key={t.id}
              className="resultado"
              onClick={() => {
                onCerrar();
                navegar(`/lista/${t.lista_id}?tarea=${t.id}`);
              }}
            >
              <PildoraEstado estado={t.estado} />
              <span className="truncar resultado-titulo">{t.titulo}</span>
              <BanderaPrioridad prioridad={t.prioridad} />
              <span className="tenue resultado-lista">{t.lista_nombre}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
