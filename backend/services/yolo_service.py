import os
import io
from typing import Dict, Union, List, Optional, Any, Tuple
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEST_MODEL_PATH = os.path.join(BASE_DIR, "best.pt")
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")

_model = None
_current_model_path = None

def get_model() -> YOLO:
    """
    Carga dinámicamente el modelo YOLO:
    Prioriza 'best.pt' en backend/ si existe, o hace fallback a 'yolov8n.pt'.
    """
    global _model, _current_model_path

    target_path = BEST_MODEL_PATH if os.path.exists(BEST_MODEL_PATH) else DEFAULT_MODEL_PATH

    if _model is None or _current_model_path != target_path:
        model_file = target_path if os.path.exists(target_path) else "yolov8n.pt"
        _model = YOLO(model_file)
        _current_model_path = target_path

    return _model

def _cargar_imagen(image_input: Union[str, bytes, Image.Image]) -> Image.Image:
    """Convierte el input a un objeto PIL.Image seguro y redimensiona si es muy pesado."""
    if isinstance(image_input, Image.Image):
        img = image_input
    elif isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        img = Image.open(image_input)
    else:
        raise ValueError("Formato de imagen no soportado")

    # Convertir a RGB por si viene en RGBA/PNG y limitar tamaño máximo a 1280px
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((1280, 1280))
    return img

def detectar_cajas_por_clase(image_input: Union[str, bytes, Image.Image]) -> Dict[str, List[dict]]:
    """
    Ejecuta YOLO sobre la imagen y agrupa las cajas detectadas por etiqueta/clase.
    Cada caja contiene coordenadas absolutas, centro, dimensiones y confianza.
    """
    model = get_model()
    imagen = _cargar_imagen(image_input)
    resultados = model(imagen)

    cajas_por_clase: Dict[str, List[dict]] = {}

    for resultado in resultados:
        nombres = resultado.names
        for box in resultado.boxes:
            cls_id = int(box.cls[0])
            etiqueta = nombres.get(cls_id, str(cls_id))
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            w = max(1.0, x2 - x1)
            h = max(1.0, y2 - y1)
            xc = (x1 + x2) / 2.0
            yc = (y1 + y2) / 2.0
            conf = float(box.conf[0]) if hasattr(box, 'conf') and box.conf is not None else 1.0

            caja_info = {
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "x_center": xc,
                "y_center": yc,
                "width": w,
                "height": h,
                "conf": conf
            }
            if etiqueta not in cajas_por_clase:
                cajas_por_clase[etiqueta] = []
            cajas_por_clase[etiqueta].append(caja_info)

    return cajas_por_clase

def estimar_filas_columnas(cajas: List[dict]) -> Tuple[int, int]:
    """
    Estima filas horizontales (niveles apilados verticalmente) y columnas horizontales
    a partir de las coordenadas de las cajas detectadas:
    - Agrupa en filas horizontales usando las coordenadas verticales (y_center).
    - Deduplica y cuenta columnas en cada fila.
    """
    if not cajas:
        return 0, 0
    if len(cajas) == 1:
        return 1, 1

    avg_h = sum(c["height"] for c in cajas) / len(cajas)
    avg_w = sum(c["width"] for c in cajas) / len(cajas)

    # Ordenar por y_center ascendente (de arriba a abajo)
    cajas_ordenadas = sorted(cajas, key=lambda c: c["y_center"])

    filas: List[List[dict]] = []
    for c in cajas_ordenadas:
        mejor_fila = None
        min_dist = float("inf")
        for fila in filas:
            fila_avg_yc = sum(item["y_center"] for item in fila) / len(fila)
            dist = abs(c["y_center"] - fila_avg_yc)
            # Si el centro vertical está a menos de la mitad del alto promedio, pertenece a la misma fila
            if dist <= 0.5 * avg_h and dist < min_dist:
                min_dist = dist
                mejor_fila = fila
        if mejor_fila is not None:
            mejor_fila.append(c)
        else:
            filas.append([c])

    num_filas = max(1, len(filas))

    # Columnas: para cada fila horizontal, ordenamos por x_center y eliminamos duplicados
    max_cajas_en_fila = 1
    for fila in filas:
        fila_ordenada_x = sorted(fila, key=lambda c: c["x_center"])
        dedup = [fila_ordenada_x[0]]
        for c in fila_ordenada_x[1:]:
            if abs(c["x_center"] - dedup[-1]["x_center"]) > 0.4 * avg_w:
                dedup.append(c)
        if len(dedup) > max_cajas_en_fila:
            max_cajas_en_fila = len(dedup)

    num_columnas = max(1, max_cajas_en_fila)

    return num_filas, num_columnas

