import os
import io
import urllib.request
from typing import Dict, Union, List, Optional, Tuple
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEST_MODEL_PATH = os.path.join(BASE_DIR, "best.pt")

_model = None
_current_model_path = None


def get_model() -> YOLO:
    """Carga exclusivamente el modelo entrenado best.pt."""
    global _model, _current_model_path

    if not os.path.exists(BEST_MODEL_PATH):
        raise FileNotFoundError(f"No se encontró el modelo entrenado en: {BEST_MODEL_PATH}")

    if _model is None or _current_model_path != BEST_MODEL_PATH:
        _model = YOLO(BEST_MODEL_PATH)
        _current_model_path = BEST_MODEL_PATH

    return _model


def _cargar_imagen(image_input: Union[str, bytes, Image.Image], max_dim: int = 1024) -> Image.Image:
    """Convierte el input a PIL.Image en RGB y limita el tamaño máximo para cuidar CPU y RAM."""
    if isinstance(image_input, Image.Image):
        img = image_input
    elif isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        if image_input.startswith("http://") or image_input.startswith("https://"):
            req = urllib.request.Request(image_input, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=15) as resp:
                img = Image.open(io.BytesIO(resp.read()))
        else:
            img = Image.open(image_input)
    else:
        raise ValueError("Formato de imagen no soportado")

    if img.mode != "RGB":
        img = img.convert("RGB")
    if max(img.size) > max_dim:
        img.thumbnail((max_dim, max_dim), Image.Resampling.BILINEAR)
    return img


def _extraer_info_cajas(resultados, nombres_dict: dict) -> List[dict]:
    """Extrae lista estructurada de cajas delimitadoras."""
    cajas = []
    for r in resultados:
        if r.boxes is None:
            continue
        for box in r.boxes:
            cls_id = int(box.cls[0])
            etiqueta = nombres_dict.get(cls_id, str(cls_id))
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
            w = max(1.0, x2 - x1)
            h = max(1.0, y2 - y1)
            xc = (x1 + x2) / 2.0
            yc = (y1 + y2) / 2.0
            conf = float(box.conf[0]) if hasattr(box, "conf") and box.conf is not None else 1.0

            cajas.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "x_center": xc,
                "y_center": yc,
                "width": w,
                "height": h,
                "conf": conf,
                "etiqueta": etiqueta,
            })
    return cajas


def detectar_cajas_por_clase(image_input: Union[str, bytes, Image.Image]) -> Dict[str, List[dict]]:
    """Ejecuta una sola pasada de inferencia con best.pt optimizada para CPU."""
    imagen = _cargar_imagen(image_input, max_dim=1024)
    model = get_model()

    resultados = model(imagen, conf=0.12, iou=0.45, imgsz=640, verbose=False)
    nombres = resultados[0].names if resultados else model.names
    cajas = _extraer_info_cajas(resultados, nombres)

    cajas_por_clase: Dict[str, List[dict]] = {}
    for c in cajas:
        cajas_por_clase.setdefault(c["etiqueta"], []).append(c)

    return cajas_por_clase


