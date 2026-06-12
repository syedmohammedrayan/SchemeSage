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
            pass
    # Comprehensive Keyword Fallback (when Gemini fails or API key missing)
    import re
    text_lower = text.lower()
    
    # --- Age ---
    age_match = re.search(r'(\d{1,2})\s*(?:year|yr|sal|saal)', text_lower)
    if not age_match:
        age_match = re.search(r'(?:age|aged|i am|i\'m|main)\s*(\d{1,2})', text_lower)
    if age_match:
        age_val = int(age_match.group(1))
        if 1 <= age_val <= 120:
            default_profile["age"] = age_val
    
    # --- Indian States ---
    indian_states = {
        "andhra pradesh": "Andhra Pradesh", "arunachal pradesh": "Arunachal Pradesh",
        "assam": "Assam", "bihar": "Bihar", "chhattisgarh": "Chhattisgarh",
        "goa": "Goa", "gujarat": "Gujarat", "haryana": "Haryana",
        "himachal pradesh": "Himachal Pradesh", "jharkhand": "Jharkhand",
        "karnataka": "Karnataka", "kerala": "Kerala", "madhya pradesh": "Madhya Pradesh",
        "maharashtra": "Maharashtra", "manipur": "Manipur", "meghalaya": "Meghalaya",
        "mizoram": "Mizoram", "nagaland": "Nagaland", "odisha": "Odisha",
        "punjab": "Punjab", "rajasthan": "Rajasthan", "sikkim": "Sikkim",
        "tamil nadu": "Tamil Nadu", "telangana": "Telangana", "tripura": "Tripura",
        "uttar pradesh": "Uttar Pradesh", "uttarakhand": "Uttarakhand",
        "west bengal": "West Bengal", "delhi": "Delhi", "jammu and kashmir": "Jammu and Kashmir",
    }
    for key, val in indian_states.items():
        if key in text_lower:
            default_profile["state"] = val
            break
    
    # --- Income ---
    income_match = re.search(r'(?:₹|rs\.?|rupees?|income|earn|salary|kamata|kamaata)\s*(\d[\d,]*)\s*(lakh|lac|lakhs?)?', text_lower)
    if not income_match:
        income_match = re.search(r'(\d[\d,]*)\s*(lakh|lac|lakhs?)', text_lower)
    if income_match:
        raw_amount = int(income_match.group(1).replace(',', ''))
        multiplier = income_match.group(2)
        if multiplier and multiplier.startswith('la'):
            raw_amount *= 100000
        elif raw_amount < 1000:
            # Likely in lakhs (e.g. "3 lakh" without the word)
            pass
        default_profile["income"] = raw_amount
    
    # --- Occupation ---
    occupation_map = {
        "farmer": ["farmer", "kisan", "krishi", "agriculture", "farming", "kisaan"],
        "student": ["student", "studying", "vidyarthi", "padhai"],
        "laborer": ["laborer", "labourer", "mazdoor", "worker", "shramik", "daily wage"],
        "self-employed": ["self-employed", "self employed", "freelance", "khud ka kaam"],
        "business": ["business", "businessman", "merchant", "vyapari", "dukandaar", "shopkeeper"],
        "unemployed": ["unemployed", "jobless", "berozgar", "no job"],
        "teacher": ["teacher", "shikshak", "professor"],
        "artisan": ["artisan", "craftsman", "weaver", "carpenter", "blacksmith", "potter"],
        "entrepreneur": ["entrepreneur", "startup"],
    }
    for occ, keywords in occupation_map.items():
        if any(kw in text_lower for kw in keywords):
            default_profile["occupation"] = occ.capitalize() if occ != "self-employed" else "Self-Employed"
            break
    
    # --- Gender ---
    if any(w in text_lower for w in ["female", "woman", "girl", "mahila", "ladki", "stri", "aurat"]):
        default_profile["gender"] = "female"
    elif any(w in text_lower for w in ["male", "boy", "man", "ladka", "purush"]):
        default_profile["gender"] = "male"
    
    # --- Caste / Category ---
    if any(w in text_lower for w in ["scheduled caste", " sc ", "sc category", "dalit"]):
        default_profile["category"] = "SC"
    elif any(w in text_lower for w in ["scheduled tribe", " st ", "st category", "adivasi", "tribal"]):
        default_profile["category"] = "ST"
    elif any(w in text_lower for w in [" obc ", "other backward", "obc category"]):
        default_profile["category"] = "OBC"
    elif any(w in text_lower for w in [" ews ", "economically weaker"]):
        default_profile["category"] = "EWS"
    elif any(w in text_lower for w in ["general category", "general caste"]):
        default_profile["category"] = "General"
    
    # --- Education ---
    if any(w in text_lower for w in ["phd", "doctorate", "ph.d"]):
        default_profile["education"] = "PhD"
    elif any(w in text_lower for w in ["postgraduate", "post graduate", "master", "mba", "mtech", "m.tech"]):
        default_profile["education"] = "Postgraduate"
    elif any(w in text_lower for w in ["graduate", "bachelor", "b.tech", "btech", "degree"]):
        default_profile["education"] = "Graduate"
    elif any(w in text_lower for w in ["12th", "12 pass", "hsc", "intermediate", "inter"]):
        default_profile["education"] = "12th Pass"
    elif any(w in text_lower for w in ["10th", "10 pass", "ssc", "matric", "matriculation"]):
        default_profile["education"] = "10th Pass"
    elif any(w in text_lower for w in ["8th", "8 pass"]):
        default_profile["education"] = "8th Pass"
        
    return default_profile

def calculate_completeness(profile: Dict[str, Any]) -> int:
    core_fields = ["age", "gender", "state", "occupation", "income", "category"]
    filled = sum(1 for f in core_fields if profile.get(f) is not None and profile.get(f) != "")
    return int((filled / len(core_fields)) * 100)
