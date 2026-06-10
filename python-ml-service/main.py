from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from models.recommender import SchemeRecommender
from scraper_worker import run_scraper
import uvicorn

app = FastAPI(title="Technove AI & ML Service")
recommender = SchemeRecommender()

class ProfileInput(BaseModel):
    age: int = None
    gender: str = None
    income: float = None
    state: str = None
    occupation: str = None
    category: str = None

class SchemeInput(BaseModel):
    id: str
    name: str
    description: str
    eligibility: Dict[str, Any]

class RecommendationRequest(BaseModel):
    profile: ProfileInput
    available_schemes: List[SchemeInput]

class ScrapeRequest(BaseModel):
    url: str

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Technove ML Engine"}

@app.post("/recommend")
def recommend_schemes(req: RecommendationRequest):
    try:
        # Pass profile and schemes to the ML recommender
        results = recommender.predict(req.profile.dict(), [s.dict() for s in req.available_schemes])
        return {"recommendations": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape")
def trigger_scrape(req: ScrapeRequest):
    try:
        results = run_scraper(req.url)
        return {"success": True, "count": len(results), "schemes": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
