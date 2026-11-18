from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Prioridad = Literal["urgente", "alta", "normal", "baja"]


class Esquema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Usuarios / autenticación ---

class RegistroIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UsuarioOut(Esquema):
    id: int
    nombre: str
    email: str
    color: str


class TokenOut(BaseModel):
    token: str
    usuario: UsuarioOut


# --- Espacios y listas ---

class EspacioIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class EspacioPatch(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=100)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")


class ListaResumen(Esquema):
    id: int
    nombre: str
    espacio_id: int


class EspacioOut(Esquema):
    id: int
    nombre: str
    color: str
    propietario_id: int
    listas: list[ListaResumen]


class MiembroIn(BaseModel):
    email: EmailStr


class ListaIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)


class EstadoIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=50)
    color: str = Field(default="#87909e", pattern=r"^#[0-9a-fA-F]{6}$")
    es_final: bool = False


class EstadoPatch(BaseModel):
    nombre: str | None = Field(default=None, min_length=1, max_length=50)
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    es_final: bool | None = None
    posicion: float | None = None


class EstadoOut(Esquema):
    id: int
    nombre: str
    color: str
    posicion: float
    es_final: bool


class ListaOut(Esquema):
    id: int
    nombre: str
    espacio_id: int
    espacio_nombre: str
    espacio_color: str
    estados: list[EstadoOut]
    miembros: list[UsuarioOut]


# --- Tareas ---

class TareaIn(BaseModel):
    titulo: str = Field(min_length=1, max_length=255)
    descripcion: str = ""
    estado_id: int | None = None
    prioridad: Prioridad | None = None
    fecha_inicio: date | None = None
    fecha_vencimiento: date | None = None
    asignados: list[int] = []
    padre_id: int | None = None


class TareaPatch(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=255)
    descripcion: str | None = None
    estado_id: int | None = None
    prioridad: Prioridad | None = None
    fecha_inicio: date | None = None
    fecha_vencimiento: date | None = None
    asignados: list[int] | None = None
    posicion: float | None = None


class TareaResumen(Esquema):
    id: int
    lista_id: int
    padre_id: int | None
    titulo: str
    estado: EstadoOut
    prioridad: Prioridad | None
    fecha_inicio: date | None
    fecha_vencimiento: date | None
    posicion: float
    asignados: list[UsuarioOut]
    num_subtareas: int = 0
    num_subtareas_hechas: int = 0
    num_comentarios: int = 0
    lista_nombre: str = ""


class ComentarioIn(BaseModel):
    contenido: str = Field(min_length=1, max_length=10000)


class ComentarioOut(Esquema):
    id: int
    contenido: str
    creado_en: datetime
    autor: UsuarioOut


class TareaDetalle(TareaResumen):
    descripcion: str
    creado_en: datetime
    actualizado_en: datetime
    creador: UsuarioOut
    subtareas: list[TareaResumen]
    comentarios: list[ComentarioOut]
