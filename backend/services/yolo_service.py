import os
import io
import urllib.request
from typing import Dict, Union, List, Optional, Any, Tuple
from ultralytics import YOLO
from PIL import Image

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BEST_MODEL_PATH = os.path.join(BASE_DIR, "best.pt")
DEFAULT_MODEL_PATH = os.path.join(BASE_DIR, "yolov8n.pt")

_model = None
_base_model = None
_current_model_path = None

# IDs de clases COCO para recipientes de bebidas
# 39: bottle, 41: cup, 75: vase (a menudo botellas transparentes con líquido son detectadas como vase)
CONTAINER_CLASS_IDS = {39, 41, 75}


def get_model() -> YOLO:
    """
    Carga el modelo personalizado entrenado (best.pt) si existe,
    o en su defecto hace fallback al modelo base (yolov8n.pt).
    """
    global _model, _current_model_path

    target_path = BEST_MODEL_PATH if os.path.exists(BEST_MODEL_PATH) else DEFAULT_MODEL_PATH

    if _model is None or _current_model_path != target_path:
        model_file = target_path if os.path.exists(target_path) else "yolov8n.pt"
        _model = YOLO(model_file)
        _current_model_path = target_path

    return _model


def get_base_model() -> YOLO:
    """
    Carga el detector base COCO (yolov8n.pt) optimizado para localizar
    cada unidad individual de botella/recipiente en estibas y pallets.
    """
    global _base_model
    if _base_model is None:
        model_file = DEFAULT_MODEL_PATH if os.path.exists(DEFAULT_MODEL_PATH) else "yolov8n.pt"
        _base_model = YOLO(model_file)
    return _base_model


def _cargar_imagen(image_input: Union[str, bytes, Image.Image]) -> Image.Image:
    """Convierte el input a un objeto PIL.Image seguro y redimensiona si excede 1280px."""
    if isinstance(image_input, Image.Image):
        img = image_input
    elif isinstance(image_input, bytes):
        img = Image.open(io.BytesIO(image_input))
    elif isinstance(image_input, str):
        if image_input.startswith("http://") or image_input.startswith("https://"):
            req = urllib.request.Request(image_input, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as resp:
                img = Image.open(io.BytesIO(resp.read()))
        else:
            img = Image.open(image_input)
    else:
        raise ValueError("Formato de imagen no soportado")

    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail((1280, 1280))
    return img


def _extraer_info_cajas(resultados, nombres_dict: dict, ids_filtro: Optional[set] = None) -> List[dict]:
    """Extrae lista estructurada de cajas delimitadoras a partir de los resultados de YOLO."""
    cajas = []
    for r in resultados:
        for box in r.boxes:
            cls_id = int(box.cls[0])
            if ids_filtro is not None and cls_id not in ids_filtro:
                continue
            etiqueta = nombres_dict.get(cls_id, str(cls_id))
            xyxy = box.xyxy[0].tolist()
            x1, y1, x2, y2 = xyxy
            w = max(1.0, x2 - x1)
            h = max(1.0, y2 - y1)
            xc = (x1 + x2) / 2.0
            yc = (y1 + y2) / 2.0
            conf = float(box.conf[0]) if hasattr(box, 'conf') and box.conf is not None else 1.0

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
                "etiqueta": etiqueta
            })
    return cajas


def detectar_cajas_por_clase(image_input: Union[str, bytes, Image.Image]) -> Dict[str, List[dict]]:
    """
    Ejecuta YOLO sobre la imagen:
    1. Usa el modelo específico (best.pt) para identificar marcas y productos de bebidas (conf=0.18).
    2. Usa el detector de recipientes (yolov8n.pt) para obtener la grilla granular de botellas/unidades.
    3. Si el modelo custom detecta la marca pero con 1 sola caja global, asocia la grilla de botellas
       a dicha marca para que las filas y columnas reflejen el contenido real de la estiba.
    """
    imagen = _cargar_imagen(image_input)
    custom_model = get_model()
    base_model = get_base_model()

    # Inferencia con modelo custom (marca/presentación específica)
    res_custom = custom_model(imagen, conf=0.18, iou=0.45, imgsz=1280, verbose=False)
    cajas_custom = _extraer_info_cajas(res_custom, res_custom[0].names)

    # Inferencia con modelo base para recipientes individuales
    res_base = base_model(imagen, conf=0.10, iou=0.45, imgsz=1280, verbose=False)
    cajas_contenedores = _extraer_info_cajas(res_base, res_base[0].names, ids_filtro=CONTAINER_CLASS_IDS)

    cajas_por_clase: Dict[str, List[dict]] = {}

    # Caso A: Modelo custom detectó marcas
    if cajas_custom:
        # Agrupar cajas custom por etiqueta
        for c in cajas_custom:
            etiq = c["etiqueta"]
            cajas_por_clase.setdefault(etiq, []).append(c)

        # Si el modelo custom detectó pocas cajas globales que engloban el pallet/bandeja,
        # pero el detector de recipientes encontró múltiples unidades granulares:
        if cajas_contenedores and len(cajas_contenedores) > len(cajas_custom):
            etiqueta_principal = max(cajas_por_clase.keys(), key=lambda k: len(cajas_por_clase[k]))
            cajas_adaptadas = []
            for b in cajas_contenedores:
                b_copy = dict(b)
                b_copy["etiqueta"] = etiqueta_principal
                cajas_adaptadas.append(b_copy)
            cajas_por_clase[etiqueta_principal] = cajas_adaptadas

    # Caso B: Modelo custom no detectó nada (o no existe) -> fallback a botellas individuales COCO
    elif cajas_contenedores:
        cajas_por_clase["bottle"] = cajas_contenedores

    return cajas_por_clase


