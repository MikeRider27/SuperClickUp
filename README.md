# SuperClickUp

SuperClickUp es un gestor de proyectos y tareas de código abierto (open source), creado para equipos y disponible 100 % en español. Está inspirado en ClickUp, pero es un proyecto independiente con su propio stack tecnológico: React, TypeScript y Vite en el frontend, y FastAPI y SQLAlchemy en el backend.

## Arrancar

```bash
docker compose up -d --build
```

Abre **http://localhost:8110**, crea una cuenta y empieza creando un espacio.

Documentación interactiva de la API: http://localhost:8110/api/docs

En producción define una clave propia para los tokens:

```bash
SECRET_KEY=$(openssl rand -hex 32) docker compose up -d --build
```

## Qué incluye (MVP)

- **Cuentas de usuario**: registro, inicio de sesión (JWT, 7 días).
- **Espacios** con color y **miembros**: se invita por correo a usuarios ya registrados.
  El propietario puede quitar miembros o eliminar el espacio; cualquiera puede salir.
- **Listas** dentro de cada espacio, con **estados personalizables** (nombre, color, orden, si es estado final).
- **Tareas**: título, descripción, estado, prioridad (urgente/alta/normal/baja), asignados,
  fecha de inicio y vencimiento, **subtareas** y **comentarios**.
- **Vista Lista** agrupada por estado, con edición rápida en línea (estado, asignados, fecha, prioridad).
- **Vista Tablero** (Kanban) con arrastrar y soltar entre columnas y para reordenar.
- **Filtros** por texto, prioridad y asignado; **búsqueda global** de tareas.
- **Inicio**: tus tareas pendientes agrupadas en vencidas, hoy, próximos 7 días, etc.

## Estructura

```
backend/    FastAPI + SQLAlchemy (Python 3.12)
  app/models.py      Modelo de datos
  app/routers/       Endpoints: auth, espacios, listas, tareas
  app/acceso.py      Comprobación de permisos (membresía del espacio)
frontend/   React 18 + TypeScript + Vite, servido por nginx
  src/pages/         Acceso, Inicio, ListaPage
  src/components/    Barra lateral, vistas Lista/Tablero, detalle de tarea…
docker-compose.yml  db (Postgres 16) + backend + frontend (puerto 8110)
```

## Desarrollo

- Backend con recarga: `docker compose run --rm -p 8000:8000 backend uvicorn app.main:app --host 0.0.0.0 --reload`
- Frontend con Vite (requiere Node 20+): `cd frontend && npm ci && npm run dev`
  (redirige `/api` a `http://localhost:8000`).

Las tablas se crean al arrancar el backend (`create_all`). Antes de cambiar el modelo con datos
reales conviene añadir migraciones con Alembic.

## Ideas para siguientes versiones

Vista calendario y Gantt, etiquetas, campos personalizados, notificaciones, registro de actividad,
carpetas, adjuntos, plantillas, automatizaciones y tiempo registrado.

## Autor

Miguel Villaba — [mike.mavc27@gmail.com](mailto:mike.mavc27@gmail.com)

## Licencia

Este proyecto está bajo la [Licencia MIT](./LICENSE).
