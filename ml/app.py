"""
FastAPI Microservice for Estimated Completion Time (ECT) Prediction
Exposes REST endpoints for the core Node.js application server.
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from model import EctPredictionModel

app = FastAPI(
    title="Printania ECT Prediction Service",
    description="Intelligent Completion Time Estimation for Hyperlocal Print Queues",
    version="1.0.0"
)

model = EctPredictionModel()

class EctRequest(BaseModel):
    shop_id: Optional[str] = Field(default="shop_default", description="Unique shop identifier")
    page_count: int = Field(default=1, ge=1, le=2000, description="Total document pages")
    copies: int = Field(default=1, ge=1, le=100, description="Number of copies")
    color_mode: str = Field(default="bw", description="'bw' or 'color'")
    duplex: bool = Field(default=False, description="True for double-sided printing")
    binding: Optional[str] = Field(default="None", description="'None', 'Staple', 'Spiral'")
    queue_pages_ahead: Optional[int] = Field(default=0, ge=0, description="Impressions ahead in shop queue")
    active_jobs_ahead: Optional[int] = Field(default=0, ge=0, description="Discrete jobs ahead in shop queue")
    available_printers: Optional[int] = Field(default=1, ge=1, description="Number of operational printers")
    avg_printer_ppm: Optional[float] = Field(default=25.0, ge=5.0, description="Rated speed in pages per minute")
    is_rush_hour: Optional[bool] = Field(default=False, description="Peak campus rush period flag")

class EctResponse(BaseModel):
    status: str
    estimated_minutes: int
    confidence_interval: Dict[str, int]
    predictor_version: str
    metadata: Dict[str, Any]

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "printania-ml-ect",
        "model_version": model.VERSION
    }

@app.post("/predict-ect", response_model=EctResponse)
def predict_ect(req: EctRequest):
    try:
        prediction = model.predict(
            pages=req.page_count,
            copies=req.copies,
            color_mode=req.color_mode,
            duplex=req.duplex,
            binding=req.binding or "None",
            queue_pages_ahead=req.queue_pages_ahead or 0,
            active_jobs_ahead=req.active_jobs_ahead or 0,
            available_printers=req.available_printers or 1,
            avg_printer_ppm=req.avg_printer_ppm or 25.0,
            is_rush_hour=bool(req.is_rush_hour)
        )

        return {
            "status": "success",
            "estimated_minutes": prediction["estimated_minutes"],
            "confidence_interval": prediction["confidence_interval"],
            "predictor_version": prediction["predictor_version"],
            "metadata": prediction.get("features_analyzed", {})
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)