def estimar_filas_columnas(cajas: List[dict]) -> Tuple[int, int]:
    """
    Estima filas horizontales (niveles apilados verticalmente) y columnas horizontales
    a partir de las coordenadas de las cajas detectadas:
    - Agrupa en filas horizontales usando coordenadas verticales (y_center).
    - Deduplica y cuenta columnas en cada fila.
    - Si una caja es ancha (bandeja horizontal), estima las columnas que representa.
    """
    if not cajas:
        return 0, 0

    if len(cajas) == 1:
        c = cajas[0]
        w, h = c["width"], c["height"]
        # Si la caja es significativamente más ancha que alta, representa una bandeja de varias unidades
        if w >= 1.7 * h:
            cols_est = max(2, min(15, round(w / (h * 0.45))))
            return 1, cols_est
        if h >= 2.2 * w:
            filas_est = max(2, min(10, round(h / (w * 1.5))))
            return filas_est, 1
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
            # Umbral de tolerancia vertical (0.6 del alto promedio de caja)
            if dist <= 0.6 * avg_h and dist < min_dist:
                min_dist = dist
                mejor_fila = fila
        if mejor_fila is not None:
            mejor_fila.append(c)
        else:
            filas.append([c])

    num_filas = max(1, len(filas))

    # Estimar columnas en cada fila considerando deduplicación y bandejas anchas
    max_cajas_en_fila = 1
    for fila in filas:
        fila_ordenada_x = sorted(fila, key=lambda c: c["x_center"])
        cols_en_fila = 0
        ultimo_x = -float("inf")

        for c in fila_ordenada_x:
            w = c["width"]
            # Si una caja individual dentro de la fila es muy ancha, representa múltiples columnas
            sub_cols = max(1, round(w / (avg_h * 0.45))) if w >= 1.8 * avg_h else 1

            if abs(c["x_center"] - ultimo_x) > 0.35 * avg_w:
                cols_en_fila += sub_cols
                ultimo_x = c["x_center"]

        if cols_en_fila > max_cajas_en_fila:
            max_cajas_en_fila = cols_en_fila

    num_columnas = max(1, max_cajas_en_fila)

    return num_filas, num_columnas


def estimar_dimensiones_volumetricas(
    cajas_frontal: Optional[List[dict]],
    cajas_lateral: Optional[List[dict]]
) -> dict:
    """
    Calcula ancho, fondo, alto y cantidad_detectada (en paquetes/unidades):
    - alto: niveles apilados (filas verticales en foto_frontal o lateral)
    - ancho: columnas en foto_frontal
    - fondo: columnas de profundidad en foto_lateral
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

    # Ancho: columnas horizontales en foto frontal (o lateral si solo se detectó lateral)
    ancho = max(cols_f, 1) if cols_f > 0 else max(cols_l, 1)

    # Fondo: columnas de profundidad en foto lateral
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
    ancho, fondo, alto, cantidad_detectada.
    """
    cajas_frontal_por_clase = detectar_cajas_por_clase(foto_frontal)
    cajas_lateral_por_clase = detectar_cajas_por_clase(foto_lateral) if foto_lateral is not None else {}

    todas_las_clases = set(cajas_frontal_por_clase.keys()) | set(cajas_lateral_por_clase.keys())
    resultados_volumetricos: Dict[str, dict] = {}

    # Si hay cajas en la vista lateral de cualquier clase, representan la profundidad del pallet
    todas_cajas_l = [b for b_list in cajas_lateral_por_clase.values() for b in b_list]
    todas_cajas_f = [b for b_list in cajas_frontal_por_clase.values() for b in b_list]

    for etiqueta in todas_las_clases:
        cajas_f = cajas_frontal_por_clase.get(etiqueta, [])
        cajas_l = cajas_lateral_por_clase.get(etiqueta, [])

        # Si una vista tiene cajas generales del pallet pero no de esta etiqueta exacta,
        # se aprovechan las cajas de la vista para no colapsar la dimensión a 1
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
    """
    Función de compatibilidad:
    Recibe la ruta de la imagen (o bytes de la misma),
    devuelve un diccionario con {etiqueta: cantidad_detectada}.
    """
    cajas = detectar_cajas_por_clase(image_path)
    return {etiqueta: len(lista_cajas) for etiqueta, lista_cajas in cajas.items()}
