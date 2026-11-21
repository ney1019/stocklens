FROM python:3.10-slim

# Instalar dependencias del sistema necesarias para OpenCV
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Crear carpeta uploads con permisos de escritura para Hugging Face
RUN mkdir -p /app/uploads && chmod -R 777 /app/uploads

# Hugging Face Spaces usa obligatoriamente el puerto 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]