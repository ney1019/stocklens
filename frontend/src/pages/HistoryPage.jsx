import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
  Filter,
  Eye,
  Calendar,
  User,
  Boxes,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  X,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { getEscaneos, confirmarEscaneo, cancelarEscaneo } from '../api/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const resolverImagenUrl = (ruta) => {
  if (!ruta) return null;
  if (ruta.startsWith('http')) return ruta;
  const cleanRuta = ruta.startsWith('/') ? ruta : `/${ruta}`;
  return `${API_BASE_URL}${cleanRuta}`;
};

// Componente de imagen seguro que muestra placeholder si la foto no existe o falla
const SafeImage = ({ src, alt, className }) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  if (!src || imgError) {
    return (
      <div className="w-full h-full min-h-[140px] flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 select-none">
        <Boxes className="w-8 h-8 text-slate-600 mb-1.5" />
        <span className="text-[11px] font-mono text-slate-400 font-medium">
          Registro fotográfico
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setImgError(true)}
    />
  );
};

export const HistoryPage = () => {
  const [escaneos, setEscaneos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mensajeExito, setMensajeExito] = useState(null);

  // Acciones en curso sobre un escaneo
  const [accionandoId, setAccionandoId] = useState(null);

  // Modal para inspección ampliada (Frontal + Lateral)
  const [escaneoModal, setEscaneoModal] = useState(null);
  const [tabFotoModal, setTabFotoModal] = useState('frontal'); // 'frontal' | 'lateral'

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEscaneos();
      setEscaneos(data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar el historial de recepciones.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  // Confirmar ingreso directamente desde la tarjeta
  const handleConfirmarDirecto = async (esc) => {
    try {
      setAccionandoId(esc.id);
      setError(null);

      const items = (esc.detalles || []).map((d) => ({
        producto_id: d.producto_id,
        ancho: d.ancho || 1,
        fondo: d.fondo || 1,
        alto: d.alto || 1,
        cantidad_detectada: d.cantidad_paquetes || d.cantidad_detectada || 1,
      }));

      await confirmarEscaneo(esc.id, items);

      setMensajeExito(`Recepción #${esc.id} confirmada. Paquetes sumados al inventario.`);
      setTimeout(() => setMensajeExito(null), 4000);

      // Actualizar localmente el estado del escaneo
      setEscaneos((prev) =>
        prev.map((item) =>
          item.id === esc.id ? { ...item, estado: 'CONFIRMADO' } : item
        )
      );

      if (escaneoModal?.id === esc.id) {
        setEscaneoModal((prev) => (prev ? { ...prev, estado: 'CONFIRMADO' } : null));
      }
    } catch (err) {
      setError(err.message || `Error al confirmar el escaneo #${esc.id}.`);
    } finally {
      setAccionandoId(null);
    }
  };

  // Cancelar escaneo directamente desde la tarjeta
  const handleCancelarDirecto = async (esc) => {
    if (!window.confirm(`¿Está seguro de cancelar el escaneo #${esc.id}?`)) {
      return;
    }

    try {
      setAccionandoId(esc.id);
      setError(null);
      await cancelarEscaneo(esc.id);

      setMensajeExito(`Escaneo #${esc.id} cancelado correctamente.`);
      setTimeout(() => setMensajeExito(null), 4000);

      setEscaneos((prev) =>
        prev.map((item) =>
          item.id === esc.id ? { ...item, estado: 'CANCELADO' } : item
        )
      );

      if (escaneoModal?.id === esc.id) {
        setEscaneoModal((prev) => (prev ? { ...prev, estado: 'CANCELADO' } : null));
      }
    } catch (err) {
      setError(err.message || `Error al cancelar el escaneo #${esc.id}.`);
    } finally {
      setAccionandoId(null);
    }
  };

  // Filtrado por estado y texto
  const escaneosFiltrados = escaneos.filter((e) => {
    const matchEstado =
      filtroEstado === 'TODOS' || e.estado === filtroEstado;
    const busq = busqueda.toLowerCase().trim();
    const matchTexto =
      !busq ||
      String(e.id).includes(busq) ||
      (e.usuario_nombre && e.usuario_nombre.toLowerCase().includes(busq)) ||
      (e.detalles || []).some((d) =>
        (d.producto_nombre || d.nombre)?.toLowerCase().includes(busq)
      );
    return matchEstado && matchTexto;
  });

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4 text-[#0284C7]" />
            Control de Inventario • Registro de Ingresos
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Historial de Recepciones y Escaneos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro cronológico de entradas de pallets, cubicaje volumétrico y confirmaciones de stock en paquetes
          </p>
        </div>

        <button
          type="button"
          onClick={cargarHistorial}
          className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
          Refrescar Historial
        </button>
      </div>

      {/* Alertas globales de éxito o error */}
      {mensajeExito && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs font-mono text-[#16A34A] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-mono text-[#DC2626] flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ID, almacenero o producto..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
          />
        </div>

        {/* Filtros de estado */}
        <div className="flex items-center gap-1.5 self-start md:self-center overflow-x-auto">
          {['TODOS', 'CONFIRMADO', 'PENDIENTE', 'CANCELADO'].map((est) => (
            <button
              key={est}
              type="button"
              onClick={() => setFiltroEstado(est)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors shrink-0 cursor-pointer ${
                filtroEstado === est
                  ? est === 'CONFIRMADO'
                    ? 'bg-[#16A34A] text-white shadow-xs'
                    : est === 'PENDIENTE'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : est === 'CANCELADO'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-[#1E40AF] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {est === 'TODOS' ? 'Todos' : est}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Grid de Escaneos */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-slate-500 bg-white rounded-2xl border border-slate-200">
          Cargando registro de recepciones...
        </div>
      ) : escaneosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-sm text-slate-500 bg-white rounded-2xl border border-slate-200">
          No se encontraron recepciones con los criterios seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {escaneosFiltrados.map((esc) => {
            const totalPacks = (esc.detalles || []).reduce(
              (s, d) => s + (d.cantidad_paquetes || d.cantidad_detectada || 0),
              0
            );

            const esPendiente = esc.estado === 'PENDIENTE';
            const imgUrl = resolverImagenUrl(esc.imagen_path);
            const estaAccionando = accionandoId === esc.id;

            return (
              <div
                key={esc.id}
                className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between ${
                  esPendiente ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Miniatura de la foto con badge de estado */}
                  <div
                    onClick={() => {
                      setEscaneoModal(esc);
                      setTabFotoModal('frontal');
                    }}
                    className="h-44 w-full bg-slate-950 relative cursor-pointer group overflow-hidden flex items-center justify-center"
                  >
                    <SafeImage
                      src={imgUrl}
                      alt={`Escaneo #${esc.id}`}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-black/60 text-white backdrop-blur-xs">
                        #{esc.id}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold shadow-xs ${
                          esc.estado === 'CONFIRMADO'
                            ? 'bg-[#16A34A] text-white'
                            : esc.estado === 'PENDIENTE'
                            ? 'bg-amber-500 text-white'
                            : 'bg-red-600 text-white'
                        }`}
                      >
                        {esc.estado}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white p-1.5 rounded-lg text-xs font-mono flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Ver detalle
                    </div>
                  </div>

                  {/* Detalles del escaneo */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {esc.fecha_escaneo || esc.fecha
                          ? new Date(esc.fecha_escaneo || esc.fecha).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="w-3.5 h-3.5 text-[#0284C7]" />
                        {esc.usuario_nombre || 'Almacenero'}
                      </span>
                    </div>

                    {/* Resumen de paquetes */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-500">Total calculado:</span>
                      <strong className="text-slate-900 font-bold text-sm">
                        +{totalPacks} paquetes
                      </strong>
                    </div>

                    {/* Desglose de productos (primeros 2) */}
                    <div className="space-y-1.5 text-xs">
                      {(esc.detalles || []).slice(0, 2).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-slate-700 truncate"
                        >
                          <span className="truncate pr-2 font-medium">
                            • {d.producto_nombre || d.nombre}
                          </span>
                          <span className="font-mono text-[#0284C7] shrink-0 font-bold text-xs">
                            {d.cantidad_paquetes || d.cantidad_detectada} paq.
                          </span>
                        </div>
                      ))}
                      {(esc.detalles?.length || 0) > 2 && (
                        <div className="text-[11px] font-mono text-slate-400 italic">
                          + {(esc.detalles?.length || 0) - 2} productos más...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botones de acción inferiores */}
                <div className="p-4 pt-0 space-y-2">
                  {/* SI ESTÁ PENDIENTE: BOTONES DIRECTOS DE CONFIRMAR Y CANCELAR */}
                  {esPendiente ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          disabled={estaAccionando}
                          onClick={() => handleConfirmarDirecto(esc)}
                          className="py-2 px-3 bg-[#16A34A] hover:bg-green-700 active:bg-green-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          {estaAccionando ? (
                            <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Confirmar</span>
                        </button>

                        <button
                          type="button"
                          disabled={estaAccionando}
                          onClick={() => handleCancelarDirecto(esc)}
                          className="py-2 px-3 bg-white hover:bg-red-50 border border-red-200 text-red-600 text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEscaneoModal(esc);
                          setTabFotoModal('frontal');
                        }}
                        className="w-full py-1.5 text-center text-xs font-mono text-slate-500 hover:text-[#1E40AF] transition-colors"
                      >
                        Ver desglose volumétrico →
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEscaneoModal(esc);
                        setTabFotoModal('frontal');
                      }}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#1E40AF]" />
                      Ver Detalle Completo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE DETALLE COMPLETO (DOBLE FOTO: FRONTAL Y LATERAL)
          ========================================================================= */}
      {escaneoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-[#1E40AF]" />
                    Inspección de Recepción #{escaneoModal.id}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold ${
                      escaneoModal.estado === 'CONFIRMADO'
                        ? 'bg-green-100 text-[#16A34A]'
                        : escaneoModal.estado === 'PENDIENTE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {escaneoModal.estado}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500">
                  Almacenero: {escaneoModal.usuario_nombre || 'Almacenero'} • Fecha:{' '}
                  {new Date(escaneoModal.fecha_escaneo || escaneoModal.fecha).toLocaleString('es-PE')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEscaneoModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Selector de Pestañas si existen ambas fotos (Frontal y Lateral) */}
            {escaneoModal.imagen_lateral_path && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTabFotoModal('frontal')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    tabFotoModal === 'frontal'
                      ? 'bg-[#1E40AF] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vista Frontal (Ancho × Alto)
                </button>
                <button
                  type="button"
                  onClick={() => setTabFotoModal('lateral')}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                    tabFotoModal === 'lateral'
                      ? 'bg-[#0284C7] text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vista Lateral (Fondo / Profundidad)
                </button>
              </div>
            )}

            {/* Visor de Imagen con SafeImage */}
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-slate-200 h-64 sm:h-80 flex items-center justify-center">
              {tabFotoModal === 'frontal' || !escaneoModal.imagen_lateral_path ? (
                <SafeImage
                  src={resolverImagenUrl(escaneoModal.imagen_path)}
                  alt={`Foto frontal #${escaneoModal.id}`}
                  className="h-full w-auto object-contain"
                />
              ) : (
                <SafeImage
                  src={resolverImagenUrl(escaneoModal.imagen_lateral_path)}
                  alt={`Foto lateral #${escaneoModal.id}`}
                  className="h-full w-auto object-contain"
                />
              )}
            </div>

            {/* Desglose Volumétrico de Productos (Ancho x Fondo x Alto = Total) */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-slate-900 uppercase">
                Desglose Volumétrico de Paquetes
              </h4>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Dimensiones (Ancho × Fondo × Alto)</th>
                      <th className="py-2.5 px-3 text-right">Total Paquetes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(escaneoModal.detalles || []).map((det) => {
                      const ancho = det.ancho || 1;
                      const fondo = det.fondo || 1;
                      const alto = det.alto || 1;
                      const total = det.cantidad_paquetes || det.cantidad_detectada || (ancho * fondo * alto);

                      return (
                        <tr key={det.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900">
                            {det.producto_nombre || det.nombre}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold">
                              {ancho} col × {fondo} prof × {alto} niv
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-sm text-[#16A34A]">
                            +{total} paquetes
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              {escaneoModal.estado === 'PENDIENTE' ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleConfirmarDirecto(escaneoModal)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#16A34A] hover:bg-green-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Ingresar Stock</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCancelarDirecto(escaneoModal)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </button>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-400">
                  Estado finalizado: <strong>{escaneoModal.estado}</strong>
                </div>
              )}

              <button
                type="button"
                onClick={() => setEscaneoModal(null)}
                className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl font-mono cursor-pointer"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
