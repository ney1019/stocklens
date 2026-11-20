import os
import io
from typing import Dict, Union
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

    # Si el archivo del modelo cambió o aún no se ha cargado en memoria
    if _model is None or _current_model_path != target_path:
        model_file = target_path if os.path.exists(target_path) else "yolov8n.pt"
        _model = YOLO(model_file)
        _current_model_path = target_path

    return _model

def detectar_productos(image_path: Union[str, bytes]) -> Dict[str, int]:
    """
    Recibe la ruta de la imagen (o bytes de la misma),
    ejecuta inferencia con YOLO y devuelve un diccionario con {etiqueta: cantidad_detectada}.
    """
    model = get_model()

    if isinstance(image_path, bytes):
        imagen = Image.open(io.BytesIO(image_path))
        resultados = model(imagen)
    else:
        resultados = model(image_path)

    conteo: Dict[str, int] = {}

    for resultado in resultados:
        nombres = resultado.names  # Mapeo de ID de clase a nombre de etiqueta
        for box in resultado.boxes:
            cls_id = int(box.cls[0])
            etiqueta = nombres.get(cls_id, str(cls_id))
            conteo[etiqueta] = conteo.get(etiqueta, 0) + 1

    return conteo
