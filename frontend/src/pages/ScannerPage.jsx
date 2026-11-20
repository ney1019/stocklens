import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Boxes,
  RotateCcw,
  RefreshCw,
  Eye,
  FileCheck2,
  PackagePlus,
  Info,
} from 'lucide-react';
import {
  escanearImagen,
  confirmarEscaneo,
  cancelarEscaneo,
  getProductos,
} from '../api/api';
import { useAuth } from '../context/AuthContext';

export const ScannerPage = () => {
  const { user } = useAuth();

  // Estados del flujo: 1 = 'captura', 2 = 'validacion', 3 = 'resumen'
  const [etapa, setEtapa] = useState(1);

  // Estado 1: Captura
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [errorCaptura, setErrorCaptura] = useState(null);

  // Estado 2: Validación Human-in-the-Loop (HITL)
  const [escaneoId, setEscaneoId] = useState(null);
  const [imagenUrlServidor, setImagenUrlServidor] = useState(null);
  const [itemsPropuesta, setItemsPropuesta] = useState([]);
  const [rawDetecciones, setRawDetecciones] = useState({});
  const [catalogoProductos, setCatalogoProductos] = useState([]);
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [productoManualSeleccionado, setProductoManualSeleccionado] = useState('');
  const [cantidadManual, setCantidadManual] = useState(1);
  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);

  // Estado 3: Resumen
  const [resumenConfirmacion, setResumenConfirmacion] = useState(null);

  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Cargar catálogo de productos por si se necesita adición manual
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const prods = await getProductos();
        setCatalogoProductos(prods);
      } catch (err) {
        console.error('Error al cargar catálogo para HITL:', err);
      }
    };
    cargarCatalogo();
  }, []);

  // Manejo de selección de archivo
  const handleFileSelect = (file) => {
    setErrorCaptura(null);
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorCaptura('El archivo seleccionado debe ser una imagen válida (.jpg, .png, etc.).');
      return;
    }

    setSelectedFile(file);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // Paso 1: Enviar imagen a YOLOv8
  const handleAnalizarImagen = async () => {
    if (!selectedFile) {
      setErrorCaptura('Por favor seleccione o capture una imagen primero.');
      return;
    }

    try {
      setAnalizando(true);
      setErrorCaptura(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('usuario_id', user?.id || 1);

      const data = await escanearImagen(formData);

      setEscaneoId(data.escaneo_id);
      setImagenUrlServidor(data.imagen_url);
      setRawDetecciones(data.raw_detecciones || {});

      // Mapear propuesta para permitir edición reactiva
      const itemsEditables = (data.propuesta || []).map((item) => ({
        ...item,
        cantidad_paquetes: item.paquetes_detectados,
      }));

      setItemsPropuesta(itemsEditables);
      setEtapa(2); // Pasar al estado de validación Human-in-the-Loop
    } catch (err) {
      setErrorCaptura(err.message || 'Error al procesar la imagen con YOLOv8.');
    } finally {
      setAnalizando(false);
    }
  };

  // Modificar cantidad de paquetes en validación
  const handleModificarCantidad = (productoId, delta) => {
    setItemsPropuesta((prev) =>
      prev.map((item) => {
        if (item.producto_id === productoId) {
          const nuevaCantidad = Math.max(0, item.cantidad_paquetes + delta);
          const unidades_a_sumar = nuevaCantidad * item.unidades_por_paquete;
          return {
            ...item,
            cantidad_paquetes: nuevaCantidad,
            total_unidades_a_sumar: unidades_a_sumar,
            stock_resultante_estimado: item.stock_actual + unidades_a_sumar,
          };
        }
        return item;
      })
    );
  };

  // Eliminar producto de la propuesta
  const handleEliminarItem = (productoId) => {
    setItemsPropuesta((prev) => prev.filter((i) => i.producto_id !== productoId));
  };

  // Añadir producto manualmente que la IA haya omitido
  const handleAgregarProductoManual = () => {
    if (!productoManualSeleccionado) return;

    const prodId = parseInt(productoManualSeleccionado, 10);
    const prod = catalogoProductos.find((p) => p.id === prodId);
    if (!prod) return;

    // Verificar si ya está en la lista
    const existe = itemsPropuesta.find((item) => item.producto_id === prod.id);
    if (existe) {
      handleModificarCantidad(prod.id, cantidadManual);
    } else {
      const unidades_por_paquete = prod.unidades_por_paquete || 1;
      const total_unidades_a_sumar = cantidadManual * unidades_por_paquete;

      const nuevoItem = {
        producto_id: prod.id,
        nombre_producto: prod.nombre,
        sku: prod.sku,
        etiqueta_yolo: prod.etiqueta_yolo || 'manual',
        stock_actual: prod.stock_actual,
        unidades_por_paquete: unidades_por_paquete,
        cantidad_paquetes: cantidadManual,
        total_unidades_a_sumar: total_unidades_a_sumar,
        stock_resultante_estimado: prod.stock_actual + total_unidades_a_sumar,
      };

      setItemsPropuesta((prev) => [...prev, nuevoItem]);
    }

    setMostrarModalManual(false);
    setProductoManualSeleccionado('');
    setCantidadManual(1);
  };

  // Paso 2: Cancelar Escaneo
  const handleCancelar = async () => {
    if (!escaneoId) return;
    try {
      setCancelando(true);
      await cancelarEscaneo(escaneoId);
      resetTodo();
    } catch (err) {
      setErrorValidacion(err.message || 'Error al cancelar el escaneo.');
    } finally {
      setCancelando(false);
    }
  };

  // Paso 2: Confirmar Escaneo e Ingresar Stock
  const handleConfirmar = async () => {
    if (!escaneoId) return;

    const itemsAConfirmar = itemsPropuesta
      .filter((item) => item.cantidad_paquetes > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        cantidad_paquetes: item.cantidad_paquetes,
      }));

    if (itemsAConfirmar.length === 0) {
      setErrorValidacion('Debe ingresar al menos 1 paquete de algún producto para confirmar.');
      return;
    }

    try {
      setConfirmando(true);
      setErrorValidacion(null);
      const res = await confirmarEscaneo(escaneoId, itemsAConfirmar);
      setResumenConfirmacion(res);
      setEtapa(3); // Pasar a estado de Resumen
    } catch (err) {
      setErrorValidacion(err.message || 'Error al confirmar el escaneo en el servidor.');
    } finally {
      setConfirmando(false);
    }
  };

  // Reset para nuevo escaneo
  const resetTodo = () => {
    setEtapa(1);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorCaptura(null);
    setEscaneoId(null);
    setImagenUrlServidor(null);
    setItemsPropuesta([]);
    setRawDetecciones({});
    setErrorValidacion(null);
    setResumenConfirmacion(null);
  };

  // Cálculo de totales en tiempo real para el resumen de validación
  const totalPaquetesValidacion = itemsPropuesta.reduce(
    (sum, i) => sum + (i.cantidad_paquetes || 0),
    0
  );
  const totalUnidadesValidacion = itemsPropuesta.reduce(
    (sum, i) => sum + (i.cantidad_paquetes || 0) * (i.unidades_por_paquete || 1),
    0
  );

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Visión Artificial YOLOv8 • Human-in-the-Loop
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Escáner y Validación de Inventario
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Detección automática de paquetes Coca-Cola Perú con confirmación manual de operario
          </p>
        </div>

        {/* Indicador de Etapa / Step Tracker */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
              etapa === 1
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'bg-slate-100 text-[#64748B]'
            }`}
          >
            <span>1</span>
            <span className="hidden sm:inline">Captura</span>
          </div>
          <div className="w-4 h-[2px] bg-[#E2E8F0]" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
              etapa === 2
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'bg-slate-100 text-[#64748B]'
            }`}
          >
            <span>2</span>
            <span className="hidden sm:inline">Validación HITL</span>
          </div>
          <div className="w-4 h-[2px] bg-[#E2E8F0]" />
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
              etapa === 3
                ? 'bg-[#16A34A] text-white shadow-xs'
                : 'bg-slate-100 text-[#64748B]'
            }`}
          >
            <span>3</span>
            <span className="hidden sm:inline">Resumen</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ESTADO 1: CAPTURA DE FOTO O SELECCIÓN DE IMAGEN
          ========================================================================= */}
      {etapa === 1 && (
        <div className="space-y-6">
          {errorCaptura && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{errorCaptura}</div>
            </div>
          )}

          {/* Inputs ocultos para Cámara y Galería */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />

          {!previewUrl ? (
            /* Zona Drag & Drop con borde cian punteado */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-8 md:p-14 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                isDragging
                  ? 'border-[#0284C7] bg-[#0284C7]/10 scale-[1.005]'
                  : 'border-[#0284C7] bg-[#0284C7]/5 hover:bg-[#0284C7]/10'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-white border border-[#E2E8F0] shadow-sm flex items-center justify-center text-[#0284C7] mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-1">
                Arrastre la fotografía del pallet o lote aquí
              </h3>
              <p className="text-sm text-[#64748B] max-w-md mb-6">
                Compatible con paquetes de Inca Kola, Coca-Cola, Sprite, San Luis, Frugos, Powerade y Monster Energy.
              </p>

              {/* Botones táctiles grandes para móvil y escritorio */}
              <div
                className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-semibold text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-5 h-5" />
                  Tomar con Cámara
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[48px] px-5 py-3 rounded-xl bg-white hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] font-semibold text-sm shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <UploadCloud className="w-5 h-5 text-[#0284C7]" />
                  Subir de Galería
                </button>
              </div>
            </div>
          ) : (
            /* Vista previa de la foto seleccionada antes de analizar */
            <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-xs">
              <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="w-full md:w-1/2 max-h-[380px] rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Vista previa de captura"
                    className="max-h-[380px] w-auto object-contain"
                  />
                </div>

                <div className="w-full md:w-1/2 flex flex-col justify-between space-y-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold bg-green-50 text-[#16A34A] border border-green-200 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Fotografía lista para inferencia
                    </span>
                    <h3 className="text-xl font-bold text-[#0F172A]">
                      Foto seleccionada correctamente
                    </h3>
                    <p className="text-sm text-[#64748B] mt-1">
                      El modelo de red neuronal YOLOv8 identificará las botellas, paquetes y bandejas de bebidas.
                    </p>

                    <div className="mt-4 p-3.5 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs font-mono text-[#64748B] space-y-1">
                      <div>Archivo: {selectedFile?.name}</div>
                      <div>Tamaño: {(selectedFile?.size / (1024 * 1024)).toFixed(2)} MB</div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="button"
                      disabled={analizando}
                      onClick={handleAnalizarImagen}
                      className="flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                    >
                      {analizando ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Analizando con Red Neuronal...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-[#0284C7]" />
                          <span>Analizar con IA</span>
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={analizando}
                      onClick={() => {
                        setSelectedFile(null);
                        setPreviewUrl(null);
                      }}
                      className="min-h-[48px] px-4 py-3 rounded-xl border border-[#E2E8F0] hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] font-semibold text-sm transition-colors cursor-pointer"
                    >
                      Cambiar foto
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ESTADO 2: VALIDACIÓN HUMAN-IN-THE-LOOP (HITL)
          ========================================================================= */}
      {etapa === 2 && (
        <div className="space-y-6">
          {errorValidacion && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{errorValidacion}</div>
            </div>
          )}

          {/* Grid dividida: Izquierda imagen, Derecha lista de validación */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Visor de Imagen con Overlay */}
            <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3 sticky top-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs font-mono font-bold text-[#64748B] uppercase">
                  Escaneo #{escaneoId}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#D97706]/10 text-[#D97706]">
                  PENDIENTE
                </span>
              </div>

              <div className="w-full rounded-xl overflow-hidden bg-slate-950 border border-[#E2E8F0] flex items-center justify-center max-h-[420px]">
                <img
                  src={
                    previewUrl ||
                    (imagenUrlServidor?.startsWith('http')
                      ? imagenUrlServidor
                      : `http://127.0.0.1:8000${imagenUrlServidor}`)
                  }
                  alt="Lote escaneado"
                  className="max-h-[420px] w-auto object-contain"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2 font-mono">
                <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>
                  Compare visualmente la foto con los productos detectados a la derecha.
                </span>
              </div>
            </div>

            {/* Columna Derecha: Lista editable de productos detectados */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A]">
                      Productos Detectados ({itemsPropuesta.length})
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Ajuste las cantidades detectadas por la IA si nota discrepancias
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarModalManual(true)}
                    className="min-h-[40px] px-3.5 py-2 rounded-lg bg-[#0284C7]/10 hover:bg-[#0284C7]/20 text-[#0284C7] font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer font-mono"
                  >
                    <PackagePlus className="w-4 h-4" />
                    + Añadir producto
                  </button>
                </div>

                {/* Lista de ítems */}
                {itemsPropuesta.length === 0 ? (
                  <div className="py-10 text-center text-[#64748B]">
                    <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-[#0F172A]">
                      No se detectaron productos del catálogo automáticamente.
                    </p>
                    <p className="text-xs mt-1">
                      Puede añadir los productos manualmente usando el botón superior.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {itemsPropuesta.map((item) => (
                      <div
                        key={item.producto_id}
                        className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 hover:bg-white hover:border-[#0284C7]/40 transition-all shadow-2xs"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm text-[#0F172A]">
                                {item.nombre_producto}
                              </h3>
                              {/* Badge Cian con multiplicador */}
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#0284C7] text-white">
                                x{item.unidades_por_paquete} un/pack
                              </span>
                            </div>
                            <span className="text-xs font-mono text-[#64748B]">
                              SKU: {item.sku || 'N/A'} • Tag: {item.etiqueta_yolo}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleEliminarItem(item.producto_id)}
                            className="text-slate-400 hover:text-[#DC2626] p-1 rounded-md transition-colors cursor-pointer"
                            title="Quitar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Fila de Controles Táctiles y Cálculo en Tiempo Real */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60">
                          {/* Botones táctiles grandes - / + */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#64748B] font-medium mr-1">
                              Paquetes:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleModificarCantidad(item.producto_id, -1)}
                              className="min-w-[48px] min-h-[48px] bg-white border border-[#E2E8F0] hover:bg-slate-100 active:bg-slate-200 rounded-xl text-lg font-bold text-[#0F172A] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            >
                              <Minus className="w-5 h-5" />
                            </button>

                            <span className="min-w-[54px] text-center font-mono text-xl font-bold text-[#0F172A]">
                              {item.cantidad_paquetes}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleModificarCantidad(item.producto_id, 1)}
                              className="min-w-[48px] min-h-[48px] bg-white border border-[#E2E8F0] hover:bg-slate-100 active:bg-slate-200 rounded-xl text-lg font-bold text-[#0F172A] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            >
                              <Plus className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Cálculo en tiempo real */}
                          <div className="text-right font-mono text-xs bg-white px-3 py-2 rounded-lg border border-[#E2E8F0]">
                            <div className="text-[#16A34A] font-bold text-sm">
                              +{item.total_unidades_a_sumar} unidades
                            </div>
                            <div className="text-[#64748B] text-[11px]">
                              Stock actual: {item.stock_actual} → Final:{' '}
                              <strong className="text-[#0F172A]">
                                {item.stock_resultante_estimado}
                              </strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resumen de totales de validación */}
                {itemsPropuesta.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-400">Total a ingresar:</div>
                      <div className="text-base font-bold font-mono text-[#0284C7]">
                        {totalPaquetesValidacion} paquetes{' '}
                        <span className="text-white">({totalUnidadesValidacion} unidades)</span>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Operario responsable: <strong className="text-white">{user?.nombre || 'Admin'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Acción Inferiores */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelando || confirmando}
                  onClick={handleCancelar}
                  className="w-full sm:w-1/3 min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-[#DC2626] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {cancelando ? (
                    <span>Cancelando...</span>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Cancelar Escaneo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={confirmando || cancelando || itemsPropuesta.length === 0}
                  onClick={handleConfirmar}
                  className="w-full sm:w-2/3 min-h-[48px] px-6 py-3 rounded-xl bg-[#16A34A] hover:bg-green-700 active:bg-green-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {confirmando ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Actualizando Inventario en MySQL...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirmar e Ingresar Stock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ESTADO 3: RESUMEN DE INGRESO EXITOSO
          ========================================================================= */}
      {etapa === 3 && resumenConfirmacion && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border-2 border-[#16A34A]/30 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-100 text-[#16A34A] mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              ¡Inventario Actualizado Exitosamente!
            </h2>
            <p className="text-sm text-[#64748B]">
              Los paquetes validados por Human-in-the-Loop han sido registrados con éxito en la base de datos de StockLens.
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-mono font-bold text-[#0F172A] mt-2">
              ID Escaneo Confirmado: #{resumenConfirmacion.escaneo_id}
            </div>
          </div>

          {/* Tabla de Desglose de Stock Ingresado */}
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-[#E2E8F0] font-mono text-xs font-bold text-[#64748B] uppercase tracking-wider flex justify-between">
              <span>Producto</span>
              <span>Paquetes / Unidades Sumadas</span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {(resumenConfirmacion.actualizaciones || []).map((act, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">
                      {act.nombre}
                    </h4>
                    <span className="text-xs text-[#64748B] font-mono">
                      Stock anterior: {act.stock_anterior} un → Nuevo stock:{' '}
                      <strong className="text-[#16A34A]">{act.stock_nuevo} un</strong>
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-[#16A34A]/10 text-[#16A34A]">
                      +{act.paquetes_confirmados} packs (+{act.unidades_sumadas} un)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón para iniciar nuevo escaneo */}
          <button
            type="button"
            onClick={resetTodo}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Realizar Nuevo Escaneo</span>
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL PARA AÑADIR PRODUCTO MANUALMENTE
          ========================================================================= */}
      {mostrarModalManual && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E2E8F0] space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <h3 className="font-bold text-base text-[#0F172A] flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-[#0284C7]" />
                Añadir Producto Manualmente
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalManual(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase mb-1.5">
                  Seleccionar Producto del Catálogo
                </label>
                <select
                  value={productoManualSeleccionado}
                  onChange={(e) => setProductoManualSeleccionado(e.target.value)}
                  className="w-full p-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
                >
                  <option value="">-- Seleccionar bebida --</option>
                  {catalogoProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Pack x{p.unidades_por_paquete})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase mb-1.5">
                  Cantidad de Paquetes
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCantidadManual((c) => Math.max(1, c - 1))}
                    className="min-w-[48px] min-h-[48px] rounded-lg border border-[#E2E8F0] bg-slate-100 hover:bg-slate-200 font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-mono text-xl font-bold text-center flex-1">
                    {cantidadManual}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantidadManual((c) => c + 1)}
                    className="min-w-[48px] min-h-[48px] rounded-lg border border-[#E2E8F0] bg-slate-100 hover:bg-slate-200 font-bold text-lg flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setMostrarModalManual(false)}
                className="flex-1 min-h-[44px] rounded-lg border border-[#E2E8F0] text-sm font-semibold text-[#64748B] hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!productoManualSeleccionado}
                onClick={handleAgregarProductoManual}
                className="flex-1 min-h-[44px] rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
              >
                Agregar a Lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerPage;
