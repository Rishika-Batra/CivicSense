# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM python:3.10-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required by OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ─── Stage 2: Model Download ──────────────────────────────────────────────────
# The stock YOLOv8n weights (~6 MB) are downloaded at build time so the
# container starts instantly without hitting the network at runtime.
# If you have custom fine-tuned weights (best.pt), place them in
# ai-service/models/ before building and they will be copied in below.
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')" && \
    mkdir -p /app/models && \
    cp /root/.config/Ultralytics/yolov8n.pt /app/models/yolov8n.pt 2>/dev/null || true

# ─── Stage 3: Application ─────────────────────────────────────────────────────
COPY . .

# Copy custom model weights if they exist (build-time COPY won't fail if missing)
# Place your fine-tuned best.pt at ai-service/models/best.pt before docker build
COPY models/ /app/models/ 2>/dev/null || true

# Expose FastAPI port
EXPOSE 8000

# Health-check so Render knows when the container is ready
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start with Uvicorn — Render injects $PORT at runtime
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
