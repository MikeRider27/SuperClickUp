from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from .. import schemas
from ..acceso import obtener_tarea, resumir_tareas, validar_asignados
from ..auth import usuario_actual
from ..db import get_db
from ..models import Comentario, Estado, Lista, Tarea, Usuario, espacio_miembros

router = APIRouter(prefix="/api", tags=["tareas"])


def _tareas_visibles(usuario: Usuario):
    """Consulta base: tareas de los espacios donde el usuario es miembro."""
    return (
        select(Tarea)
        .join(Lista, Tarea.lista_id == Lista.id)
        .join(espacio_miembros, espacio_miembros.c.espacio_id == Lista.espacio_id)
        .where(espacio_miembros.c.usuario_id == usuario.id)
    )


@router.get("/tareas/mias", response_model=list[schemas.TareaResumen])
def mis_tareas(
    incluir_completadas: bool = False,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    consulta = _tareas_visibles(usuario).where(Tarea.asignados.any(Usuario.id == usuario.id))
    if not incluir_completadas:
        consulta = consulta.join(Estado, Tarea.estado_id == Estado.id).where(Estado.es_final.is_(False))
    consulta = consulta.order_by(Tarea.fecha_vencimiento.asc().nulls_last(), Tarea.id)
    return resumir_tareas(db, list(db.scalars(consulta)))


@router.get("/tareas/buscar", response_model=list[schemas.TareaResumen])
def buscar(q: str, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    q = q.strip()
    if not q:
        return []
    patron = f"%{q}%"
    consulta = (
        _tareas_visibles(usuario)
        .where(or_(Tarea.titulo.ilike(patron), Tarea.descripcion.ilike(patron)))
        .order_by(Tarea.actualizado_en.desc())
        .limit(30)
    )
    return resumir_tareas(db, list(db.scalars(consulta)))


@router.get("/tareas/{tarea_id}", response_model=schemas.TareaDetalle)
def ver(tarea_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    tarea = obtener_tarea(db, tarea_id, usuario)
    resumen = resumir_tareas(db, [tarea])[0]
    return schemas.TareaDetalle(
        **resumen.model_dump(),
        descripcion=tarea.descripcion,
        creado_en=tarea.creado_en,
        actualizado_en=tarea.actualizado_en,
        creador=tarea.creador,
        subtareas=resumir_tareas(db, tarea.subtareas),
        comentarios=tarea.comentarios,
    )


@router.patch("/tareas/{tarea_id}", response_model=schemas.TareaResumen)
def editar(
    tarea_id: int,
    datos: schemas.TareaPatch,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    tarea = obtener_tarea(db, tarea_id, usuario)
    cambios = datos.model_dump(exclude_unset=True)

    if "estado_id" in cambios:
        if cambios["estado_id"] not in {e.id for e in tarea.lista.estados}:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Estado no válido para esta lista")
    if "asignados" in cambios:
        tarea.asignados = validar_asignados(db, tarea.lista.espacio, cambios.pop("asignados") or [])
    if "titulo" in cambios:
        if not cambios["titulo"]:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "El título no puede estar vacío")
        cambios["titulo"] = cambios["titulo"].strip()
    for campo in ("descripcion", "posicion"):
        if campo in cambios and cambios[campo] is None:
            cambios.pop(campo)

    for campo, valor in cambios.items():
        setattr(tarea, campo, valor)
    db.commit()
    db.refresh(tarea)
    return resumir_tareas(db, [tarea])[0]


@router.delete("/tareas/{tarea_id}", status_code=204)
def eliminar(tarea_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    db.delete(obtener_tarea(db, tarea_id, usuario))
    db.commit()


# --- Comentarios ---

@router.post("/tareas/{tarea_id}/comentarios", response_model=schemas.ComentarioOut, status_code=201)
def comentar(
    tarea_id: int,
    datos: schemas.ComentarioIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    tarea = obtener_tarea(db, tarea_id, usuario)
    comentario = Comentario(tarea_id=tarea.id, autor=usuario, contenido=datos.contenido.strip())
    db.add(comentario)
    db.commit()
    return comentario


@router.delete("/comentarios/{comentario_id}", status_code=204)
def eliminar_comentario(
    comentario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    comentario = db.get(Comentario, comentario_id)
    if comentario is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Comentario no encontrado")
    obtener_tarea(db, comentario.tarea_id, usuario)
    if comentario.autor_id != usuario.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo puedes eliminar tus propios comentarios")
    db.delete(comentario)
    db.commit()
