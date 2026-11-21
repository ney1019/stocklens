import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  PackageCheck,
  CalendarCheck,
  AlertTriangle,
  Users,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldCheck,
  Building2,
  Truck,
  ScanLine,
} from 'lucide-react';
import { getDashboardStats, getEscaneos } from '../api/api';

export const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [recientes, setRecientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, escaneosData] = await Promise.all([
        getDashboardStats(),
        getEscaneos(),
      ]);
      setStats(statsData);
      setRecientes((escaneosData || []).slice(0, 5));
    } catch (err) {
      setError(err.message || 'Error al cargar las métricas del almacén.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="w-9 h-9 border-3 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-[#64748B]">
          Cargando métricas de almacén...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={fetchData}
          className="px-3.5 py-1.5 bg-[#DC2626] text-white rounded-lg text-xs font-semibold cursor-pointer hover:bg-red-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Cálculo para escala del gráfico de barras CSS
  const maxStockCategoria = Math.max(
    ...(stats?.stock_por_categoria?.map((c) => c.total_unidades) || [1]),
    1
  );

  return (
    <div className="space-y-6">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
            Panel Ejecutivo • Distribución Mayorista
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Control de Inventario y Operaciones
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Monitoreo en tiempo real de existencias, recepciones de pallets y despachos
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchData}
            className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
            Actualizar
          </button>

          <Link
            to="/usuarios"
            className="min-h-[40px] px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Gestionar Usuarios
          </Link>
        </div>
      </div>

      {/* =========================================================================
          4 TARJETAS KPI SUPERIORES (100% PAQUETES Y OPERACIÓN DE ALMACÉN)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Paquetes en Almacén */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">
              Total Paquetes
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E40AF] flex items-center justify-center">
              <Boxes className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#0F172A] tracking-tight">
            {(stats?.total_unidades_almacen || 0).toLocaleString()}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1.5 flex items-center gap-1 font-mono">
            <span className="text-[#16A34A] font-bold">Paquetes</span> en inventario físico
          </p>
        </div>

        {/* KPI 2: Recepciones de Pallets Hoy */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">
              Recepciones Hoy
            </span>
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-[#0284C7] flex items-center justify-center">
              <PackageCheck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#0284C7] tracking-tight">
            {stats?.escaneos_confirmados_hoy || 0}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1.5 flex items-center gap-1 font-mono">
            <span>Ingresos de pallets confirmados</span>
          </p>
        </div>

        {/* KPI 3: Despachos Realizados Hoy */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">
              Despachos Hoy
            </span>
            <div className="w-9 h-9 rounded-xl bg-green-50 text-[#16A34A] flex items-center justify-center">
              <Truck className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#16A34A] tracking-tight">
            {stats?.salidas_confirmadas_hoy || 0}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1.5 flex items-center gap-1 font-mono">
            <span>Salidas por documento confirmadas</span>
          </p>
        </div>

        {/* KPI 4: Alertas de Stock Bajo (< 10 paq.) */}
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-2xs relative overflow-hidden">
          <div className="flex items-center justify-between text-[#64748B] mb-2">
            <span className="text-xs font-mono uppercase font-semibold">
              Stock Bajo
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-[#D97706] flex items-center justify-center">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
          </div>
          <div className="text-3xl font-extrabold font-mono text-[#D97706] tracking-tight">
            {stats?.productos_bajo_stock?.length || 0}
          </div>
          <p className="text-[11px] text-[#64748B] mt-1.5 flex items-center gap-1 font-mono">
            <span>Productos con stock &lt; 10 paquetes</span>
          </p>
        </div>
      </div>

      {/* =========================================================================
          GRÁFICO DE BARRAS LIMPIO (STOCK AGRUPADO POR CATEGORÍA) Y STOCK CRÍTICO
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0284C7]" />
                Distribución de Stock por Categoría
              </h2>
              <p className="text-xs text-[#64748B]">
                Existencias consolidadas en paquetes
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-[#64748B]">
              Total categorías: {stats?.stock_por_categoria?.length || 0}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {(stats?.stock_por_categoria || []).map((cat) => {
              const porcentaje = Math.round(
                (cat.total_unidades / maxStockCategoria) * 100
              );

              return (
                <div key={cat.categoria_id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#0F172A]">
                      {cat.categoria_nombre}
                    </span>
                    <span className="font-mono text-[#64748B]">
                      <strong className="text-[#0F172A] font-bold">
                        {cat.total_unidades.toLocaleString()}
                      </strong>{' '}
                      paquetes
                    </span>
                  </div>

                  {/* Barra de progreso CSS pura */}
                  <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-[#1E40AF] to-[#0284C7] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(porcentaje, 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Productos en Alerta de Stock Bajo */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
            <div>
              <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D97706]" />
                Alertas de Reposición (&lt; 10 paq.)
              </h2>
              <p className="text-xs text-[#64748B]">
                Productos con necesidad prioritaria de ingreso
              </p>
            </div>
            <Link
              to="/inventario"
              className="text-xs text-[#1E40AF] hover:underline font-semibold font-mono"
            >
              Ver inventario
            </Link>
          </div>

          {stats?.productos_bajo_stock?.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#16A34A] bg-green-50/50 rounded-xl border border-green-200">
              ✓ Todos los productos operan sobre el nivel mínimo de paquetes.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {stats?.productos_bajo_stock?.slice(0, 6).map((prod) => (
                <div
                  key={prod.id}
                  className="p-3 rounded-xl border border-[#E2E8F0] bg-slate-50/60 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#0F172A] truncate">
                      {prod.nombre}
                    </p>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      SKU: {prod.sku || 'N/A'}
                    </span>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold ${
                      prod.stock_actual === 0
                        ? 'bg-rose-100 text-[#DC2626] border border-rose-200'
                        : 'bg-amber-100 text-[#D97706] border border-amber-200'
                    }`}
                  >
                    {prod.stock_actual} paq.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          TABLA RESUMEN DE ÚLTIMOS ESCANEOS REALIZADOS
          ========================================================================= */}
      <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#1E40AF]" />
              Últimas Recepciones de Pallets
            </h2>
            <p className="text-xs text-[#64748B]">
              Historial reciente de ingresos registrados en almacén
            </p>
          </div>
          <Link
            to="/historial"
            className="text-xs text-[#1E40AF] hover:underline font-semibold font-mono flex items-center gap-1"
          >
            Ver historial completo
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recientes.length === 0 ? (
          <div className="py-8 text-center text-sm text-[#64748B]">
            No se han registrado recepciones recientemente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase">
                <tr>
                  <th className="py-3 px-3">ID</th>
                  <th className="py-3 px-3">Fecha</th>
                  <th className="py-3 px-3">Almacenero</th>
                  <th className="py-3 px-3">Paquetes Registrados</th>
                  <th className="py-3 px-3 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {recientes.map((esc) => {
                  const totalPacks = (esc.detalles || []).reduce(
                    (s, d) => s + (d.cantidad_paquetes || 0),
                    0
                  );

                  return (
                    <tr key={esc.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#0F172A]">
                        #{esc.id}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#64748B]">
                        {esc.fecha_escaneo
                          ? new Date(esc.fecha_escaneo).toLocaleString('es-PE', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'N/A'}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#0F172A]">
                        {esc.usuario_nombre || 'Almacenero'}
                      </td>
                      <td className="py-3 px-3 font-mono text-[#0F172A]">
                        {totalPacks} paquetes ({esc.detalles?.length || 0} ítems)
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-semibold text-[11px] ${
                            esc.estado === 'CONFIRMADO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : esc.estado === 'PENDIENTE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {esc.estado}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
