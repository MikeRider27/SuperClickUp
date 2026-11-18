import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./auth";
import Layout from "./components/Layout";
import Acceso from "./pages/Acceso";
import Inicio from "./pages/Inicio";
import ListaPage from "./pages/ListaPage";
import { aplicarTema, temaInicial } from "./tema";
import "./styles.css";

// Antes del primer render, para evitar un destello del tema equivocado
aplicarTema(temaInicial());

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: true } },
});

function App() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="pantalla-carga">Cargando…</div>;
  if (!usuario) {
    return (
      <Routes>
        <Route path="/acceso" element={<Acceso />} />
        <Route path="*" element={<Navigate to="/acceso" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Inicio />} />
        <Route path="/lista/:id" element={<ListaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
