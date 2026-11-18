from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..acceso import obtener_espacio
from ..auth import usuario_actual
from ..db import get_db
from ..models import Espacio, Estado, Lista, Tarea, Usuario, espacio_miembros

router = APIRouter(prefix="/api/espacios", tags=["espacios"])

ESTADOS_POR_DEFECTO = [
    ("Por hacer", "#87909e", False),
    ("En progreso", "#5f55ee", False),
    ("En revisión", "#f8ae00", False),
    ("Completado", "#00b884", True),
]


def crear_lista(db: Session, espacio: Espacio, nombre: str) -> Lista:
    posicion = (max((l.posicion for l in espacio.listas), default=0)) + 1
    lista = Lista(espacio=espacio, nombre=nombre.strip(), posicion=posicion)
    for i, (nombre_estado, color, final) in enumerate(ESTADOS_POR_DEFECTO):
        lista.estados.append(Estado(nombre=nombre_estado, color=color, posicion=i, es_final=final))
    db.add(lista)
    return lista


@router.get("", response_model=list[schemas.EspacioOut])
def listar(db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    return db.scalars(
        select(Espacio)
        .join(espacio_miembros, espacio_miembros.c.espacio_id == Espacio.id)
        .where(espacio_miembros.c.usuario_id == usuario.id)
        .order_by(Espacio.creado_en)
    ).all()


@router.post("", response_model=schemas.EspacioOut, status_code=201)
def crear(datos: schemas.EspacioIn, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    espacio = Espacio(nombre=datos.nombre.strip(), color=datos.color or "#7b68ee", propietario_id=usuario.id)
    espacio.miembros.append(usuario)
    db.add(espacio)
    crear_lista(db, espacio, "Lista")
    db.commit()
    return espacio


@router.patch("/{espacio_id}", response_model=schemas.EspacioOut)
def editar(
    espacio_id: int,
    datos: schemas.EspacioPatch,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    espacio = obtener_espacio(db, espacio_id, usuario)
    if datos.nombre is not None:
        espacio.nombre = datos.nombre.strip()
    if datos.color is not None:
        espacio.color = datos.color
    db.commit()
    return espacio


@router.delete("/{espacio_id}", status_code=204)
def eliminar(espacio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    espacio = obtener_espacio(db, espacio_id, usuario)
    if espacio.propietario_id != usuario.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el propietario puede eliminar el espacio")
    db.delete(espacio)
    db.commit()


# --- Miembros ---

@router.get("/{espacio_id}/miembros", response_model=list[schemas.UsuarioOut])
def miembros(espacio_id: int, db: Session = Depends(get_db), usuario: Usuario = Depends(usuario_actual)):
    return obtener_espacio(db, espacio_id, usuario).miembros


@router.post("/{espacio_id}/miembros", response_model=list[schemas.UsuarioOut])
def agregar_miembro(
    espacio_id: int,
    datos: schemas.MiembroIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    espacio = obtener_espacio(db, espacio_id, usuario)
    nuevo = db.scalar(select(Usuario).where(func.lower(Usuario.email) == datos.email.lower()))
    if nuevo is None:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "No hay ningún usuario registrado con ese correo"
        )
    if nuevo not in espacio.miembros:
        espacio.miembros.append(nuevo)
        db.commit()
    return espacio.miembros


@router.delete("/{espacio_id}/miembros/{usuario_id}", response_model=list[schemas.UsuarioOut])
def quitar_miembro(
    espacio_id: int,
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    espacio = obtener_espacio(db, espacio_id, usuario)
    if usuario_id == espacio.propietario_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No se puede quitar al propietario del espacio")
    if usuario.id != espacio.propietario_id and usuario.id != usuario_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo el propietario puede quitar a otros miembros")
    miembro = next((m for m in espacio.miembros if m.id == usuario_id), None)
    if miembro:
        espacio.miembros.remove(miembro)
        # Desasignarle de las tareas del espacio
        tareas = db.scalars(
            select(Tarea).join(Lista).where(Lista.espacio_id == espacio.id, Tarea.asignados.contains(miembro))
        ).all()
        for t in tareas:
            t.asignados.remove(miembro)
        db.commit()
    return espacio.miembros


# --- Listas ---

@router.post("/{espacio_id}/listas", response_model=schemas.ListaResumen, status_code=201)
def nueva_lista(
    espacio_id: int,
    datos: schemas.ListaIn,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(usuario_actual),
):
    espacio = obtener_espacio(db, espacio_id, usuario)
    lista = crear_lista(db, espacio, datos.nombre)
    db.commit()
    return lista
