from datetime import date, datetime, timezone

from sqlalchemy import Column, Date, DateTime, Float, ForeignKey, Integer, String, Table, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def ahora() -> datetime:
    return datetime.now(timezone.utc)


espacio_miembros = Table(
    "espacio_miembros",
    Base.metadata,
    Column("espacio_id", ForeignKey("espacios.id", ondelete="CASCADE"), primary_key=True),
    Column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
)

tarea_asignados = Table(
    "tarea_asignados",
    Base.metadata,
    Column("tarea_id", ForeignKey("tareas.id", ondelete="CASCADE"), primary_key=True),
    Column("usuario_id", ForeignKey("usuarios.id", ondelete="CASCADE"), primary_key=True),
)


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(7), default="#7b68ee")
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)


class Espacio(Base):
    __tablename__ = "espacios"

    id: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7), default="#7b68ee")
    propietario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)

    miembros: Mapped[list[Usuario]] = relationship(secondary=espacio_miembros)
    listas: Mapped[list["Lista"]] = relationship(
        back_populates="espacio", cascade="all, delete-orphan", order_by="Lista.posicion"
    )


class Lista(Base):
    __tablename__ = "listas"

    id: Mapped[int] = mapped_column(primary_key=True)
    espacio_id: Mapped[int] = mapped_column(ForeignKey("espacios.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(100))
    posicion: Mapped[float] = mapped_column(Float, default=0)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)

    espacio: Mapped[Espacio] = relationship(back_populates="listas")
    estados: Mapped[list["Estado"]] = relationship(
        back_populates="lista", cascade="all, delete-orphan", order_by="Estado.posicion"
    )
    tareas: Mapped[list["Tarea"]] = relationship(back_populates="lista", cascade="all, delete-orphan")


class Estado(Base):
    __tablename__ = "estados"

    id: Mapped[int] = mapped_column(primary_key=True)
    lista_id: Mapped[int] = mapped_column(ForeignKey("listas.id", ondelete="CASCADE"), index=True)
    nombre: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(7))
    posicion: Mapped[float] = mapped_column(Float, default=0)
    es_final: Mapped[bool] = mapped_column(Boolean, default=False)

    lista: Mapped[Lista] = relationship(back_populates="estados")


class Tarea(Base):
    __tablename__ = "tareas"

    id: Mapped[int] = mapped_column(primary_key=True)
    lista_id: Mapped[int] = mapped_column(ForeignKey("listas.id", ondelete="CASCADE"), index=True)
    padre_id: Mapped[int | None] = mapped_column(ForeignKey("tareas.id", ondelete="CASCADE"), index=True)
    estado_id: Mapped[int] = mapped_column(ForeignKey("estados.id"), index=True)
    titulo: Mapped[str] = mapped_column(String(255))
    descripcion: Mapped[str] = mapped_column(Text, default="")
    prioridad: Mapped[str | None] = mapped_column(String(10))  # urgente | alta | normal | baja
    fecha_inicio: Mapped[date | None] = mapped_column(Date)
    fecha_vencimiento: Mapped[date | None] = mapped_column(Date)
    posicion: Mapped[float] = mapped_column(Float, default=0)
    creador_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)
    actualizado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora, onupdate=ahora)

    lista: Mapped[Lista] = relationship(back_populates="tareas")
    estado: Mapped[Estado] = relationship()
    asignados: Mapped[list[Usuario]] = relationship(secondary=tarea_asignados)
    creador: Mapped[Usuario] = relationship()
    subtareas: Mapped[list["Tarea"]] = relationship(
        cascade="all, delete-orphan", order_by="Tarea.posicion"
    )
    comentarios: Mapped[list["Comentario"]] = relationship(
        cascade="all, delete-orphan", order_by="Comentario.creado_en"
    )


class Comentario(Base):
    __tablename__ = "comentarios"

    id: Mapped[int] = mapped_column(primary_key=True)
    tarea_id: Mapped[int] = mapped_column(ForeignKey("tareas.id", ondelete="CASCADE"), index=True)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    contenido: Mapped[str] = mapped_column(Text)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=ahora)

    autor: Mapped[Usuario] = relationship()
