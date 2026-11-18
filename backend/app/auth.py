import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .db import get_db
from .models import Usuario

SECRET_KEY = os.environ.get("SECRET_KEY", "cambia-esta-clave-en-produccion")
ALGORITMO = "HS256"
DURACION_TOKEN = timedelta(days=7)

bearer = HTTPBearer(auto_error=False)


def hashear_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verificar_password(password: str, hash_: str) -> bool:
    return bcrypt.checkpw(password.encode(), hash_.encode())


def crear_token(usuario_id: int) -> str:
    exp = datetime.now(timezone.utc) + DURACION_TOKEN
    return jwt.encode({"sub": str(usuario_id), "exp": exp}, SECRET_KEY, algorithm=ALGORITMO)


def usuario_actual(
    cred: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Usuario:
    no_autorizado = HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión no válida o expirada")
    if cred is None:
        raise no_autorizado
    try:
        payload = jwt.decode(cred.credentials, SECRET_KEY, algorithms=[ALGORITMO])
        usuario_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise no_autorizado
    usuario = db.get(Usuario, usuario_id)
    if usuario is None:
        raise no_autorizado
    return usuario
