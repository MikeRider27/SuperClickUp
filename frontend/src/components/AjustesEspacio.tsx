import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Trash2, UserMinus } from "lucide-react";
import { api } from "../api/client";
import { useAuth } from "../auth";
import { Avatar, Modal } from "./comunes";
import { COLORES_ESPACIO } from "./Layout";

export default function AjustesEspacio({ espacioId, onCerrar }: { espacioId: number; onCerrar: () => void }) {
  const { usuario } = useAuth();
  const qc = useQueryClient();
  const navegar = useNavigate();
  const { data: espacios = [] } = useQuery({ queryKey: ["espacios"], queryFn: api.espacios });
  const espacio = espacios.find((e) => e.id === espacioId);
  const { data: miembros = [] } = useQuery({
    queryKey: ["miembros", espacioId],
    queryFn: () => api.miembros(espacioId),
  });

  const [nombre, setNombre] = useState(espacio?.nombre ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["espacios"] });
    qc.invalidateQueries({ queryKey: ["miembros", espacioId] });
    qc.invalidateQueries({ queryKey: ["lista"] });
    qc.invalidateQueries({ queryKey: ["tareas"] });
  };

  const editar = useMutation({
    mutationFn: (datos: { nombre?: string; color?: string }) => api.editarEspacio(espacioId, datos),
    onSuccess: refrescar,
  });

  const invitar = useMutation({
    mutationFn: () => api.agregarMiembro(espacioId, email.trim()),
    onSuccess: () => {
      setEmail("");
      setError("");
      refrescar();
    },
    onError: (e) => setError(e.message),
  });

  const quitar = useMutation({
    mutationFn: (uid: number) => api.quitarMiembro(espacioId, uid),
    onSuccess: (_, uid) => {
      if (uid === usuario?.id) {
        onCerrar();
        navegar("/");
      }
      refrescar();
    },
    onError: (e) => setError(e.message),
  });

  const eliminar = useMutation({
    mutationFn: () => api.eliminarEspacio(espacioId),
    onSuccess: () => {
      onCerrar();
      navegar("/");
      refrescar();
    },
  });

  if (!espacio) return null;
  const soyPropietario = espacio.propietario_id === usuario?.id;

  return (
    <Modal titulo="Ajustes del espacio" onCerrar={onCerrar} ancho={520}>
      <div className="formulario">
        <label>
          Nombre
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => nombre.trim() && nombre.trim() !== espacio.nombre && editar.mutate({ nombre: nombre.trim() })}
          />
        </label>
        <div className="selector-color">
          {COLORES_ESPACIO.map((c) => (
            <button
              type="button"
              key={c}
              className={c === espacio.color ? "activo" : ""}
              style={{ background: c }}
              onClick={() => editar.mutate({ color: c })}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <h3>Miembros ({miembros.length})</h3>
        <form
          className="fila-invitar"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (email.trim()) invitar.mutate();
          }}
        >
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button className="boton-primario" disabled={invitar.isPending}>
            Invitar
          </button>
        </form>
        <p className="ayuda">La persona debe tener ya una cuenta registrada en SuperClickUp.</p>
        {error && <div className="error">{error}</div>}

        <ul className="lista-miembros">
          {miembros.map((m) => (
            <li key={m.id}>
              <Avatar usuario={m} tam={30} />
              <div className="usuario-datos">
                <strong>
                  {m.nombre} {m.id === usuario?.id && <span className="tenue">(tú)</span>}
                </strong>
                <span className="tenue">{m.email}</span>
              </div>
              {m.id === espacio.propietario_id ? (
                <span className="etiqueta-propietario">
                  <Crown size={13} /> Propietario
                </span>
              ) : (
                (soyPropietario || m.id === usuario?.id) && (
                  <button
                    className="boton-icono"
                    title={m.id === usuario?.id ? "Salir del espacio" : "Quitar del espacio"}
                    onClick={() =>
                      confirm(m.id === usuario?.id ? "¿Salir de este espacio?" : `¿Quitar a ${m.nombre} del espacio?`) &&
                      quitar.mutate(m.id)
                    }
                  >
                    <UserMinus size={16} />
                  </button>
                )
              )}
            </li>
          ))}
        </ul>

        {soyPropietario && (
          <div className="zona-peligro">
            <button
              className="boton-peligro"
              onClick={() =>
                confirm(`¿Eliminar el espacio "${espacio.nombre}" con todas sus listas y tareas? No se puede deshacer.`) &&
                eliminar.mutate()
              }
            >
              <Trash2 size={15} /> Eliminar espacio
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
