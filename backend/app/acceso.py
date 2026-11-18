"""Carga de recursos verificando que el usuario sea miembro del espacio correspondiente."""

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import schemas
from .models import Comentario, Espacio, Estado, Lista, Tarea, Usuario, espacio_miembros


def _no_encontrado(recurso: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{recurso} no encontrado")


def es_miembro(db: Session, espacio_id: int, usuario_id: int) -> bool:
    return db.execute(
        select(espacio_miembros).where(
            espacio_miembros.c.espacio_id == espacio_id,
            espacio_miembros.c.usuario_id == usuario_id,
        )
    ).first() is not None


def obtener_espacio(db: Session, espacio_id: int, usuario: Usuario) -> Espacio:
    espacio = db.get(Espacio, espacio_id)
    if espacio is None or not es_miembro(db, espacio.id, usuario.id):
        raise _no_encontrado("Espacio")
    return espacio


def obtener_lista(db: Session, lista_id: int, usuario: Usuario) -> Lista:
    lista = db.get(Lista, lista_id)
    if lista is None or not es_miembro(db, lista.espacio_id, usuario.id):
        raise _no_encontrado("Lista")
    return lista


def obtener_tarea(db: Session, tarea_id: int, usuario: Usuario) -> Tarea:
    tarea = db.get(Tarea, tarea_id)
    if tarea is None or not es_miembro(db, tarea.lista.espacio_id, usuario.id):
        raise _no_encontrado("Tarea")
    return tarea


def obtener_estado(db: Session, estado_id: int, usuario: Usuario) -> Estado:
    estado = db.get(Estado, estado_id)
    if estado is None or not es_miembro(db, estado.lista.espacio_id, usuario.id):
        raise _no_encontrado("Estado")
    return estado


def validar_asignados(db: Session, espacio: Espacio, ids: list[int]) -> list[Usuario]:
    miembros = {m.id: m for m in espacio.miembros}
    desconocidos = [i for i in ids if i not in miembros]
    if desconocidos:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Solo se puede asignar a miembros del espacio"
        )
    return [miembros[i] for i in dict.fromkeys(ids)]


def resumir_tareas(db: Session, tareas: list[Tarea]) -> list[schemas.TareaResumen]:
    """Convierte tareas en resúmenes con contadores de subtareas y comentarios."""
    if not tareas:
        return []
    ids = [t.id for t in tareas]

    subtareas = db.execute(
        select(Tarea.padre_id, func.count(), func.count().filter(Estado.es_final))
        .join(Estado, Tarea.estado_id == Estado.id)
        .where(Tarea.padre_id.in_(ids))
        .group_by(Tarea.padre_id)
    ).all()
    conteo_sub = {padre: (total, hechas) for padre, total, hechas in subtareas}

    comentarios = db.execute(
        select(Comentario.tarea_id, func.count())
        .where(Comentario.tarea_id.in_(ids))
        .group_by(Comentario.tarea_id)
    ).all()
    conteo_com = dict(comentarios)

    resultado = []
    for t in tareas:
        total, hechas = conteo_sub.get(t.id, (0, 0))
        r = schemas.TareaResumen.model_validate(t)
        r.num_subtareas = total
        r.num_subtareas_hechas = hechas
        r.num_comentarios = conteo_com.get(t.id, 0)
        r.lista_nombre = t.lista.nombre
        resultado.append(r)
    return resultado
