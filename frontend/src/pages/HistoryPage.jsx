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
  ExternalLink,
} from 'lucide-react';
import { getEscaneos } from '../api/api';

export const HistoryPage = () => {
  const [escaneos, setEscaneos] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal para inspección ampliada de fotografía y detalles
  const [escaneoModal, setEscaneoModal] = useState(null);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEscaneos();
      setEscaneos(data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar el historial de escaneos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

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
        d.producto_nombre?.toLowerCase().includes(busq)
      );
    return matchEstado && matchTexto;
  });

  // Helper para resolver la URL de la imagen subida al backend
  const resolverImagenUrl = (ruta) => {
    if (!ruta) return null;
    if (ruta.startsWith('http')) return ruta;
    return `http://127.0.0.1:8000${ruta}`;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4 text-[#0284C7]" />
            Trazabilidad y Auditoría • YOLOv8 HITL
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Historial de Escaneos
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Registro cronológico de capturas, detecciones preliminares y confirmaciones de inventario
          </p>
        </div>

        <button
          type="button"
          onClick={cargarHistorial}
          className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
          Refrescar Historial
        </button>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por ID, operario o producto..."
            className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
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
                    ? 'bg-[#D97706] text-white shadow-xs'
                    : est === 'CANCELADO'
                    ? 'bg-[#DC2626] text-white shadow-xs'
                    : 'bg-[#1E40AF] text-white shadow-xs'
                  : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
              }`}
            >
              {est}
            </button>
          ))}
        </div>
      </div>

      {/* Lista / Grid de Escaneos */}
      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          Cargando auditoría de escaneos...
        </div>
      ) : error ? (
        <div className="p-6 text-center text-sm text-[#DC2626] bg-red-50 rounded-2xl border border-red-200">
          {error}
        </div>
      ) : escaneosFiltrados.length === 0 ? (
        <div className="p-12 text-center text-sm text-[#64748B] bg-white rounded-2xl border border-[#E2E8F0]">
          No se encontraron escaneos con los criterios seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {escaneosFiltrados.map((esc) => {
            const totalPacks = (esc.detalles || []).reduce(
              (s, d) => s + (d.cantidad_paquetes || 0),
              0
            );
            const totalUnidades = (esc.detalles || []).reduce(
              (s, d) => s + (d.unidades_totales || 0),
              0
            );

            const imgUrl = resolverImagenUrl(esc.imagen_path);

            return (
              <div
                key={esc.id}
                className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Miniatura de la foto con badge de estado */}
                  <div
                    onClick={() => setEscaneoModal(esc)}
                    className="h-44 w-full bg-slate-900 relative cursor-pointer group overflow-hidden flex items-center justify-center"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={`Escaneo #${esc.id}`}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <div className="text-slate-500 text-xs font-mono">
                        Sin imagen registrada
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-black/60 text-white backdrop-blur-xs">
                        #{esc.id}
                      </span>
                    </div>

                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold ${
                          esc.estado === 'CONFIRMADO'
                            ? 'bg-[#16A34A] text-white'
                            : esc.estado === 'PENDIENTE'
                            ? 'bg-[#D97706] text-white'
                            : 'bg-[#DC2626] text-white'
                        }`}
                      >
                        {esc.estado}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 text-white p-1.5 rounded-lg text-xs font-mono flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      Inspeccionar
                    </div>
                  </div>

                  {/* Detalles del escaneo */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {esc.fecha_escaneo
                          ? new Date(esc.fecha_escaneo).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-[#0F172A]">
                        <User className="w-3.5 h-3.5 text-[#0284C7]" />
                        {esc.usuario_nombre || 'Operador'}
                      </span>
                    </div>

                    {/* Resumen de cantidades */}
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-[#E2E8F0] flex items-center justify-between text-xs font-mono">
                      <span className="text-[#64748B]">Total detectado:</span>
                      <strong className="text-[#0F172A] font-bold">
                        {totalPacks} packs ({totalUnidades} un)
                      </strong>
                    </div>

                    {/* Desglose de productos (primeros 2) */}
                    <div className="space-y-1.5 text-xs">
                      {(esc.detalles || []).slice(0, 2).map((d) => (
                        <div
                          key={d.id}
                          className="flex items-center justify-between text-slate-600 truncate"
                        >
                          <span className="truncate pr-2 font-medium">
                            • {d.producto_nombre}
                          </span>
                          <span className="font-mono text-[#0284C7] shrink-0 font-bold">
                            {d.cantidad_paquetes} packs
                          </span>
                        </div>
                      ))}
                      {(esc.detalles?.length || 0) > 2 && (
                        <div className="text-[11px] font-mono text-[#64748B] italic">
                          + {(esc.detalles?.length || 0) - 2} productos más...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    type="button"
                    onClick={() => setEscaneoModal(esc)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-mono"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1E40AF]" />
                    Ver Detalle Completo
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE INSPECCIÓN AMPLIADA DE ESCANEO
          ========================================================================= */}
      {escaneoModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-[#1E40AF]" />
                  Auditoría de Escaneo #{escaneoModal.id}
                </h3>
                <p className="text-xs font-mono text-[#64748B] mt-0.5">
                  Operario: {escaneoModal.usuario_nombre} • Fecha:{' '}
                  {new Date(escaneoModal.fecha_escaneo).toLocaleString('es-PE')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEscaneoModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Imagen Ampliada */}
            <div className="rounded-xl overflow-hidden bg-slate-950 border border-[#E2E8F0] max-h-[340px] flex items-center justify-center">
              <img
                src={resolverImagenUrl(escaneoModal.imagen_path)}
                alt={`Escaneo #${escaneoModal.id}`}
                className="max-h-[340px] w-auto object-contain"
              />
            </div>

            {/* Tabla completa de productos validados */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono font-bold text-[#0F172A] uppercase">
                Desglose de Productos Validados
              </h4>
              <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Bebida / Producto</th>
                      <th className="py-2.5 px-3 text-right">Paquetes</th>
                      <th className="py-2.5 px-3 text-right">Unidades Totales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0]">
                    {(escaneoModal.detalles || []).map((det) => (
                      <tr key={det.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-[#0F172A]">
                          {det.producto_nombre}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0284C7]">
                          {det.cantidad_paquetes} packs
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#16A34A] font-bold">
                          +{det.unidades_totales} un
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setEscaneoModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-semibold rounded-lg font-mono cursor-pointer"
              >
                Cerrar Inspección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
