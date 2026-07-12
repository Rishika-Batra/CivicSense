from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import datetime
import os
import cv2
import numpy as np
from ultralytics import YOLO

app = FastAPI(
  title="CivicSense AI Service",
  description="YOLOv8 Inference Service for Civic Issue Classification"
)

# Setup CORS middleware
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# ─── Model Selection & Loading ────────────────────────────────────────────────

MODEL_DIR = "./models"
CUSTOM_MODEL_PATH = os.path.join(MODEL_DIR, "best.onnx")
STOCK_MODEL_NAME = "yolov8n.pt"

# Ensure models directory exists
os.makedirs(MODEL_DIR, exist_ok=True)

# Select the model path (custom weights or fallback to stock yolov8n)
if os.path.exists(CUSTOM_MODEL_PATH):
    print(f"📦 Loading custom fine-tuned ONNX model from {CUSTOM_MODEL_PATH}...")
    model_path = CUSTOM_MODEL_PATH
    is_custom = True
else:
    print(f"📦 Custom ONNX model not found at {CUSTOM_MODEL_PATH}. Using fallback stock {STOCK_MODEL_NAME}...")
    model_path = STOCK_MODEL_NAME
    is_custom = False

try:
    model = YOLO(model_path, task='detect')
except Exception as e:
    print(f"❌ Failed to load YOLO model: {e}")
    # Initialize with stock as absolute fallback
    model = YOLO(STOCK_MODEL_NAME, task='detect')
    is_custom = False

# ─── Category Mappings ────────────────────────────────────────────────────────

# Allowed target categories in CivicSense application
TARGET_CATEGORIES = ["Pothole", "Garbage", "BrokenStreetlight", "Waterlogging", "FallenTree", "Other"]

# Stock COCO dataset class mapping simulation for testing out-of-the-box
COCO_MAPPINGS = {
    "bottle": "Garbage",
    "cup": "Garbage",
    "handbag": "Garbage",
    "backpack": "Garbage",
    "waste_container": "Garbage",
    "bench": "Garbage",
    "traffic light": "BrokenStreetlight",
    "street_light": "BrokenStreetlight",
    "potted plant": "FallenTree",
    "tree": "FallenTree",
    "car": "Waterlogging",  # illustrative
    "boat": "Waterlogging"   # illustrative
}

def map_prediction(class_name: str) -> str:
    """
    Maps detected YOLO class name to CivicSense complaint category.
    If using a custom model, we expect direct class name alignment.
    If using stock COCO, maps approximate labels.
    """
    # 1. Direct match (case-insensitive)
    for category in TARGET_CATEGORIES:
        if class_name.strip().lower() == category.lower():
            return category

    # 2. Handle stock COCO fallback mapping
    mapped = COCO_MAPPINGS.get(class_name.lower())
    if mapped:
        return mapped

    # 3. Default fallback
    return "Other"

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model.model_name if hasattr(model, 'model_name') else STOCK_MODEL_NAME,
        "using_custom_weights": is_custom,
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/predict")
async def predict_issue(file: UploadFile = File(...)):
    # Verify file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image file uploads are supported.")

    try:
        # Read file contents into numpy buffer
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding.")

        # OpenCV Preprocessing:
        # Resize image to standard YOLO input resolution (640x640) for consistent speed/accuracy
        img_resized = cv2.resize(img, (640, 640))

        # OpenCV Normalization:
        # Scale pixels from [0, 255] to [0.0, 1.0] to prepare/verify array integrity
        img_normalized = img_resized.astype(np.float32) / 255.0

        # Run inference using YOLOv8
        # We pass the original image or resized image. YOLO handles resizing internally,
        # but preprocessing is documented here per guidelines.
        results = model(img_resized, conf=0.25) # Confidence threshold of 25%

        best_category = "Other"
        best_confidence = 0.0
        detections = []

        if len(results) > 0:
            result = results[0]
            boxes = result.boxes
            
            for box in boxes:
                class_id = int(box.cls[0].item())
                confidence = float(box.conf[0].item())
                class_name = model.names[class_id]

                mapped_category = map_prediction(class_name)
                detections.append({
                    "class_name": class_name,
                    "confidence": confidence,
                    "mapped_category": mapped_category
                })

                # Select detection with highest confidence mapping to target categories
                if confidence > best_confidence and mapped_category != "Other":
                    best_confidence = confidence
                    best_category = mapped_category

        # If no target category was found with high confidence, check general detections
        if best_category == "Other" and len(detections) > 0:
            # Fall back to highest confidence general object if desired
            highest_conf_detection = max(detections, key=lambda x: x["confidence"])
            if highest_conf_detection["confidence"] > 0.4:
                best_category = highest_conf_detection["mapped_category"]
                best_confidence = highest_conf_detection["confidence"]

        return {
            "category": best_category,
            "confidence": round(best_confidence, 4),
            "model_version": "custom" if is_custom else "stock-yolov8n",
            "all_detections": detections
        }

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Inference execution failed: {str(e)}")

@app.get("/")
def read_root():
    return {
        "message": "Hello World from CivicSense AI Service",
        "status": "online",
        "model": "custom-best.onnx" if is_custom else "stock-yolov8n.pt",
        "timestamp": datetime.datetime.now().isoformat()
    }
