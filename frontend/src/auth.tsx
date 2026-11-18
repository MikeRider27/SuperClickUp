import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { alExpirarSesion, api, tokenGuardado } from "./api/client";
import type { Usuario } from "./api/types";

interface ContextoAuth {
  usuario: Usuario | null;
  cargando: boolean;
  entrar: (email: string, password: string) => Promise<void>;
  registrarse: (nombre: string, email: string, password: string) => Promise<void>;
  salir: () => void;
}

const Contexto = createContext<ContextoAuth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(() => tokenGuardado.get() !== null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!tokenGuardado.get()) return;
    api
      .yo()
      .then(setUsuario)
      .catch(() => tokenGuardado.borrar())
      .finally(() => setCargando(false));
  }, []);

  const salir = () => {
    tokenGuardado.borrar();
    setUsuario(null);
    queryClient.clear();
  };

  useEffect(() => {
    alExpirarSesion.addEventListener("expirada", salir);
    return () => alExpirarSesion.removeEventListener("expirada", salir);
  });

  const iniciar = ({ token, usuario }: { token: string; usuario: Usuario }) => {
    tokenGuardado.set(token);
    setUsuario(usuario);
  };

  return (
    <Contexto.Provider
      value={{
        usuario,
        cargando,
        entrar: async (email, password) => iniciar(await api.login(email, password)),
        registrarse: async (nombre, email, password) => iniciar(await api.registro(nombre, email, password)),
        salir,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
