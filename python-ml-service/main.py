from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from models.recommender import SchemeRecommender
from services.translation_service import translate_to_english
from services.profile_extractor import extract_profile, calculate_completeness
from scraper_worker import run_scraper
import uvicorn

app = FastAPI(title="Technove AI & ML Service")
recommender = SchemeRecommender()

@app.get("/ping")
@app.head("/ping")
def ping():
    return {"status": "ok", "service": "technove-ml-service"}

class ProfileInput(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    income: Optional[float] = None
    state: Optional[str] = None
    district: Optional[str] = None
    occupation: Optional[str] = None
    education: Optional[str] = None
    category: Optional[str] = None
    minority_status: Optional[bool] = None
    disability_status: Optional[bool] = None
    marital_status: Optional[str] = None

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

class VoiceProfileRequest(BaseModel):
    transcript: str
    language: str

@app.get("/")
def health_check():
    return {"status": "ok", "service": "Technove ML Engine"}

@app.post("/recommend")
def recommend_schemes(req: RecommendationRequest):
    try:
        # Validate Request
        profile_dict = req.profile.dict(exclude_none=True)
        if not profile_dict and not req.available_schemes:
            raise HTTPException(status_code=400, detail="Empty request payload")
        
        if not profile_dict:
            # Recommender needs at least some info to give meaningful results, 
            # though our logic will just return completeness 0 and full missing list.
            pass

        # Pass profile and schemes to the ML recommender
        results = recommender.predict(req.profile.dict(), [s.dict() for s in req.available_schemes])
        
        return {
            "profileCompleteness": results["profileCompleteness"],
            "missingFields": results["missingFields"],
            "recommendations": results["recommendations"]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape")
def trigger_scrape(req: ScrapeRequest):
    try:
        results = run_scraper(req.url)
        return {"success": True, "count": len(results), "schemes": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/voice-profile")
def extract_voice_profile(req: VoiceProfileRequest):
    original_text = req.transcript
    
    # Translation Layer
    translated_text = translate_to_english(original_text)
    
    # Extraction Layer
    profile = extract_profile(translated_text)
    completeness = calculate_completeness(profile)
    
    return {
        "text": original_text,
        "translatedText": translated_text,
        "profile": profile,
        "confidence": {},
        "missingFields": [k for k, v in profile.items() if v is None],
        "reasoning": [f"Extracted basic profile using AI rules."],
        "isError": False
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

