import random

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import schemas
from ..auth import crear_token, hashear_password, usuario_actual, verificar_password
from ..db import get_db
from ..models import Usuario

router = APIRouter(prefix="/api/auth", tags=["autenticación"])

COLORES_AVATAR = ["#7b68ee", "#e2445c", "#00c875", "#fdab3d", "#0086c0", "#ff5ac4", "#9d50dd", "#037f4c"]


def _por_email(db: Session, email: str) -> Usuario | None:
    return db.scalar(select(Usuario).where(func.lower(Usuario.email) == email.lower()))


@router.post("/registro", response_model=schemas.TokenOut, status_code=201)
def registro(datos: schemas.RegistroIn, db: Session = Depends(get_db)):
    if _por_email(db, datos.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una cuenta con ese correo")
    usuario = Usuario(
        nombre=datos.nombre.strip(),
        email=datos.email.lower(),
        password_hash=hashear_password(datos.password),
        color=random.choice(COLORES_AVATAR),
    )
    db.add(usuario)
    db.commit()
    return {"token": crear_token(usuario.id), "usuario": usuario}


@router.post("/login", response_model=schemas.TokenOut)
def login(datos: schemas.LoginIn, db: Session = Depends(get_db)):
    usuario = _por_email(db, datos.email)
    if usuario is None or not verificar_password(datos.password, usuario.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Correo o contraseña incorrectos")
    return {"token": crear_token(usuario.id), "usuario": usuario}


@router.get("/yo", response_model=schemas.UsuarioOut)
def yo(usuario: Usuario = Depends(usuario_actual)):
    return usuario
