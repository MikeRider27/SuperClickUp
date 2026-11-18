import { useState, type FormEvent } from "react";
import { NavLink, Outlet, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Home,
  List as IconoLista,
  LogOut,
  Moon,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  Pencil,
} from "lucide-react";
import { useTema } from "../tema";
import { api } from "../api/client";
import type { Espacio, ListaResumen } from "../api/types";
import { useAuth } from "../auth";
import { Avatar, Desplegable, Modal } from "./comunes";
import AjustesEspacio from "./AjustesEspacio";
import Buscador from "./Buscador";
import TareaModal from "./TareaModal";

export const COLORES_ESPACIO = ["#7b68ee", "#e2445c", "#00c875", "#fdab3d", "#0086c0", "#ff5ac4", "#9d50dd", "#1f2937"];

export function Logo() {
  return (
    <div className="logo">
      <span className="logo-icono">
        <svg viewBox="0 0 32 32" width="18" height="18">
          <path d="M9 17l5 5 9-11" stroke="white" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      SuperClickUp
    </div>
  );
}

/** Modal genérico para pedir un nombre (crear o renombrar). */
export function ModalNombre({
  titulo,
  etiqueta,
  inicial = "",
  boton,
  conColor,
  onGuardar,
  onCerrar,
}: {
  titulo: string;
  etiqueta: string;
  inicial?: string;
  boton: string;
  conColor?: boolean;
  onGuardar: (nombre: string, color: string) => Promise<unknown>;
  onCerrar: () => void;
}) {
  const [nombre, setNombre] = useState(inicial);
  const [color, setColor] = useState(COLORES_ESPACIO[0]!);
  const [error, setError] = useState("");

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    try {
      await onGuardar(nombre.trim(), color);
      onCerrar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    }
  };

  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      <form className="formulario" onSubmit={enviar}>
        <label>
          {etiqueta}
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus required maxLength={100} />
        </label>
        {conColor && (
          <div className="selector-color">
            {COLORES_ESPACIO.map((c) => (
              <button
                type="button"
                key={c}
                className={c === color ? "activo" : ""}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <div className="acciones-form">
          <button type="button" className="boton-secundario" onClick={onCerrar}>
            Cancelar
          </button>
          <button className="boton-primario">{boton}</button>
        </div>
      </form>
    </Modal>
  );
}

type Dialogo =
  | { tipo: "nuevo-espacio" }
  | { tipo: "nueva-lista"; espacio: Espacio }
  | { tipo: "renombrar-lista"; lista: ListaResumen }
  | { tipo: "ajustes"; espacio: Espacio }
  | { tipo: "buscar" };

export default function Layout() {
  const { usuario, salir } = useAuth();
  const { tema, alternar: alternarTema } = useTema();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const [params, setParams] = useSearchParams();
  const [dialogo, setDialogo] = useState<Dialogo | null>(null);
  const [plegados, setPlegados] = useState<Set<number>>(new Set());

  const { data: espacios = [] } = useQuery({ queryKey: ["espacios"], queryFn: api.espacios });
  const refrescarEspacios = () => qc.invalidateQueries({ queryKey: ["espacios"] });

  const eliminarLista = useMutation({
    mutationFn: (l: ListaResumen) => api.eliminarLista(l.id),
    onSuccess: (_, l) => {
      refrescarEspacios();
      if (location.pathname === `/lista/${l.id}`) navegar("/");
    },
  });

  const tareaAbierta = Number(params.get("tarea")) || null;
  const cerrarTarea = () => {
    params.delete("tarea");
    setParams(params);
  };

  const plegar = (id: number) =>
    setPlegados((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="app">
      <aside className="barra-lateral">
        <Logo />

        <button className="buscar-boton" onClick={() => setDialogo({ tipo: "buscar" })}>
          <Search size={15} /> Buscar tareas…
        </button>

        <nav>
          <NavLink to="/" end className="nav-item">
            <Home size={16} /> Inicio
          </NavLink>
        </nav>

        <div className="seccion-titulo">
          Espacios
          <button className="boton-icono" title="Nuevo espacio" onClick={() => setDialogo({ tipo: "nuevo-espacio" })}>
            <Plus size={15} />
          </button>
        </div>

        <div className="espacios">
          {espacios.length === 0 && (
            <button className="vacio-espacios" onClick={() => setDialogo({ tipo: "nuevo-espacio" })}>
              <Plus size={14} /> Crea tu primer espacio
            </button>
          )}
          {espacios.map((esp) => {
            const plegado = plegados.has(esp.id);
            return (
              <div key={esp.id} className="espacio">
                <div className="espacio-fila">
                  <button className="espacio-nombre" onClick={() => plegar(esp.id)}>
                    {plegado ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                    <span className="espacio-icono" style={{ background: esp.color }}>
                      {esp.nombre[0]?.toUpperCase()}
                    </span>
                    <span className="truncar">{esp.nombre}</span>
                  </button>
                  <Desplegable
                    alineacion="derecha"
                    disparador={(abrir) => (
                      <button className="boton-icono oculto-hover" onClick={abrir} title="Opciones">
                        <MoreHorizontal size={15} />
                      </button>
                    )}
                  >
                    {(cerrar) => (
                      <>
                        <button
                          className="menu-item"
                          onClick={() => {
                            cerrar();
                            setDialogo({ tipo: "nueva-lista", espacio: esp });
                          }}
                        >
                          <Plus size={15} /> Nueva lista
                        </button>
                        <button
                          className="menu-item"
                          onClick={() => {
                            cerrar();
                            setDialogo({ tipo: "ajustes", espacio: esp });
                          }}
                        >
                          <Settings size={15} /> Ajustes y miembros
                        </button>
                      </>
                    )}
                  </Desplegable>
                </div>
                {!plegado &&
                  esp.listas.map((l) => (
                    <div key={l.id} className="lista-fila">
                      <NavLink to={`/lista/${l.id}`} className="nav-item nav-lista">
                        <IconoLista size={14} /> <span className="truncar">{l.nombre}</span>
                      </NavLink>
                      <Desplegable
                        alineacion="derecha"
                        disparador={(abrir) => (
                          <button className="boton-icono oculto-hover" onClick={abrir} title="Opciones">
                            <MoreHorizontal size={15} />
                          </button>
                        )}
                      >
                        {(cerrar) => (
                          <>
                            <button
                              className="menu-item"
                              onClick={() => {
                                cerrar();
                                setDialogo({ tipo: "renombrar-lista", lista: l });
                              }}
                            >
                              <Pencil size={15} /> Renombrar
                            </button>
                            <button
                              className="menu-item peligro"
                              onClick={() => {
                                cerrar();
                                if (confirm(`¿Eliminar la lista "${l.nombre}" y todas sus tareas?`))
                                  eliminarLista.mutate(l);
                              }}
                            >
                              <Trash2 size={15} /> Eliminar
                            </button>
                          </>
                        )}
                      </Desplegable>
                    </div>
                  ))}
                {!plegado && (
                  <button className="nueva-lista" onClick={() => setDialogo({ tipo: "nueva-lista", espacio: esp })}>
                    <Plus size={13} /> Nueva lista
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="usuario-pie">
          {usuario && <Avatar usuario={usuario} tam={28} />}
          <div className="usuario-datos">
            <strong className="truncar">{usuario?.nombre}</strong>
            <span className="truncar tenue">{usuario?.email}</span>
          </div>
          <button
            className="boton-icono"
            title={tema === "claro" ? "Modo oscuro" : "Modo claro"}
            onClick={alternarTema}
          >
            {tema === "claro" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="boton-icono" title="Cerrar sesión" onClick={salir}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="contenido">
        <Outlet />
      </main>

      {tareaAbierta && <TareaModal key={tareaAbierta} tareaId={tareaAbierta} onCerrar={cerrarTarea} />}

      {dialogo?.tipo === "nuevo-espacio" && (
        <ModalNombre
          titulo="Nuevo espacio"
          etiqueta="Nombre del espacio"
          boton="Crear espacio"
          conColor
          onCerrar={() => setDialogo(null)}
          onGuardar={async (nombre, color) => {
            const esp = await api.crearEspacio(nombre, color);
            await refrescarEspacios();
            if (esp.listas[0]) navegar(`/lista/${esp.listas[0].id}`);
          }}
        />
      )}
      {dialogo?.tipo === "nueva-lista" && (
        <ModalNombre
          titulo={`Nueva lista en ${dialogo.espacio.nombre}`}
          etiqueta="Nombre de la lista"
          boton="Crear lista"
          onCerrar={() => setDialogo(null)}
          onGuardar={async (nombre) => {
            const lista = await api.crearLista(dialogo.espacio.id, nombre);
            await refrescarEspacios();
            navegar(`/lista/${lista.id}`);
          }}
        />
      )}
      {dialogo?.tipo === "renombrar-lista" && (
        <ModalNombre
          titulo="Renombrar lista"
          etiqueta="Nombre"
          inicial={dialogo.lista.nombre}
          boton="Guardar"
          onCerrar={() => setDialogo(null)}
          onGuardar={async (nombre) => {
            await api.renombrarLista(dialogo.lista.id, nombre);
            refrescarEspacios();
            qc.invalidateQueries({ queryKey: ["lista", dialogo.lista.id] });
          }}
        />
      )}
      {dialogo?.tipo === "ajustes" && (
        <AjustesEspacio espacioId={dialogo.espacio.id} onCerrar={() => setDialogo(null)} />
      )}
      {dialogo?.tipo === "buscar" && <Buscador onCerrar={() => setDialogo(null)} />}
    </div>
  );
}
