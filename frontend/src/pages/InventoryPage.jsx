import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Search,
  Plus,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Tag,
  Layers,
  Filter,
} from 'lucide-react';
import {
  getProductos,
  getCategorias,
  createProducto,
  updateProducto,
} from '../api/api';
import { useAuth } from '../context/AuthContext';

export const InventoryPage = () => {
  const { isAdmin } = useAuth();

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados de Modales
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

  // Formulario Crear / Editar
  const [formData, setFormData] = useState({
    categoria_id: '',
    nombre: '',
    sku: '',
    stock_actual: 0,
    unidades_por_paquete: 1,
    etiqueta_yolo: '',
  });

  const [guardando, setGuardando] = useState(false);
  const [errorModal, setErrorModal] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      const [prodsData, catsData] = await Promise.all([
        getProductos(),
        getCategorias(),
      ]);
      setProductos(prodsData || []);
      setCategorias(catsData || []);
    } catch (err) {
      setError(err.message || 'Error al cargar el inventario.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Abrir modal crear
  const handleAbrirCrear = () => {
    setFormData({
      categoria_id: categorias[0]?.id || 1,
      nombre: '',
      sku: '',
      stock_actual: 0,
      unidades_por_paquete: 12,
      etiqueta_yolo: '',
    });
    setErrorModal(null);
    setModalCrearAbierto(true);
  };

  // Abrir modal editar
  const handleAbrirEditar = (prod) => {
    setProductoSeleccionado(prod);
    setFormData({
      categoria_id: prod.categoria_id,
      nombre: prod.nombre,
      sku: prod.sku || '',
      stock_actual: prod.stock_actual,
      unidades_por_paquete: prod.unidades_por_paquete,
      etiqueta_yolo: prod.etiqueta_yolo,
    });
    setErrorModal(null);
    setModalEditarAbierto(true);
  };

  // Guardar nuevo producto
  const handleCrearSubmit = async (e) => {
    e.preventDefault();
    try {
      setGuardando(true);
      setErrorModal(null);
      await createProducto({
        categoria_id: parseInt(formData.categoria_id, 10),
        nombre: formData.nombre.trim(),
        sku: formData.sku.trim() || undefined,
        stock_actual: parseInt(formData.stock_actual, 10) || 0,
        unidades_por_paquete: parseInt(formData.unidades_por_paquete, 10) || 1,
        etiqueta_yolo: formData.etiqueta_yolo.trim(),
      });
      setModalCrearAbierto(false);
      cargarDatos();
    } catch (err) {
      setErrorModal(err.message || 'Error al crear producto.');
    } finally {
      setGuardando(false);
    }
  };

  // Actualizar producto o stock
  const handleEditarSubmit = async (e) => {
    e.preventDefault();
    if (!productoSeleccionado) return;
    try {
      setGuardando(true);
      setErrorModal(null);
      await updateProducto(productoSeleccionado.id, {
        categoria_id: parseInt(formData.categoria_id, 10),
        nombre: formData.nombre.trim(),
        sku: formData.sku.trim() || undefined,
        stock_actual: parseInt(formData.stock_actual, 10),
        unidades_por_paquete: parseInt(formData.unidades_por_paquete, 10),
        etiqueta_yolo: formData.etiqueta_yolo.trim(),
      });
      setModalEditarAbierto(false);
      cargarDatos();
    } catch (err) {
      setErrorModal(err.message || 'Error al actualizar producto.');
    } finally {
      setGuardando(false);
    }
  };

  // Filtrado de productos por texto y categoría
  const productosFiltrados = productos.filter((p) => {
    const matchCat =
      categoriaActiva === 'TODOS' || p.categoria_id === parseInt(categoriaActiva, 10);
    const busq = busqueda.toLowerCase().trim();
    const matchText =
      !busq ||
      p.nombre.toLowerCase().includes(busq) ||
      (p.sku && p.sku.toLowerCase().includes(busq)) ||
      p.etiqueta_yolo.toLowerCase().includes(busq);
    return matchCat && matchText;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <Boxes className="w-4 h-4 text-[#0284C7]" />
            Catálogo Central • Embotelladora Coca-Cola Perú
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Gestión de Inventario y Stock
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Seguimiento de existencias en unidades físicas y paquetes completos equivalentes
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={cargarDatos}
            className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
            Refrescar
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleAbrirCrear}
              className="min-h-[40px] px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* Barra de Búsqueda y Pestañas de Categoría */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Buscador */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, SKU o etiqueta YOLO..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
            />
          </div>

          <span className="text-xs font-mono text-[#64748B] self-end md:self-center">
            Mostrando <strong>{productosFiltrados.length}</strong> de {productos.length} productos
          </span>
        </div>

        {/* Pestañas de Categorías */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#E2E8F0]">
          <button
            type="button"
            onClick={() => setCategoriaActiva('TODOS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
              categoriaActiva === 'TODOS'
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoriaActiva(String(cat.id))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
                categoriaActiva === String(cat.id)
                  ? 'bg-[#1E40AF] text-white shadow-xs'
                  : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
              }`}
            >
              {cat.nombre}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-[#64748B]">
            Cargando inventario...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-sm text-[#DC2626]">{error}</div>
        ) : productosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#64748B]">
            No se encontraron productos coincidentes con los filtros seleccionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">SKU / Producto</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">Empaque (YOLO)</th>
                  <th className="py-3.5 px-4 text-right">Stock Físico (Unidades)</th>
                  <th className="py-3.5 px-4 text-right">Packs Equivalentes</th>
                  <th className="py-3.5 px-4 text-center">Estado</th>
                  <th className="py-3.5 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {productosFiltrados.map((prod) => {
                  const stock = prod.stock_actual || 0;
                  const unidadesPack = prod.unidades_por_paquete || 1;
                  const packs = Math.floor(stock / unidadesPack);
                  const sueltas = stock % unidadesPack;

                  // Semáforo de stock
                  let badgeColor = 'bg-green-100 text-[#16A34A]';
                  let estadoTexto = 'Óptimo';
                  if (stock === 0) {
                    badgeColor = 'bg-red-100 text-[#DC2626]';
                    estadoTexto = 'Agotado';
                  } else if (stock < 24) {
                    badgeColor = 'bg-amber-100 text-[#D97706]';
                    estadoTexto = 'Bajo';
                  }

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#0F172A] text-sm">
                          {prod.nombre}
                        </div>
                        <span className="font-mono text-[11px] text-[#64748B]">
                          SKU: {prod.sku || 'SIN-SKU'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#64748B] font-medium">
                        {prod.categoria_nombre || 'General'}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0284C7]/10 text-[#0284C7] font-mono text-[11px] font-bold">
                          <span>x{unidadesPack} un/pack</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          tag: {prod.etiqueta_yolo}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#0F172A]">
                        {stock.toLocaleString()} un
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        <span className="font-bold text-[#0284C7]">
                          {packs} packs
                        </span>
                        {sueltas > 0 && (
                          <span className="text-[#64748B] text-[11px] ml-1">
                            +{sueltas} sueltas
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[11px] ${badgeColor}`}
                        >
                          {estadoTexto}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleAbrirEditar(prod)}
                          className="px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 text-[#1E40AF] font-semibold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Ajustar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL CREAR PRODUCTO (ADMIN)
          ========================================================================= */}
      {modalCrearAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1E40AF]" />
                Registrar Nuevo Producto
              </h3>
              <button
                type="button"
                onClick={() => setModalCrearAbierto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorModal && (
              <div className="p-3 bg-red-50 text-xs text-[#DC2626] rounded-lg border border-red-200">
                {errorModal}
              </div>
            )}

            <form onSubmit={handleCrearSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  placeholder="Ej: Inca Kola 500 ml (Pack x12)"
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria_id: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    placeholder="Ej: IK-500"
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Unidades por Paquete
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.unidades_por_paquete}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unidades_por_paquete: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Stock Inicial (Unidades)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock_actual}
                    onChange={(e) =>
                      setFormData({ ...formData, stock_actual: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Etiqueta de Detección YOLO
                </label>
                <input
                  type="text"
                  required
                  value={formData.etiqueta_yolo}
                  onChange={(e) =>
                    setFormData({ ...formData, etiqueta_yolo: e.target.value })
                  }
                  placeholder="Ej: pack_incakola_500ml o bottle"
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalCrearAbierto(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL EDITAR / AJUSTAR STOCK
          ========================================================================= */}
      {modalEditarAbierto && productoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#0284C7]" />
                Ajustar Stock / Editar Producto
              </h3>
              <button
                type="button"
                onClick={() => setModalEditarAbierto(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {errorModal && (
              <div className="p-3 bg-red-50 text-xs text-[#DC2626] rounded-lg border border-red-200">
                {errorModal}
              </div>
            )}

            <form onSubmit={handleEditarSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  required
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData({ ...formData, nombre: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Categoría
                  </label>
                  <select
                    value={formData.categoria_id}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria_id: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              {/* Ajuste manual de stock destacado */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-[#1E40AF]/20 space-y-2">
                <label className="block font-mono font-bold text-[#1E40AF] uppercase">
                  Ajuste Directo de Stock Físico (Unidades)
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={formData.stock_actual}
                  onChange={(e) =>
                    setFormData({ ...formData, stock_actual: e.target.value })
                  }
                  className="w-full p-2.5 rounded-lg border border-[#1E40AF]/30 bg-white font-mono text-base font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                />
                <p className="text-[11px] text-[#64748B]">
                  Equivalente a:{' '}
                  <strong className="text-[#0284C7] font-mono">
                    {Math.floor(
                      (parseInt(formData.stock_actual, 10) || 0) /
                        (parseInt(formData.unidades_por_paquete, 10) || 1)
                    )}{' '}
                    paquetes
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Unidades por Paquete
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.unidades_por_paquete}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unidades_por_paquete: e.target.value,
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>

                <div>
                  <label className="block font-mono font-semibold text-[#0F172A] uppercase mb-1">
                    Etiqueta YOLO
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.etiqueta_yolo}
                    onChange={(e) =>
                      setFormData({ ...formData, etiqueta_yolo: e.target.value })
                    }
                    className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setModalEditarAbierto(false)}
                  className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex-1 py-2.5 rounded-lg bg-[#0284C7] hover:bg-sky-700 text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {guardando ? 'Actualizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
