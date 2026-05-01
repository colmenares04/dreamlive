# Stage 1: Build dependencies
FROM python:3.12-slim as builder

WORKDIR /app

# Instalar dependencias del sistema necesarias para construir paquetes de Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Final image
FROM python:3.12-slim

WORKDIR /app

# Copiar dependencias instaladas desde el builder
COPY --from=builder /install /usr/local

# Copiar el código de la aplicación
COPY . .

# Exponer el puerto de FastAPI
EXPOSE 8000

# Variables de entorno por defecto
ENV HOST_IP=0.0.0.0
ENV HOST_PORT=8000
ENV DEBUG=False

# Comando para iniciar la aplicación
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

