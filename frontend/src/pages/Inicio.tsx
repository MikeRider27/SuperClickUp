import type { CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, CalendarClock, Flag, ListTodo } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { addDays, isBefore, isToday, parseISO, startOfToday } from "date-fns";
import { api } from "../api/client";
import type { TareaResumen } from "../api/types";
import { useAuth } from "../auth";
import { BanderaPrioridad, Fecha, PildoraEstado } from "../components/comunes";
import { Contadores } from "../components/VistaLista";

type Grupo = { clave: string; titulo: string; tareas: TareaResumen[] };

function agrupar(tareas: TareaResumen[]): Grupo[] {
  const hoy = startOfToday();
  const enUnaSemana = addDays(hoy, 7);
  const grupos: Grupo[] = [
    { clave: "vencidas", titulo: "Vencidas", tareas: [] },
    { clave: "hoy", titulo: "Hoy", tareas: [] },
    { clave: "semana", titulo: "Próximos 7 días", tareas: [] },
    { clave: "despues", titulo: "Más adelante", tareas: [] },
    { clave: "sin-fecha", titulo: "Sin fecha", tareas: [] },
  ];
  const [vencidas, deHoy, semana, despues, sinFecha] = grupos as [Grupo, Grupo, Grupo, Grupo, Grupo];
  for (const t of tareas) {
    if (!t.fecha_vencimiento) sinFecha.tareas.push(t);
    else {
      const f = parseISO(t.fecha_vencimiento);
      if (isToday(f)) deHoy.tareas.push(t);
      else if (isBefore(f, hoy)) vencidas.tareas.push(t);
      else if (isBefore(f, enUnaSemana)) semana.tareas.push(t);
      else despues.tareas.push(t);
    }
  }
  return grupos.filter((g) => g.tareas.length > 0);
}

function saludo() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export default function Inicio() {
  const { usuario } = useAuth();
  const navegar = useNavigate();
  const { data: tareas = [], isLoading } = useQuery({ queryKey: ["mias"], queryFn: api.misTareas });
  const { data: espacios = [] } = useQuery({ queryKey: ["espacios"], queryFn: api.espacios });
  const grupos = agrupar(tareas);
  const contar = (clave: string) => grupos.find((g) => g.clave === clave)?.tareas.length ?? 0;
  const vencidas = contar("vencidas");
  const urgentes = tareas.filter((t) => t.prioridad === "urgente").length;

  return (
    <div className="pagina-inicio">
      <header className="inicio-hero">
        <h1>
          {saludo()}, {usuario?.nombre.split(" ")[0]} 👋
        </h1>
        <p>
          {isLoading
            ? "Cargando tus tareas…"
            : tareas.length === 0
              ? "No tienes tareas pendientes asignadas. ¡Buen trabajo!"
              : `Tienes ${tareas.length} ${tareas.length === 1 ? "tarea pendiente" : "tareas pendientes"}${
                  vencidas ? `, ${vencidas} vencida${vencidas === 1 ? "" : "s"}` : ""
                }.`}
        </p>
      </header>

      <div className="estadisticas">
        <div className="estadistica" style={{ "--color-estat": "#7b68ee" } as CSSProperties}>
          <ListTodo size={20} />
          <strong>{tareas.length}</strong>
          <span>Pendientes</span>
        </div>
        <div className="estadistica" style={{ "--color-estat": "#e2445c" } as CSSProperties}>
          <AlertCircle size={20} />
          <strong>{vencidas}</strong>
          <span>Vencidas</span>
        </div>
        <div className="estadistica" style={{ "--color-estat": "#f59e0b" } as CSSProperties}>
          <CalendarClock size={20} />
          <strong>{contar("hoy")}</strong>
          <span>Para hoy</span>
        </div>
        <div className="estadistica" style={{ "--color-estat": "#00b884" } as CSSProperties}>
          <Flag size={20} />
          <strong>{urgentes}</strong>
          <span>Urgentes</span>
        </div>
      </div>

      {espacios.length === 0 && !isLoading && (
        <div className="bienvenida">
          <h2>Empieza creando un espacio</h2>
          <p>
            Un <strong>espacio</strong> agrupa el trabajo de un equipo o proyecto. Dentro creas <strong>listas</strong>{" "}
            y en ellas tus <strong>tareas</strong>. Usa el botón <strong>+</strong> junto a "Espacios" en la barra
            lateral.
          </p>
        </div>
      )}

      <h2 className="subtitulo">Mis tareas</h2>
      {grupos.map((g) => (
        <section key={g.clave} className={`grupo-inicio grupo-${g.clave}`}>
          <h3>
            {g.titulo} <span className="tenue">{g.tareas.length}</span>
          </h3>
          {g.tareas.map((t) => (
            <button key={t.id} className="fila-inicio" onClick={() => navegar(`/lista/${t.lista_id}?tarea=${t.id}`)}>
              <PildoraEstado estado={t.estado} />
              <span className="truncar fila-inicio-titulo">{t.titulo}</span>
              <Contadores tarea={t} />
              <span className="tenue fila-inicio-lista">{t.lista_nombre}</span>
              <BanderaPrioridad prioridad={t.prioridad} />
              <span className="fila-inicio-fecha">
                <Fecha iso={t.fecha_vencimiento} completada={false} />
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