def estimar_filas_columnas(cajas: List[dict]) -> Tuple[int, int]:
    """Estima niveles (filas) y columnas a partir de las cajas detectadas."""
    if not cajas:
        return 0, 0

    if len(cajas) == 1:
        c = cajas[0]
        w = float(c["width"])
        h = float(c["height"])
        unit_w = max(1.0, h * 0.35)
        cols = max(1, min(15, round(w / unit_w)))
        filas = max(2, min(10, round(h / max(1.0, w * 1.2)))) if h >= 2.2 * w else 1
        return filas, cols

    avg_h = sum(float(c["height"]) for c in cajas) / len(cajas)
    avg_w = sum(float(c["width"]) for c in cajas) / len(cajas)

    cajas_ordenadas = sorted(cajas, key=lambda c: float(c["y_center"]))
    filas: List[List[dict]] = []

    for c in cajas_ordenadas:
        yc = float(c["y_center"])
        mejor_fila = None
        min_dist = float("inf")
        for fila in filas:
            fila_avg_yc = sum(float(item["y_center"]) for item in fila) / len(fila)
            dist = abs(yc - fila_avg_yc)
            if dist <= 0.6 * avg_h and dist < min_dist:
                min_dist = dist
                mejor_fila = fila
        if mejor_fila is not None:
            mejor_fila.append(c)
        else:
            filas.append([c])

    num_filas = max(1, len(filas))
    unit_w_ref = max(1.0, avg_h * 0.35)
    max_cols_en_fila = 1

    for fila in filas:
        fila_ordenada_x = sorted(fila, key=lambda c: float(c["x_center"]))
        cols_en_fila = 0
        ultimo_x = -float("inf")

        for c in fila_ordenada_x:
            w = float(c["width"])
            xc = float(c["x_center"])
            sub_cols = max(1, min(8, round(w / unit_w_ref))) if w >= 1.6 * unit_w_ref else 1

            if abs(xc - ultimo_x) > 0.35 * avg_w:
                cols_en_fila += sub_cols
                ultimo_x = xc

        if cols_en_fila > max_cols_en_fila:
            max_cols_en_fila = cols_en_fila

    return num_filas, max(1, max_cols_en_fila)


def estimar_dimensiones_volumetricas(
    cajas_frontal: Optional[List[dict]],
    cajas_lateral: Optional[List[dict]]
) -> dict:
    """Calcula ancho, fondo, alto y cantidad_detectada."""
    filas_f, cols_f = estimar_filas_columnas(cajas_frontal) if cajas_frontal else (0, 0)
    filas_l, cols_l = estimar_filas_columnas(cajas_lateral) if cajas_lateral else (0, 0)

    if not cajas_frontal and not cajas_lateral:
        return {"ancho": 1, "fondo": 1, "alto": 1, "cantidad_detectada": 1}

    alto = max(filas_f, filas_l, 1)
    ancho = max(cols_f, 1) if cols_f > 0 else max(cols_l, 1)
    fondo = max(cols_l, 1) if cols_l > 0 else 1

    return {
        "ancho": ancho,
        "fondo": fondo,
        "alto": alto,
        "cantidad_detectada": ancho * fondo * alto,
    }


def procesar_fotos_volumetricas(
    foto_frontal: Union[str, bytes, Image.Image],
    foto_lateral: Optional[Union[str, bytes, Image.Image]] = None
) -> Dict[str, dict]:
    """Procesa foto_frontal y foto_lateral con best.pt."""
    cajas_frontal_por_clase = detectar_cajas_por_clase(foto_frontal)
    cajas_lateral_por_clase = detectar_cajas_por_clase(foto_lateral) if foto_lateral is not None else {}

    todas_las_clases = set(cajas_frontal_por_clase.keys()) | set(cajas_lateral_por_clase.keys())
    if not todas_las_clases:
        return {}

    todas_cajas_f = [b for b_list in cajas_frontal_por_clase.values() for b in b_list]
    todas_cajas_l = [b for b_list in cajas_lateral_por_clase.values() for b in b_list]

    resultados_volumetricos: Dict[str, dict] = {}
    for etiqueta in todas_las_clases:
        cajas_f = cajas_frontal_por_clase.get(etiqueta, [])
        cajas_l = cajas_lateral_por_clase.get(etiqueta, [])

        if not cajas_l and todas_cajas_l:
            cajas_l = todas_cajas_l
        if not cajas_f and todas_cajas_f:
            cajas_f = todas_cajas_f

        dims = estimar_dimensiones_volumetricas(cajas_f, cajas_l)
        dims["total_boxes_frontal"] = len(cajas_f)
        dims["total_boxes_lateral"] = len(cajas_l)
        resultados_volumetricos[etiqueta] = dims

    return resultados_volumetricos


def detectar_productos(image_path: Union[str, bytes]) -> Dict[str, int]:
    """Función de compatibilidad."""
    cajas = detectar_cajas_por_clase(image_path)
    return {etiqueta: len(lista_cajas) for etiqueta, lista_cajas in cajas.items()}