def estimar_dimensiones_volumetricas(
    cajas_frontal: Optional[List[dict]],
    cajas_lateral: Optional[List[dict]]
) -> dict:
    """
    Calcula ancho, fondo, alto y cantidad_detectada (en paquetes):
    - alto: niveles apilados (filas verticales en foto_frontal o lateral, default 1)
    - ancho: columnas en foto_frontal (default 1)
    - fondo: columnas de profundidad en foto_lateral (default 1)
    - cantidad_detectada: ancho * fondo * alto
    """
    filas_f, cols_f = estimar_filas_columnas(cajas_frontal) if cajas_frontal else (0, 0)
    filas_l, cols_l = estimar_filas_columnas(cajas_lateral) if cajas_lateral else (0, 0)

    # Si no hubo detecciones en ninguna de las dos caras
    if (not cajas_frontal) and (not cajas_lateral):
        return {
            "ancho": 1,
            "fondo": 1,
            "alto": 1,
            "cantidad_detectada": 1
        }

    # Alto: nivel apilado (máximo detectado entre frontal y lateral, mín 1)
    alto = max(filas_f, filas_l, 1)

    # Ancho: columnas horizontales en foto frontal (mín 1 si solo detecta en una cara)
    ancho = max(cols_f, 1)

    # Fondo: columnas de profundidad en foto lateral (mín 1 si no hay profundidad clara o solo cara frontal)
    fondo = max(cols_l, 1)

    cantidad_detectada = ancho * fondo * alto

    return {
        "ancho": ancho,
        "fondo": fondo,
        "alto": alto,
        "cantidad_detectada": cantidad_detectada
    }

def procesar_fotos_volumetricas(
    foto_frontal: Union[str, bytes, Image.Image],
    foto_lateral: Optional[Union[str, bytes, Image.Image]] = None
) -> Dict[str, dict]:
    """
    Procesa foto_frontal y foto_lateral con YOLO.
    Devuelve un diccionario por cada etiqueta detectada con:
    ancho, fondo, alto, cantidad_detectada (en paquetes).
    """
    cajas_frontal_por_clase = detectar_cajas_por_clase(foto_frontal)
    cajas_lateral_por_clase = detectar_cajas_por_clase(foto_lateral) if foto_lateral is not None else {}

    todas_las_clases = set(cajas_frontal_por_clase.keys()) | set(cajas_lateral_por_clase.keys())
    resultados_volumetricos: Dict[str, dict] = {}

    for etiqueta in todas_las_clases:
        cajas_f = cajas_frontal_por_clase.get(etiqueta, [])
        cajas_l = cajas_lateral_por_clase.get(etiqueta, [])
        dims = estimar_dimensiones_volumetricas(cajas_f, cajas_l)
        dims["total_boxes_frontal"] = len(cajas_f)
        dims["total_boxes_lateral"] = len(cajas_l)
        resultados_volumetricos[etiqueta] = dims

    return resultados_volumetricos

def detectar_productos(image_path: Union[str, bytes]) -> Dict[str, int]:
    """
    Función de compatibilidad:
    Recibe la ruta de la imagen (o bytes de la misma),
    devuelve un diccionario con {etiqueta: cantidad_detectada}.
    """
    cajas = detectar_cajas_por_clase(image_path)
    return {etiqueta: len(lista_cajas) for etiqueta, lista_cajas in cajas.items()}
