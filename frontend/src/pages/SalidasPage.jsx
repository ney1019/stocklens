import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  XCircle,
  PackageMinus,
  ArrowRight,
  Boxes,
  Calendar,
  User,
  Search,
} from 'lucide-react';
import {
  procesarPdfSalida,
  confirmarSalida,
  getSalidas,
  getProductos,
} from '../api/api';
import { useAuth } from '../context/AuthContext';

export const SalidasPage = () => {
  const { user } = useAuth();

  // Estados de carga de PDF
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [procesandoPdf, setProcesandoPdf] = useState(false);
  const [errorCarga, setErrorCarga] = useState(null);

  // Estados de Despacho en proceso
  const [despachoActivo, setDespachoActivo] = useState(null);
  // despachoActivo: { numero_documento, tipo_documento, archivo_path, items: [{ producto_id, nombre, sku, stock_actual, cantidad_paquetes }] }
  const [confirmando, setConfirmando] = useState(false);
  const [errorConfirmacion, setErrorConfirmacion] = useState(null);
  const [exitoConfirmacion, setExitoConfirmacion] = useState(null);

  // Modal para añadir producto manual al despacho
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [modalManualAbierto, setModalManualAbierto] = useState(false);
  const [productoManualId, setProductoManualId] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);

  // Historial de salidas
  const [historialSalidas, setHistorialSalidas] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);

  const fileInputRef = useRef(null);

  // Cargar historial y catálogo de productos
  const cargarDatos = async () => {
    try {
      setCargandoHistorial(true);
      const [salidasData, prodsData] = await Promise.all([
        getSalidas(),
        getProductos(),
      ]);
      setHistorialSalidas(salidasData || []);
      setCatalogoProductos(prodsData || []);
    } catch (err) {
      console.error('Error al cargar datos de salidas:', err);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Manejo de archivo PDF
  const handleSelectFile = (file) => {
    setErrorCarga(null);
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorCarga('El archivo debe ser un documento PDF válido (.pdf).');
      return;
    }

    setArchivoPdf(file);
  };

  // Procesar archivo PDF con la API
  const handleProcesarPdf = async () => {
    if (!archivoPdf) {
      setErrorCarga('Seleccione un archivo PDF antes de procesar.');
      return;
    }

    try {
      setProcesandoPdf(true);
      setErrorCarga(null);
      setErrorConfirmacion(null);
      setExitoConfirmacion(null);

      const formData = new FormData();
      formData.append('archivo', archivoPdf);
      formData.append('usuario_id', user?.id || 1);

      const data = await procesarPdfSalida(formData);

      // Normalizar cantidades e items
      const itemsConCantidad = (data.items || []).map((item) => ({
        producto_id: item.producto_id,
        nombre: item.nombre,
        sku: item.sku,
        stock_actual: item.stock_actual ?? 0,
        cantidad_paquetes: Math.max(1, item.cantidad_paquetes || 1),
      }));

      setDespachoActivo({
        numero_documento: data.numero_documento || 'B001-0001',
        tipo_documento: data.tipo_documento || 'BOLETA',
        archivo_path: data.archivo_path,
        items: itemsConCantidad,
      });
    } catch (err) {
      setErrorCarga(err.message || 'Error al procesar el documento PDF.');
    } finally {
      setProcesandoPdf(false);
    }
  };

  // Modificar cantidad a despachar de un producto
  const handleModificarCantidad = (productoId, delta) => {
    if (!despachoActivo) return;
    setDespachoActivo((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.producto_id === productoId) {
          const nuevaCantidad = Math.max(1, item.cantidad_paquetes + delta);
          return {
            ...item,
            cantidad_paquetes: nuevaCantidad,
          };
        }
        return item;
      }),
    }));
  };

  // Cambiar cantidad con input directo
  const handleCantidadDirecta = (productoId, valor) => {
    if (!despachoActivo) return;
    const num = Math.max(1, parseInt(valor, 10) || 1);
    setDespachoActivo((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.producto_id === productoId
          ? { ...item, cantidad_paquetes: num }
          : item
      ),
    }));
  };

  // Quitar producto de la lista de despacho
  const handleQuitarItem = (productoId) => {
    if (!despachoActivo) return;
    setDespachoActivo((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.producto_id !== productoId),
    }));
  };

  // Agregar producto manual al despacho
  const handleAgregarManual = () => {
    if (!productoManualId || !despachoActivo) return;
    const prodId = parseInt(productoManualId, 10);
    const prod = catalogoProductos.find((p) => p.id === prodId);
    if (!prod) return;

    const existe = despachoActivo.items.find((i) => i.producto_id === prod.id);
    if (existe) {
      handleModificarCantidad(prod.id, cantidadManual);
    } else {
      const nuevoItem = {
        producto_id: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        stock_actual: prod.stock_actual ?? 0,
        cantidad_paquetes: Math.max(1, cantidadManual),
      };
      setDespachoActivo((prev) => ({
        ...prev,
        items: [...prev.items, nuevoItem],
      }));
    }

    setModalManualAbierto(false);
    setProductoManualId('');
    setCantidadManual(1);
  };

  // Validar si algún item excede el stock actual
  const hayStockInsuficiente = (despachoActivo?.items || []).some(
    (item) => item.cantidad_paquetes > item.stock_actual
  );

  // Confirmar despacho y descontar inventario
  const handleConfirmarDespacho = async () => {
    if (!despachoActivo || despachoActivo.items.length === 0) {
      setErrorConfirmacion('Debe incluir al menos un producto a despachar.');
      return;
    }

    if (hayStockInsuficiente) {
      setErrorConfirmacion(
        'No se puede confirmar: existen productos con cantidad mayor al stock disponible en almacén.'
      );
      return;
    }

    try {
      setConfirmando(true);
      setErrorConfirmacion(null);

      const payload = {
        usuario_id: user?.id || 1,
        numero_documento: despachoActivo.numero_documento.trim(),
        tipo_documento: despachoActivo.tipo_documento,
        archivo_path: despachoActivo.archivo_path,
        items: despachoActivo.items.map((i) => ({
          producto_id: i.producto_id,
          cantidad_paquetes: i.cantidad_paquetes,
        })),
      };

      const res = await confirmarSalida(payload);

      setExitoConfirmacion(
        `Despacho ${res.numero_documento} confirmado exitosamente. Se descontaron los paquetes del inventario.`
      );
      setDespachoActivo(null);
      setArchivoPdf(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Refrescar historial y productos
      cargarDatos();
      setTimeout(() => setExitoConfirmacion(null), 6000);
    } catch (err) {
      setErrorConfirmacion(err.message || 'Error al confirmar el despacho.');
    } finally {
      setConfirmando(false);
    }
  };

  const totalPaquetesADespachar = (despachoActivo?.items || []).reduce(
    (sum, i) => sum + (i.cantidad_paquetes || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#1E40AF] uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4 text-[#0284C7]" />
            Módulo de Despachos • Distribución Mayorista
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Salidas y Despachos Guia de despacho 
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Carga de comprobantes en PDF para deducción automática de stock en paquetes
          </p>
        </div>

        <button
          type="button"
          onClick={cargarDatos}
          className="min-h-[40px] px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-[#E2E8F0] rounded-xl text-xs font-semibold text-[#0F172A] flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-center"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#0284C7]" />
          Refrescar Historial
        </button>
      </div>

      {/* Alerta de Éxito Global */}
      {exitoConfirmacion && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-xs font-mono text-[#16A34A] flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{exitoConfirmacion}</span>
        </div>
      )}

      {/* SECCIÓN 1: CARGA Y PROCESAMIENTO DE PDF */}
      {!despachoActivo && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-4">
          <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#1E40AF]" />
            Cargar Comprobante de Venta (Guia de despacho) en PDF
          </h2>
          <p className="text-xs text-[#64748B]">
            El sistema extraerá automáticamente el número de documento y los productos con sus cantidades en paquetes.
          </p>

          {errorCarga && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorCarga}</span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => handleSelectFile(e.target.files?.[0])}
          />

          {!archivoPdf ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files?.[0]) handleSelectFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging
                  ? 'border-[#1E40AF] bg-[#1E40AF]/10'
                  : 'border-[#E2E8F0] hover:border-[#1E40AF]/50 bg-slate-50/50 hover:bg-slate-50'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex items-center justify-center text-[#1E40AF] mb-3">
                <UploadCloud className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-[#0F172A] mb-1">
                Arrastre aquí la Guia de despacho en PDF o haga clic para examinar
              </h3>
              <p className="text-xs text-[#64748B] max-w-sm mb-4">
                Compatible con formatos electrónicos estándar de venta mayorista
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                Examinar Archivo PDF
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-[#E2E8F0] bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-red-100 text-[#DC2626] flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#0F172A] truncate max-w-md">
                    {archivoPdf.name}
                  </div>
                  <div className="text-xs font-mono text-[#64748B]">
                    {(archivoPdf.size / (1024 * 1024)).toFixed(2)} MB • Archivo PDF listo para lectura
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  disabled={procesandoPdf}
                  onClick={() => {
                    setArchivoPdf(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] hover:bg-white text-xs font-semibold text-[#64748B] hover:text-[#0F172A] cursor-pointer"
                >
                  Cambiar
                </button>
                <button
                  type="button"
                  disabled={procesandoPdf}
                  onClick={handleProcesarPdf}
                  className="flex-1 sm:flex-none min-w-[180px] px-5 py-2.5 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {procesandoPdf ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Leyendo PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      <span>Procesar Documento</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: REVISIÓN Y CONFIRMACIÓN DE DESPACHO */}
      {despachoActivo && (
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#E2E8F0] gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1E40AF] text-white">
                  {despachoActivo.tipo_documento}
                </span>
                <h2 className="text-lg font-bold text-[#0F172A]">
                  Revisión de Despacho: {despachoActivo.numero_documento}
                </h2>
              </div>
              <p className="text-xs text-[#64748B]">
                Revise las cantidades de paquetes a descontar del inventario antes de confirmar la salida
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalManualAbierto(true)}
                className="px-3 py-2 rounded-lg bg-[#0284C7]/10 hover:bg-[#0284C7]/20 text-[#0284C7] font-semibold text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                + Añadir Producto
              </button>
              <button
                type="button"
                onClick={() => setDespachoActivo(null)}
                className="px-3 py-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-100 text-xs font-semibold text-[#64748B] cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>

          {errorConfirmacion && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-[#DC2626] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorConfirmacion}</span>
            </div>
          )}

          {/* Formulario editable de Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-[#E2E8F0]">
            <div>
              <label className="block text-[11px] font-mono font-bold text-[#64748B] uppercase mb-1">
                Número de Documento
              </label>
              <input
                type="text"
                value={despachoActivo.numero_documento}
                onChange={(e) =>
                  setDespachoActivo({ ...despachoActivo, numero_documento: e.target.value })
                }
                className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-white font-mono text-sm font-bold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-[#64748B] uppercase mb-1">
                Tipo de Comprobante
              </label>
              <select
                value={despachoActivo.tipo_documento}
                onChange={(e) =>
                  setDespachoActivo({ ...despachoActivo, tipo_documento: e.target.value })
                }
                className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-white text-sm font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              >
                <option value="GUIA">GUÍA DE REMISIÓN</option>
              </select>
            </div>
          </div>

          {/* Tabla de Productos a Despachar */}
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-center">Stock Actual</th>
                  <th className="py-3 px-4 text-center">Cantidad a Despachar</th>
                  <th className="py-3 px-4 text-center">Stock Resultante</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {despachoActivo.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#64748B]">
                      No hay productos en esta lista de despacho. Agregue productos con el botón superior.
                    </td>
                  </tr>
                ) : (
                  despachoActivo.items.map((item) => {
                    const resultante = item.stock_actual - item.cantidad_paquetes;
                    const stockInsuficiente = item.cantidad_paquetes > item.stock_actual;

                    return (
                      <tr key={item.producto_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-sm text-[#0F172A]">{item.nombre}</div>
                          <span className="font-mono text-[11px] text-[#64748B]">
                            SKU: {item.sku || 'N/A'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm text-[#0F172A]">
                          {item.stock_actual} paq.
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-[#E2E8F0]">
                            <button
                              type="button"
                              onClick={() => handleModificarCantidad(item.producto_id, -1)}
                              className="w-7 h-7 rounded bg-white hover:bg-slate-200 font-bold text-sm flex items-center justify-center cursor-pointer shadow-2xs"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.cantidad_paquetes}
                              onChange={(e) =>
                                handleCantidadDirecta(item.producto_id, e.target.value)
                              }
                              className="w-14 text-center font-mono font-bold text-sm bg-white border border-[#E2E8F0] rounded py-0.5 text-[#0F172A] focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleModificarCantidad(item.producto_id, 1)}
                              className="w-7 h-7 rounded bg-white hover:bg-slate-200 font-bold text-sm flex items-center justify-center cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-sm">
                          <span className={stockInsuficiente ? 'text-[#DC2626]' : 'text-[#0F172A]'}>
                            {resultante} paq.
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono">
                          {stockInsuficiente ? (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-[#DC2626]">
                              Stock Insuficiente
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-[#16A34A]">
                              Disponible
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuitarItem(item.producto_id)}
                            className="text-slate-400 hover:text-[#DC2626] p-1 rounded transition-colors cursor-pointer"
                            title="Quitar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Banner de Totales y Botón de Confirmación */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs font-mono text-slate-400">Total paquetes a despachar:</div>
              <div className="text-xl font-bold font-mono text-[#0284C7]">
                -{totalPaquetesADespachar} paquetes
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setDespachoActivo(null)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Descartar
              </button>

              <button
                type="button"
                disabled={
                  confirmando ||
                  despachoActivo.items.length === 0 ||
                  hayStockInsuficiente
                }
                onClick={handleConfirmarDespacho}
                className="flex-1 sm:flex-none min-w-[200px] px-6 py-2.5 rounded-xl bg-[#16A34A] hover:bg-green-700 active:bg-green-800 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmando ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Descontando Stock...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Despacho</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN 3: HISTORIAL RECIENTE DE SALIDAS */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div>
            <h2 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#0284C7]" />
              Historial Reciente de Salidas y Despachos
            </h2>
            <p className="text-xs text-[#64748B]">
              Registro cronológico de boletas y facturas despachadas desde el almacén
            </p>
          </div>
          <span className="text-xs font-mono text-[#64748B]">
            Total registros: <strong>{historialSalidas.length}</strong>
          </span>
        </div>

        {cargandoHistorial ? (
          <div className="p-8 text-center text-xs font-mono text-[#64748B]">
            Cargando historial de salidas...
          </div>
        ) : historialSalidas.length === 0 ? (
          <div className="py-12 text-center text-[#64748B] space-y-2">
            <Boxes className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-semibold text-[#0F172A]">
              Aún no se han registrado despachos.
            </div>
            <div className="text-xs">
              Suba una boleta o factura en PDF en la parte superior para registrar el primer despacho.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-[#E2E8F0] text-[#64748B] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Operario</th>
                  <th className="py-3 px-4">Productos Despachados</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {historialSalidas.map((salida) => {
                  const totalPacks = (salida.detalles || []).reduce(
                    (s, d) => s + (d.cantidad_paquetes || 0),
                    0
                  );

                  return (
                    <tr key={salida.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[#64748B]">
                        <div className="flex items-center gap-1.5 text-[#0F172A] font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {salida.fecha ? new Date(salida.fecha).toLocaleDateString('es-PE') : 'N/A'}
                        </div>
                        <div className="text-[11px] text-slate-400 pl-5">
                          {salida.fecha ? new Date(salida.fecha).toLocaleTimeString('es-PE') : ''}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-sm text-[#0F172A]">
                          {salida.numero_documento || 'S/N'}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#1E40AF]/10 text-[#1E40AF]">
                          {salida.tipo_documento}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-[#0F172A]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{salida.usuario_nombre || 'Almacenero'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {(salida.detalles || []).map((det) => (
                            <div key={det.id} className="text-xs text-[#0F172A]">
                              • <strong>{det.cantidad_paquetes} paq.</strong> de {det.producto_nombre}
                            </div>
                          ))}
                          <div className="text-[11px] font-mono font-bold text-[#0284C7] pt-0.5">
                            Total: {totalPacks} paquetes
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full font-mono font-bold text-[11px] bg-green-100 text-[#16A34A]">
                          {salida.estado}
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

      {/* MODAL PARA AÑADIR PRODUCTO MANUAL */}
      {modalManualAbierto && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <PackageMinus className="w-5 h-5 text-[#0284C7]" />
                Añadir Producto al Despacho
              </h3>
              <button
                type="button"
                onClick={() => setModalManualAbierto(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Producto del Catálogo
                </label>
                <select
                  value={productoManualId}
                  onChange={(e) => setProductoManualId(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                >
                  <option value="">-- Seleccionar producto --</option>
                  {catalogoProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock: {p.stock_actual} paq.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase mb-1">
                  Cantidad a Despachar (Paquetes)
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCantidadManual((c) => Math.max(1, c - 1))}
                    className="min-w-[44px] min-h-[44px] rounded-lg border border-[#E2E8F0] bg-slate-100 hover:bg-slate-200 font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={cantidadManual}
                    onChange={(e) => setCantidadManual(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="flex-1 text-center font-mono text-lg font-bold p-2 rounded-lg border border-[#E2E8F0]"
                  />
                  <button
                    type="button"
                    onClick={() => setCantidadManual((c) => c + 1)}
                    className="min-w-[44px] min-h-[44px] rounded-lg border border-[#E2E8F0] bg-slate-100 hover:bg-slate-200 font-bold text-base flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setModalManualAbierto(false)}
                className="flex-1 py-2.5 rounded-lg border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!productoManualId}
                onClick={handleAgregarManual}
                className="flex-1 py-2.5 rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                Agregar al Despacho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalidasPage;
