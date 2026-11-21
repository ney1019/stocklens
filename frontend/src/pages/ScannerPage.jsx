import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  ArrowRight,
  Boxes,
  RotateCcw,
  Eye,
  PackagePlus,
  Info,
  Layers,
  Maximize2,
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

  // Estado 1: Doble Captura (Frontal + Lateral)
  const [fotoFrontal, setFotoFrontal] = useState(null);
  const [previewFrontal, setPreviewFrontal] = useState(null);
  const [isDraggingFrontal, setIsDraggingFrontal] = useState(false);

  const [fotoLateral, setFotoLateral] = useState(null);
  const [previewLateral, setPreviewLateral] = useState(null);
  const [isDraggingLateral, setIsDraggingLateral] = useState(false);

  const [analizando, setAnalizando] = useState(false);
  const [errorCaptura, setErrorCaptura] = useState(null);

  // Estado 2: Revisión y Ajuste Volumétrico
  const [escaneoId, setEscaneoId] = useState(null);
  const [imagenFrontalServidor, setImagenFrontalServidor] = useState(null);
  const [imagenLateralServidor, setImagenLateralServidor] = useState(null);
  const [vistaFotoActiva, setVistaFotoActiva] = useState('frontal'); // 'frontal' | 'lateral'
  const [itemsPropuesta, setItemsPropuesta] = useState([]);
  const [catalogoProductos, setCatalogoProductos] = useState([]);

  // Modal manual
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [productoManualSeleccionado, setProductoManualSeleccionado] = useState('');
  const [anchoManual, setAnchoManual] = useState(1);
  const [fondoManual, setFondoManual] = useState(1);
  const [altoManual, setAltoManual] = useState(1);

  const [confirmando, setConfirmando] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [errorValidacion, setErrorValidacion] = useState(null);

  // Estado 3: Resumen
  const [resumenConfirmacion, setResumenConfirmacion] = useState(null);

  // Refs de archivos y cámaras
  const cameraFrontalRef = useRef(null);
  const fileFrontalRef = useRef(null);
  const cameraLateralRef = useRef(null);
  const fileLateralRef = useRef(null);

  // Cargar catálogo de productos por si se necesita adición manual
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const prods = await getProductos();
        setCatalogoProductos(prods);
      } catch (err) {
        console.error('Error al cargar catálogo de productos:', err);
      }
    };
    cargarCatalogo();
  }, []);

  // Manejo de archivo Frontal
  const handleSelectFrontal = (file) => {
    setErrorCaptura(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorCaptura('El archivo frontal debe ser una imagen válida (.jpg, .png, etc.).');
      return;
    }
    setFotoFrontal(file);
    setPreviewFrontal(URL.createObjectURL(file));
  };

  // Manejo de archivo Lateral
  const handleSelectLateral = (file) => {
    setErrorCaptura(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorCaptura('El archivo lateral debe ser una imagen válida (.jpg, .png, etc.).');
      return;
    }
    setFotoLateral(file);
    setPreviewLateral(URL.createObjectURL(file));
  };

  // Paso 1: Enviar ambas fotos al análisis volumétrico
  const handleAnalizar = async () => {
    if (!fotoFrontal || !fotoLateral) {
      setErrorCaptura('Debe seleccionar o capturar ambas fotos (Vista Frontal y Vista Lateral) para el cálculo volumétrico.');
      return;
    }

    try {
      setAnalizando(true);
      setErrorCaptura(null);

      const formData = new FormData();
      formData.append('foto_frontal', fotoFrontal);
      formData.append('foto_lateral', fotoLateral);
      formData.append('usuario_id', user?.id || 1);

      const data = await escanearImagen(formData);

      setEscaneoId(data.escaneo_id || data.id);
      setImagenFrontalServidor(data.imagen_path || data.imagen_url);
      setImagenLateralServidor(data.imagen_lateral_path);

      // Mapear propuesta volumétrica asegurando ancho, fondo, alto y cantidad_detectada en paquetes
      const itemsEditables = (data.detalles || data.propuesta || []).map((item) => {
        const ancho = item.ancho || 1;
        const fondo = item.fondo || 1;
        const alto = item.alto || 1;
        const cantidad_detectada = item.cantidad_detectada || (ancho * fondo * alto);
        return {
          producto_id: item.producto_id,
          nombre: item.nombre || item.nombre_producto,
          sku: item.sku,
          stock_actual: item.stock_actual ?? 0,
          ancho: ancho,
          fondo: fondo,
          alto: alto,
          cantidad_detectada: cantidad_detectada,
        };
      });

      setItemsPropuesta(itemsEditables);
      setVistaFotoActiva('frontal');
      setEtapa(2);
    } catch (err) {
      setErrorCaptura(err.message || 'Error al procesar el análisis volumétrico.');
    } finally {
      setAnalizando(false);
    }
  };

  // Modificar dimensión volumétrica individual (Ancho, Fondo o Alto)
  const handleActualizarDimension = (productoId, dimension, nuevoValor) => {
    const valor = Math.max(1, parseInt(nuevoValor, 10) || 1);
    setItemsPropuesta((prev) =>
      prev.map((item) => {
        if (item.producto_id === productoId) {
          const ancho = dimension === 'ancho' ? valor : item.ancho;
          const fondo = dimension === 'fondo' ? valor : item.fondo;
          const alto = dimension === 'alto' ? valor : item.alto;
          const totalPaquetes = ancho * fondo * alto;
          return {
            ...item,
            ancho,
            fondo,
            alto,
            cantidad_detectada: totalPaquetes,
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

  // Añadir producto manualmente al pallet
  const handleAgregarProductoManual = () => {
    if (!productoManualSeleccionado) return;

    const prodId = parseInt(productoManualSeleccionado, 10);
    const prod = catalogoProductos.find((p) => p.id === prodId);
    if (!prod) return;

    const ancho = Math.max(1, anchoManual);
    const fondo = Math.max(1, fondoManual);
    const alto = Math.max(1, altoManual);
    const totalPaquetes = ancho * fondo * alto;

    const existe = itemsPropuesta.find((item) => item.producto_id === prod.id);
    if (existe) {
      setItemsPropuesta((prev) =>
        prev.map((item) =>
          item.producto_id === prod.id
            ? {
                ...item,
                ancho,
                fondo,
                alto,
                cantidad_detectada: totalPaquetes,
              }
            : item
        )
      );
    } else {
      const nuevoItem = {
        producto_id: prod.id,
        nombre: prod.nombre,
        sku: prod.sku,
        stock_actual: prod.stock_actual ?? 0,
        ancho,
        fondo,
        alto,
        cantidad_detectada: totalPaquetes,
      };
      setItemsPropuesta((prev) => [...prev, nuevoItem]);
    }

    setMostrarModalManual(false);
    setProductoManualSeleccionado('');
    setAnchoManual(1);
    setFondoManual(1);
    setAltoManual(1);
  };

  // Paso 2: Cancelar Escaneo
  const handleCancelar = async () => {
    if (!escaneoId) {
      resetTodo();
      return;
    }
    try {
      setCancelando(true);
      await cancelarEscaneo(escaneoId);
      resetTodo();
    } catch (err) {
      setErrorValidacion(err.message || 'Error al descartar el análisis.');
    } finally {
      setCancelando(false);
    }
  };

  // Paso 2: Confirmar Escaneo e Ingresar Stock en Paquetes
  const handleConfirmar = async () => {
    if (!escaneoId) return;

    const itemsAConfirmar = itemsPropuesta
      .filter((item) => item.cantidad_detectada > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        ancho: item.ancho,
        fondo: item.fondo,
        alto: item.alto,
        cantidad_detectada: item.cantidad_detectada,
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
      setEtapa(3);
    } catch (err) {
      setErrorValidacion(err.message || 'Error al confirmar el ingreso en el servidor.');
    } finally {
      setConfirmando(false);
    }
  };

  // Reset para nuevo análisis
  const resetTodo = () => {
    setEtapa(1);
    setFotoFrontal(null);
    setPreviewFrontal(null);
    setFotoLateral(null);
    setPreviewLateral(null);
    setErrorCaptura(null);
    setEscaneoId(null);
    setImagenFrontalServidor(null);
    setImagenLateralServidor(null);
    setItemsPropuesta([]);
    setErrorValidacion(null);
    setResumenConfirmacion(null);
  };

  // Total de paquetes a ingresar
  const totalPaquetesValidacion = itemsPropuesta.reduce(
    (sum, i) => sum + (i.cantidad_detectada || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-[#E2E8F0] shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#0284C7] uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            Control de Recepción Mayorista • Conteo en Paquetes
          </div>
          <h1 className="text-2xl font-bold text-[#0F172A] tracking-tight">
            Análisis Volumétrico de Pallets
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Doble captura fotográfica (Frontal y Lateral) para cálculo exacto de paquetes apilados
          </p>
        </div>

        {/* Indicador de Etapas */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold ${
              etapa === 1
                ? 'bg-[#1E40AF] text-white shadow-xs'
                : 'bg-slate-100 text-[#64748B]'
            }`}
          >
            <span>1</span>
            <span className="hidden sm:inline">Captura Doble</span>
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
            <span className="hidden sm:inline">Revisión Volumétrica</span>
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
            <span className="hidden sm:inline">Ingreso Confirmado</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ETAPA 1: DOBLE CAPTURA (VISTA FRONTAL Y VISTA LATERAL)
          ========================================================================= */}
      {etapa === 1 && (
        <div className="space-y-6">
          {errorCaptura && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{errorCaptura}</div>
            </div>
          )}

          {/* Inputs ocultos para Cámara y Galería - Frontal */}
          <input
            ref={cameraFrontalRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleSelectFrontal(e.target.files?.[0])}
          />
          <input
            ref={fileFrontalRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSelectFrontal(e.target.files?.[0])}
          />

          {/* Inputs ocultos para Cámara y Galería - Lateral */}
          <input
            ref={cameraLateralRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleSelectLateral(e.target.files?.[0])}
          />
          <input
            ref={fileLateralRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleSelectLateral(e.target.files?.[0])}
          />

          {/* Grid de 2 zonas lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ZONA 1: VISTA FRONTAL */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#1E40AF] text-white">
                      Paso 1
                    </span>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Vista Frontal
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#0284C7] bg-[#0284C7]/10 px-2 py-0.5 rounded font-semibold">
                    Ancho × Alto
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mb-4">
                  Fotografía de frente para medir las columnas de ancho y los niveles de altura apilados.
                </p>

                {!previewFrontal ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingFrontal(true); }}
                    onDragLeave={() => setIsDraggingFrontal(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingFrontal(false);
                      if (e.dataTransfer.files?.[0]) handleSelectFrontal(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileFrontalRef.current?.click()}
                    className={`p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      isDraggingFrontal
                        ? 'border-[#0284C7] bg-[#0284C7]/10'
                        : 'border-[#0284C7]/40 bg-[#0284C7]/5 hover:bg-[#0284C7]/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-center text-[#0284C7] mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] mb-1">
                      Cargar Foto Frontal
                    </div>
                    <div className="text-xs text-[#64748B] mb-4 max-w-xs">
                      Arrastre la imagen o elija una opción abajo
                    </div>

                    <div
                      className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => cameraFrontalRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        Cámara Frontal
                      </button>
                      <button
                        type="button"
                        onClick={() => fileFrontalRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-[#0284C7]" />
                        Subir Archivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full h-56 rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] flex items-center justify-center relative">
                      <img
                        src={previewFrontal}
                        alt="Vista previa frontal"
                        className="h-full w-auto object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#16A34A] text-white shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Frontal Lista
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#64748B] font-mono px-1">
                      <span className="truncate max-w-[200px]">{fotoFrontal?.name}</span>
                      <span>{(fotoFrontal?.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFotoFrontal(null);
                        setPreviewFrontal(null);
                      }}
                      className="w-full py-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                    >
                      Cambiar foto frontal
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ZONA 2: VISTA LATERAL / COSTADO */}
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-[#0284C7] text-white">
                      Paso 2
                    </span>
                    <h3 className="text-base font-bold text-[#0F172A]">
                      Vista Lateral / Costado
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded font-semibold">
                    Fondo / Profundidad
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mb-4">
                  Fotografía del perfil o costado para determinar la profundidad y columnas interiores del pallet.
                </p>

                {!previewLateral ? (
                  <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingLateral(true); }}
                    onDragLeave={() => setIsDraggingLateral(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDraggingLateral(false);
                      if (e.dataTransfer.files?.[0]) handleSelectLateral(e.dataTransfer.files[0]);
                    }}
                    onClick={() => fileLateralRef.current?.click()}
                    className={`p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
                      isDraggingLateral
                        ? 'border-[#0284C7] bg-[#0284C7]/10'
                        : 'border-[#0284C7]/40 bg-[#0284C7]/5 hover:bg-[#0284C7]/10'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl bg-white border border-[#E2E8F0] shadow-2xs flex items-center justify-center text-[#0284C7] mb-3">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-bold text-[#0F172A] mb-1">
                      Cargar Foto Lateral
                    </div>
                    <div className="text-xs text-[#64748B] mb-4 max-w-xs">
                      Arrastre la imagen o elija una opción abajo
                    </div>

                    <div
                      className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => cameraLateralRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-lg bg-[#0284C7] hover:bg-[#0369A1] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        Cámara Lateral
                      </button>
                      <button
                        type="button"
                        onClick={() => fileLateralRef.current?.click()}
                        className="w-full py-2.5 px-3 rounded-lg bg-white hover:bg-slate-100 border border-[#E2E8F0] text-[#0F172A] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <UploadCloud className="w-4 h-4 text-[#0284C7]" />
                        Subir Archivo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full h-56 rounded-xl overflow-hidden bg-slate-900 border border-[#E2E8F0] flex items-center justify-center relative">
                      <img
                        src={previewLateral}
                        alt="Vista previa lateral"
                        className="h-full w-auto object-contain"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#16A34A] text-white shadow-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lateral Lista
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#64748B] font-mono px-1">
                      <span className="truncate max-w-[200px]">{fotoLateral?.name}</span>
                      <span>{(fotoLateral?.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFotoLateral(null);
                        setPreviewLateral(null);
                      }}
                      className="w-full py-2 rounded-lg border border-[#E2E8F0] hover:bg-slate-50 text-xs font-semibold text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                    >
                      Cambiar foto lateral
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Barra de Acción Principal */}
          <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  fotoFrontal && fotoLateral
                    ? 'bg-green-100 text-[#16A34A]'
                    : 'bg-slate-100 text-[#64748B]'
                }`}
              >
                {fotoFrontal && fotoLateral ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <Layers className="w-6 h-6" />
                )}
              </div>
              <div>
                <div className="text-sm font-bold text-[#0F172A]">
                  {fotoFrontal && fotoLateral
                    ? 'Ambas fotografías listas para cálculo volumétrico'
                    : 'Se requieren ambas vistas (Frontal y Lateral)'}
                </div>
                <div className="text-xs text-[#64748B]">
                  Fórmula operativa: Ancho (Frontal) × Fondo (Lateral) × Alto (Niveles) = Total Paquetes
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!fotoFrontal || !fotoLateral || analizando}
              onClick={handleAnalizar}
              className="w-full sm:w-auto min-w-[240px] min-h-[48px] px-6 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {analizando ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Calculando Volumetría...</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-5 h-5 text-[#0284C7]" />
                  <span>Iniciar Análisis Volumétrico</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 2: REVISIÓN Y AJUSTE VOLUMÉTRICO EN PAQUETES
          ========================================================================= */}
      {etapa === 2 && (
        <div className="space-y-6">
          {errorValidacion && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-[#DC2626] flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{errorValidacion}</div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Columna Izquierda: Visor con Selector de Vista (Frontal / Lateral) */}
            <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-3 sticky top-4">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                <span className="text-xs font-mono font-bold text-[#64748B] uppercase">
                  Inspección #{escaneoId}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-[#D97706]/10 text-[#D97706]">
                  PENDIENTE DE CONFIRMACIÓN
                </span>
              </div>

              {/* Selector de Pestañas de Vista */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVistaFotoActiva('frontal')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    vistaFotoActiva === 'frontal'
                      ? 'bg-[#1E40AF] text-white shadow-2xs'
                      : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                  }`}
                >
                  Vista Frontal (Ancho × Alto)
                </button>
                <button
                  type="button"
                  onClick={() => setVistaFotoActiva('lateral')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                    vistaFotoActiva === 'lateral'
                      ? 'bg-[#0284C7] text-white shadow-2xs'
                      : 'bg-slate-100 text-[#64748B] hover:bg-slate-200'
                  }`}
                >
                  Vista Lateral (Fondo)
                </button>
              </div>

              {/* Visor de imagen seleccionada */}
              <div className="w-full rounded-xl overflow-hidden bg-slate-950 border border-[#E2E8F0] flex items-center justify-center min-h-[320px] max-h-[420px]">
                {vistaFotoActiva === 'frontal' ? (
                  <img
                    src={
                      previewFrontal ||
                      (imagenFrontalServidor?.startsWith('http')
                        ? imagenFrontalServidor
                        : `http://127.0.0.1:8000${imagenFrontalServidor}`)
                    }
                    alt="Vista frontal del pallet"
                    className="max-h-[420px] w-auto object-contain"
                  />
                ) : (
                  <img
                    src={
                      previewLateral ||
                      (imagenLateralServidor?.startsWith('http')
                        ? imagenLateralServidor
                        : `http://127.0.0.1:8000${imagenLateralServidor}`)
                    }
                    alt="Vista lateral del pallet"
                    className="max-h-[420px] w-auto object-contain"
                  />
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-[#E2E8F0] text-xs text-[#64748B] flex items-center gap-2 font-mono">
                <Info className="w-4 h-4 text-[#0284C7] shrink-0" />
                <span>
                  Verifique las dimensiones Ancho, Fondo y Alto de cada producto detectado a la derecha.
                </span>
              </div>
            </div>

            {/* Columna Derecha: Desglose Volumétrico Editable (100% Paquetes) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F172A]">
                      Desglose de Paquetes en Pallet ({itemsPropuesta.length})
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Ajuste numéricamente las columnas, profundidad y niveles si nota diferencias visuales
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

                {/* Lista de productos detectados con desglose volumétrico editable */}
                {itemsPropuesta.length === 0 ? (
                  <div className="py-10 text-center text-[#64748B]">
                    <Boxes className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-[#0F172A]">
                      No se identificaron productos automáticamente en las fotografías.
                    </p>
                    <p className="text-xs mt-1">
                      Puede añadir los productos manualmente usando el botón superior.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {itemsPropuesta.map((item) => (
                      <div
                        key={item.producto_id}
                        className="p-4 rounded-xl border border-[#E2E8F0] bg-slate-50/50 hover:bg-white hover:border-[#0284C7]/40 transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h3 className="font-bold text-sm text-[#0F172A]">
                              {item.nombre}
                            </h3>
                            <span className="text-xs font-mono text-[#64748B]">
                              SKU: {item.sku || 'N/A'} • Stock en almacén: {item.stock_actual} paquetes
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

                        {/* Controles Volumétricos (Ancho x Fondo x Alto = Total Paquetes) */}
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center pt-2 border-t border-slate-200/60">
                          {/* Inputs numéricos pequeños para Ancho, Fondo y Alto */}
                          <div className="sm:col-span-8 grid grid-cols-3 gap-2">
                            {/* Ancho */}
                            <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                              <label className="text-[10px] font-mono text-[#64748B] uppercase font-bold block mb-1">
                                Ancho (Col)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'ancho', item.ancho - 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.ancho}
                                  onChange={(e) => handleActualizarDimension(item.producto_id, 'ancho', e.target.value)}
                                  className="w-full text-center font-mono font-bold text-sm text-[#0F172A] p-0.5 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'ancho', item.ancho + 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Fondo */}
                            <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                              <label className="text-[10px] font-mono text-[#64748B] uppercase font-bold block mb-1">
                                Fondo (Prof)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'fondo', item.fondo - 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.fondo}
                                  onChange={(e) => handleActualizarDimension(item.producto_id, 'fondo', e.target.value)}
                                  className="w-full text-center font-mono font-bold text-sm text-[#0F172A] p-0.5 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'fondo', item.fondo + 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>

                            {/* Alto */}
                            <div className="bg-white p-2 rounded-lg border border-[#E2E8F0]">
                              <label className="text-[10px] font-mono text-[#64748B] uppercase font-bold block mb-1">
                                Alto (Niveles)
                              </label>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'alto', item.alto - 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.alto}
                                  onChange={(e) => handleActualizarDimension(item.producto_id, 'alto', e.target.value)}
                                  className="w-full text-center font-mono font-bold text-sm text-[#0F172A] p-0.5 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleActualizarDimension(item.producto_id, 'alto', item.alto + 1)}
                                  className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 font-bold text-xs flex items-center justify-center cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Resultado en Paquetes */}
                          <div className="sm:col-span-4 bg-white p-2.5 rounded-lg border border-[#E2E8F0] text-right font-mono">
                            <div className="text-[11px] text-[#64748B]">
                              {item.ancho} × {item.fondo} × {item.alto} =
                            </div>
                            <div className="text-base font-extrabold text-[#16A34A]">
                              +{item.cantidad_detectada} paquetes
                            </div>
                            <div className="text-[11px] text-[#64748B] mt-0.5">
                              Final: <strong className="text-[#0F172A]">{item.stock_actual + item.cantidad_detectada} paq.</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Banner de Total en Paquetes */}
                {itemsPropuesta.length > 0 && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-400">Total a ingresar al almacén:</div>
                      <div className="text-lg font-bold font-mono text-[#0284C7]">
                        +{totalPaquetesValidacion} paquetes
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      Operario responsable: <strong className="text-white">{user?.nombre || 'Administrador'}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de Confirmación y Cancelación */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  disabled={cancelando || confirmando}
                  onClick={handleCancelar}
                  className="w-full sm:w-1/3 min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-[#DC2626] font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {cancelando ? (
                    <span>Descartando...</span>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>Descartar Análisis</span>
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
                      <span>Ingresando Paquetes al Inventario...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>Confirmar e Ingresar Paquetes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          ETAPA 3: RESUMEN DE INGRESO EXITOSO (EN PAQUETES)
          ========================================================================= */}
      {etapa === 3 && resumenConfirmacion && (
        <div className="max-w-3xl mx-auto bg-white p-6 sm:p-10 rounded-2xl border-2 border-[#16A34A]/30 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-green-100 text-[#16A34A] mx-auto flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0F172A] tracking-tight">
              ¡Ingreso de Paquetes Confirmado!
            </h2>
            <p className="text-sm text-[#64748B]">
              Los paquetes volumétricos han sido registrados correctamente en el inventario de la distribuidora.
            </p>
            <div className="inline-block px-3 py-1 rounded-full bg-slate-100 text-xs font-mono font-bold text-[#0F172A] mt-2">
              ID Registro de Entrada: #{resumenConfirmacion.escaneo_id}
            </div>
          </div>

          {/* Tabla de Desglose de Stock Ingresado */}
          <div className="rounded-xl border border-[#E2E8F0] overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-[#E2E8F0] font-mono text-xs font-bold text-[#64748B] uppercase tracking-wider flex justify-between">
              <span>Producto</span>
              <span>Paquetes Ingresados</span>
            </div>

            <div className="divide-y divide-[#E2E8F0]">
              {(resumenConfirmacion.actualizaciones || []).map((act, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-sm text-[#0F172A]">
                      {act.nombre}
                    </h4>
                    <span className="text-xs text-[#64748B] font-mono">
                      Stock anterior: {act.stock_anterior} paq. → Nuevo stock:{' '}
                      <strong className="text-[#16A34A]">{act.stock_nuevo} paq.</strong>
                    </span>
                  </div>

                  <div className="text-right font-mono">
                    <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#16A34A]/10 text-[#16A34A] border border-[#16A34A]/20">
                      +{act.paquetes_confirmados || act.cantidad_detectada} paquetes
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botón para iniciar nuevo análisis */}
          <button
            type="button"
            onClick={resetTodo}
            className="w-full min-h-[48px] px-6 py-3 rounded-xl bg-[#1E40AF] hover:bg-[#1D4ED8] active:bg-blue-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Realizar Nuevo Análisis Volumétrico</span>
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
                Añadir Producto Manualmente al Pallet
              </h3>
              <button
                type="button"
                onClick={() => setMostrarModalManual(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
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
                  <option value="">-- Seleccionar producto --</option>
                  {catalogoProductos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} (Stock actual: {p.stock_actual} paq.)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-semibold text-[#0F172A] uppercase mb-1.5">
                  Dimensiones Volumétricas (Paquetes)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 border border-[#E2E8F0] rounded-lg bg-slate-50">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] block mb-1">Ancho (col)</span>
                    <input
                      type="number"
                      min="1"
                      value={anchoManual}
                      onChange={(e) => setAnchoManual(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full text-center font-mono font-bold text-sm bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div className="p-2 border border-[#E2E8F0] rounded-lg bg-slate-50">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] block mb-1">Fondo (prof)</span>
                    <input
                      type="number"
                      min="1"
                      value={fondoManual}
                      onChange={(e) => setFondoManual(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full text-center font-mono font-bold text-sm bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>
                  <div className="p-2 border border-[#E2E8F0] rounded-lg bg-slate-50">
                    <span className="text-[10px] font-mono font-bold text-[#64748B] block mb-1">Alto (niveles)</span>
                    <input
                      type="number"
                      min="1"
                      value={altoManual}
                      onChange={(e) => setAltoManual(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full text-center font-mono font-bold text-sm bg-white p-1 rounded border border-[#E2E8F0]"
                    />
                  </div>
                </div>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-100 text-center font-mono text-xs">
                  Total calculado: <strong className="text-[#16A34A] text-sm">{anchoManual * fondoManual * altoManual} paquetes</strong>
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
                Agregar al Pallet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScannerPage;
