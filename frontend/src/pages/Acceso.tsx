import { useState, type FormEvent } from "react";
import { useAuth } from "../auth";
import { Logo } from "../components/Layout";

export default function Acceso() {
  const { entrar, registrarse } = useAuth();
  const [modo, setModo] = useState<"entrar" | "registro">("entrar");
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setEnviando(true);
    try {
      if (modo === "entrar") await entrar(email, password);
      else await registrarse(nombre, email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo continuar");
    } finally {
      setEnviando(false);
    }
  };

  const esRegistro = modo === "registro";

  return (
    <div className="acceso">
      <form className="acceso-tarjeta" onSubmit={enviar}>
        <Logo />
        <h1>{esRegistro ? "Crea tu cuenta" : "¡Bienvenido de nuevo!"}</h1>
        <p className="tenue">
          {esRegistro ? "Organiza el trabajo de tu equipo en un solo lugar." : "Entra para ver tus tareas."}
        </p>

        {esRegistro && (
          <label>
            Nombre completo
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
          </label>
        )}
        <label>
          Correo electrónico
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus={!esRegistro}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={esRegistro ? 6 : undefined}
            placeholder={esRegistro ? "Mínimo 6 caracteres" : ""}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button className="boton-primario" disabled={enviando}>
          {enviando ? "Un momento…" : esRegistro ? "Registrarme" : "Entrar"}
        </button>

        <p className="acceso-cambio">
          {esRegistro ? "¿Ya tienes cuenta?" : "¿No tienes cuenta?"}{" "}
          <button
            type="button"
            className="enlace"
            onClick={() => {
              setModo(esRegistro ? "entrar" : "registro");
              setError("");
            }}
          >
            {esRegistro ? "Inicia sesión" : "Regístrate gratis"}
          </button>
        </p>
      </form>
    </div>
  );
}
