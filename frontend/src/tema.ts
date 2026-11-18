import { useEffect, useState } from "react";

export type Tema = "claro" | "oscuro";

const CLAVE = "superclickup.tema";

export function temaInicial(): Tema {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === "claro" || guardado === "oscuro") return guardado;
  } catch {
    // Sin acceso al almacenamiento: usar la preferencia del sistema
  }
  return matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro";
}

export function aplicarTema(tema: Tema) {
  document.documentElement.dataset.tema = tema;
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    aplicarTema(tema);
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // Ignorar: el tema solo no se recordará
    }
  }, [tema]);

  return { tema, alternar: () => setTema((t) => (t === "claro" ? "oscuro" : "claro")) };
}
