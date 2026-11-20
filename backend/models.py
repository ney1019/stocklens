from sqlalchemy import Column, Integer, String, Text, ForeignKey, TIMESTAMP, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class Rol(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), nullable=False, unique=True)
    
    usuarios = relationship("Usuario", back_populates="rol")

class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    rol = relationship("Rol", back_populates="usuarios")
    escaneos = relationship("Escaneo", back_populates="usuario")

class Categoria(Base):
    __tablename__ = "categorias"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False, unique=True)
    descripcion = Column(Text, nullable=True)

    productos = relationship("Producto", back_populates="categoria")

class Producto(Base):
    __tablename__ = "productos"
    id = Column(Integer, primary_key=True, index=True)
    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=False)
    nombre = Column(String(150), nullable=False)
    sku = Column(String(50), unique=True, nullable=True)
    stock_actual = Column(Integer, default=0)
    unidades_por_paquete = Column(Integer, nullable=False, default=1)
    etiqueta_yolo = Column(String(100), nullable=False)
    creado_en = Column(TIMESTAMP, server_default=func.now())

    categoria = relationship("Categoria", back_populates="productos")
    detalles = relationship("DetalleEscaneo", back_populates="producto")

class Escaneo(Base):
    __tablename__ = "escaneos"
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    fecha = Column(TIMESTAMP, server_default=func.now())
    imagen_path = Column(String(255), nullable=False)
    estado = Column(
        Enum("PENDIENTE", "CONFIRMADO", "CANCELADO", name="estado_escaneo_enum"),
        default="PENDIENTE",
        nullable=False
    )

    usuario = relationship("Usuario", back_populates="escaneos")
    detalles = relationship("DetalleEscaneo", back_populates="escaneo", cascade="all, delete-orphan")

    @property
    def fecha_escaneo(self):
        return self.fecha

class DetalleEscaneo(Base):
    __tablename__ = "detalle_escaneo"
    id = Column(Integer, primary_key=True, index=True)
    escaneo_id = Column(Integer, ForeignKey("escaneos.id"), nullable=False)
    producto_id = Column(Integer, ForeignKey("productos.id"), nullable=False)
    cantidad_detectada = Column(Integer, nullable=False)

    escaneo = relationship("Escaneo", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles")
