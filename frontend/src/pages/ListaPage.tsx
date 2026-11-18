import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Columns3, List as IconoLista, Search, SlidersHorizontal, X } from "lucide-react";
import { api } from "../api/client";
import { PRIORIDADES } from "../components/comunes";
import GestorEstados from "../components/GestorEstados";
import VistaLista from "../components/VistaLista";
import VistaTablero from "../components/VistaTablero";
import { useAuth } from "../auth";
import type { Prioridad } from "../api/types";

export default function ListaPage() {
  const id = Number(useParams().id);
  const { usuario } = useAuth();
  const [params, setParams] = useSearchParams();
  const vista = params.get("vista") === "tablero" ? "tablero" : "lista";

  const [texto, setTexto] = useState("");
  const [q, setQ] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [asignado, setAsignado] = useState("");
  const [gestionarEstados, setGestionarEstados] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(texto.trim()), 250);
    return () => clearTimeout(t);
  }, [texto]);

  // Al cambiar de lista, limpiar filtros
  useEffect(() => {
    setTexto("");
    setQ("");
    setPrioridad("");
    setAsignado("");
  }, [id]);

  const { data: lista, error } = useQuery({ queryKey: ["lista", id], queryFn: () => api.lista(id) });
  const filtros = { q, prioridad, asignado };
  const { data: tareas = [], isLoading } = useQuery({
    queryKey: ["tareas", id, filtros],
    queryFn: () => api.tareas(id, filtros),
    placeholderData: (previo) => previo,
  });

  const cambiarVista = (v: "lista" | "tablero") =>
    setParams((p) => {
      v === "lista" ? p.delete("vista") : p.set("vista", v);
      return p;
    });

  if (error) return <div className="vacio">No se encontró la lista o no tienes acceso.</div>;
  if (!lista) return <div className="vacio">Cargando…</div>;

  const hayFiltros = !!(q || prioridad || asignado);

  return (
    <div className="pagina-lista">
      <header className="cabecera-lista">
        <div className="titulo-lista">
          <span className="espacio-icono grande" style={{ background: lista.espacio_color }}>
            {lista.espacio_nombre[0]?.toUpperCase()}
          </span>
          <div>
            <div className="migas tenue">{lista.espacio_nombre}</div>
            <h1>{lista.nombre}</h1>
          </div>
        </div>
        <div className="pestanas">
          <button className={vista === "lista" ? "activa" : ""} onClick={() => cambiarVista("lista")}>
            <IconoLista size={15} /> Lista
          </button>
          <button className={vista === "tablero" ? "activa" : ""} onClick={() => cambiarVista("tablero")}>
            <Columns3 size={15} /> Tablero
          </button>
        </div>
      </header>

      <div className="barra-filtros">
        <div className="campo-busqueda">
          <Search size={15} className="tenue" />
          <input placeholder="Buscar en esta lista…" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </div>
        <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)}>
          <option value="">Prioridad: todas</option>
          {(Object.keys(PRIORIDADES) as Prioridad[]).map((p) => (
            <option key={p} value={p}>
              {PRIORIDADES[p].etiqueta}
            </option>
          ))}
          <option value="ninguna">Sin prioridad</option>
        </select>
        <select value={asignado} onChange={(e) => setAsignado(e.target.value)}>
          <option value="">Asignado: todos</option>
          {usuario && <option value={usuario.id}>Asignadas a mí</option>}
          {lista.miembros
            .filter((m) => m.id !== usuario?.id)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          <option value="0">Sin asignar</option>
        </select>
        {hayFiltros && (
          <button
            className="boton-secundario"
            onClick={() => {
              setTexto("");
              setPrioridad("");
              setAsignado("");
            }}
          >
            <X size={14} /> Limpiar
          </button>
        )}
        <span className="separador" />
        <button className="boton-secundario" onClick={() => setGestionarEstados(true)}>
          <SlidersHorizontal size={14} /> Estados
        </button>
      </div>

      {isLoading ? (
        <div className="vacio">Cargando tareas…</div>
      ) : vista === "lista" ? (
        <VistaLista lista={lista} tareas={tareas} />
      ) : (
        <VistaTablero lista={lista} tareas={tareas} />
      )}

      {gestionarEstados && <GestorEstados lista={lista} onCerrar={() => setGestionarEstados(false)} />}
    </div>
  );
}
