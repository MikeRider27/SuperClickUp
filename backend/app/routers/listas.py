from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import schemas
from ..acceso import obtener_estado, obtener_lista, resumir_tareas, validar_asignados
from ..auth import usuario_actual
from ..db import get_db
from ..models import Estado, Tarea, Usuario

router = APIRouter(prefix="/api", tags=["listas"])


def _lista_out(lista) -> schemas.ListaOut:
    return schemas.ListaOut(
        id=lista.id,
        nombre=lista.nombre,
        espacio_id=lista.espacio_id,
        espacio_nombre=lista.espacio.nombre,
        espacio_color=lista.espacio.color,
        estados=lista.estados,
        miembros=lista.espacio.miembros,
    )


@router.get("/listas/{lista_id}", response_model=schemas.ListaOut)
def ver(lista_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    return _lista_out(obtener_lista(db, lista_id, usuario))


@router.patch("/listas/{lista_id}", response_model=schemas.ListaOut)
def renombrar(
    lista_id: int,
    datos: schemas.ListaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    lista = obtener_lista(db, lista_id, usuario)
    lista.nombre = datos.nombre.strip()
    db.commit()
    return _lista_out(lista)


@router.delete("/listas/{lista_id}", status_code=204)
def eliminar(lista_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    lista = obtener_lista(db, lista_id, usuario)
    db.delete(lista)
    db.commit()


# --- Estados ---

@router.post("/listas/{lista_id}/estados", response_model=schemas.EstadoOut, status_code=201)
def nuevo_estado(
    lista_id: int,
    datos: schemas.EstadoIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    lista = obtener_lista(db, lista_id, usuario)
    # Los estados nuevos se colocan antes del primer estado final
    finales = [e.posicion for e in lista.estados if e.es_final]
    no_finales = [e.posicion for e in lista.estados if not e.es_final]
    if datos.es_final or not finales:
        posicion = max((e.posicion for e in lista.estados), default=0) + 1
    else:
        posicion = (max(no_finales, default=min(finales) - 1) + min(finales)) / 2
    estado = Estado(lista=lista, posicion=posicion, **datos.model_dump())
    db.add(estado)
    db.commit()
    return estado


@router.patch("/estados/{estado_id}", response_model=schemas.EstadoOut)
def editar_estado(
    estado_id: int,
    datos: schemas.EstadoPatch,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    estado = obtener_estado(db, estado_id, usuario)
    for campo, valor in datos.model_dump(exclude_unset=True, exclude_none=True).items():
        setattr(estado, campo, valor)
    db.commit()
    return estado


@router.delete("/estados/{estado_id}", status_code=204)
def eliminar_estado(estado_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    estado = obtener_estado(db, estado_id, usuario)
    restantes = [e for e in estado.lista.estados if e.id != estado.id]
    if not restantes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La lista debe tener al menos un estado")
    # Las tareas del estado eliminado pasan al primer estado restante
    for tarea in db.scalars(select(Tarea).where(Tarea.estado_id == estado.id)):
        tarea.estado_id = restantes[0].id
    db.flush()
    db.delete(estado)
    db.commit()


# --- Tareas de una lista ---

@router.get("/listas/{lista_id}/tareas", response_model=list[schemas.TareaResumen])
def tareas(
    lista_id: int,
    q: str | None = None,
    prioridad: str | None = None,
    asignado: int | None = None,
    estado: int | None = None,
    incluir_subtareas: bool = Query(False),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    lista = obtener_lista(db, lista_id, usuario)
    consulta = select(Tarea).where(Tarea.lista_id == lista.id)
    if not incluir_subtareas:
        consulta = consulta.where(Tarea.padre_id.is_(None))
    if q:
        patron = f"%{q.strip()}%"
        consulta = consulta.where(or_(Tarea.titulo.ilike(patron), Tarea.descripcion.ilike(patron)))
    if prioridad == "ninguna":
        consulta = consulta.where(Tarea.prioridad.is_(None))
    elif prioridad:
        consulta = consulta.where(Tarea.prioridad == prioridad)
    if asignado == 0:
        consulta = consulta.where(~Tarea.asignados.any())
    elif asignado:
        consulta = consulta.where(Tarea.asignados.any(Usuario.id == asignado))
    if estado:
        consulta = consulta.where(Tarea.estado_id == estado)
    consulta = consulta.order_by(Tarea.posicion, Tarea.id)
    return resumir_tareas(db, list(db.scalars(consulta)))


@router.post("/listas/{lista_id}/tareas", response_model=schemas.TareaResumen, status_code=201)
def crear_tarea(
    lista_id: int,
    datos: schemas.TareaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    lista = obtener_lista(db, lista_id, usuario)
    ids_estados = {e.id for e in lista.estados}
    estado_id = datos.estado_id if datos.estado_id in ids_estados else lista.estados[0].id

    if datos.padre_id is not None:
        padre = db.get(Tarea, datos.padre_id)
        if padre is None or padre.lista_id != lista.id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Tarea padre no válida")

    # padre_id == None se traduce a IS NULL
    ultima = db.scalar(
        select(func.max(Tarea.posicion)).where(Tarea.lista_id == lista.id, Tarea.padre_id == datos.padre_id)
    )
    tarea = Tarea(
        lista=lista,
        padre_id=datos.padre_id,
        estado_id=estado_id,
        titulo=datos.titulo.strip(),
        descripcion=datos.descripcion,
        prioridad=datos.prioridad,
        fecha_inicio=datos.fecha_inicio,
        fecha_vencimiento=datos.fecha_vencimiento,
        posicion=(ultima or 0) + 1000,
        creador_id=usuario.id,
        asignados=validar_asignados(db, lista.espacio, datos.asignados),
    )
    db.add(tarea)
    db.commit()
    db.refresh(tarea)
    return resumir_tareas(db, [tarea])[0]
