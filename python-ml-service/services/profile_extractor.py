import os
import json
from typing import Dict, Any
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "mock-gemini-key")
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception:
    client = None

def extract_profile(text: str) -> Dict[str, Any]:
    # Fallback structure
    default_profile = {
        "age": None,
        "gender": None,
        "state": None,
        "occupation": None,
        "income": None,
        "category": None,
        "education": None,
        "marital_status": None,
        "disability_status": None
    }
    
    # Check for empty or garbage inputs (MNC-level input validation)
    if not text or len(text.strip()) < 2:
        return default_profile

    # Use Gemini for highly robust extraction
    if client and GEMINI_API_KEY != "mock-gemini-key":
        prompt = f"""
        You are an advanced AI extracting a citizen's profile from speech-to-text input.
        The user said: "{text}"
        
        Extract these details into a JSON object. If a detail is NOT explicitly mentioned or cannot be strongly inferred, leave its value as null. DO NOT guess.
        - age (integer)
        - gender ("male", "female", "other")
        - state (string, title case, only Indian states)
        - occupation (string)
        - income (integer, absolute number in Rupees. e.g. 1 lakh = 100000)
        - category ("General", "SC", "ST", "OBC", "EWS")
        - education (string)
        - marital_status ("single", "married", "widow", "divorced")
        - disability_status (boolean, true if mentioned as disabled, otherwise null)

        Return ONLY valid JSON like:
        {{
            "age": 25,
            "gender": "male",
            "state": "Assam",
            "occupation": "farmer",
            "income": 100000,
            "category": null,
            "education": null,
            "marital_status": null,
            "disability_status": null
        }}
        """
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=prompt
            )
            resp_text = response.text.strip()
            if resp_text.startswith("```json"): resp_text = resp_text[7:]
            if resp_text.endswith("```"): resp_text = resp_text[:-3]
            parsed = json.loads(resp_text)
            
            # Merge with default profile to ensure all keys exist
            final_profile = default_profile.copy()
            for k, v in parsed.items():
                if k in final_profile and v is not None:
                    final_profile[k] = v
                    
            return final_profile
        except Exception as e:
            print(f"Gemini Extraction failed: {e}")
            # Fall through to return default_profile if AI fails
            pass
            
    return default_profile

def calculate_completeness(profile: Dict[str, Any]) -> int:
    core_fields = ["age", "gender", "state", "occupation", "income", "category"]
    filled = sum(1 for f in core_fields if profile.get(f) is not None and profile.get(f) != "")
    return int((filled / len(core_fields)) * 100)
