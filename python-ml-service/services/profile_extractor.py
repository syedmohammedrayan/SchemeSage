import spacy
import re
from typing import Dict, Any

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    print("en_core_web_sm not found, using pure regex fallback.")
    nlp = None

INDIAN_STATES = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", 
    "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", 
    "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab", 
    "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", 
    "uttarakhand", "west bengal", "delhi", "jammu and kashmir"
]

def extract_profile(text: str) -> Dict[str, Any]:
    text_lower = text.lower()
    doc = nlp(text) if nlp else None
    
    profile = {
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

    # Age
    age_match = re.search(r"\b(\d{1,3})\s*(?:years?|yrs?)(?:\s*old)?\b", text_lower)
    if age_match:
        profile["age"] = int(age_match.group(1))
    elif doc:
        for ent in doc.ents:
            if ent.label_ == "DATE" and "year" in ent.text.lower():
                nums = re.findall(r"\d+", ent.text)
                if nums:
                    profile["age"] = int(nums[0])
                    break

    # Gender
    if re.search(r"\b(female|woman|girl|lady)\b", text_lower):
        profile["gender"] = "female"
    elif re.search(r"\b(male|man|boy|guy)\b", text_lower):
        profile["gender"] = "male"

    # State
    for state in INDIAN_STATES:
        if state in text_lower:
            profile["state"] = state.title()
            break

    # Occupation
    occ_keywords = {
        "Farmer": ["farmer", "agriculture", "farming", "cultivator"],
        "Student": ["student", "studying", "college", "school"],
        "Salaried": ["job", "salaried", "employee", "working"],
        "Business": ["business", "shop", "merchant", "trader"],
        "Unemployed": ["unemployed", "jobless", "no work"],
        "Retired": ["retired", "pensioner"],
        "Self-Employed": ["self-employed", "freelancer"]
    }
    for occ, words in occ_keywords.items():
        if any(re.search(rf"\b{w}\b", text_lower) for w in words):
            profile["occupation"] = occ
            break

    # Income
    inc_match = re.search(r"(?:rs\.?|₹|rupees)\s*([\d,]+(?:\.\d+)?)\s*(lakh|lakhs|k|thousand)?", text_lower)
    if inc_match:
        num_str = inc_match.group(1).replace(",", "")
        try:
            base_val = float(num_str)
            multiplier_str = inc_match.group(2)
            if multiplier_str:
                if "lakh" in multiplier_str:
                    base_val *= 100000
                elif "k" in multiplier_str or "thousand" in multiplier_str:
                    base_val *= 1000
            profile["income"] = int(base_val)
        except ValueError:
            pass

    # Category
    if re.search(r"\b(sc|scheduled caste)\b", text_lower):
        profile["category"] = "SC"
    elif re.search(r"\b(st|scheduled tribe)\b", text_lower):
        profile["category"] = "ST"
    elif re.search(r"\b(obc|other backward class)\b", text_lower):
        profile["category"] = "OBC"
    elif re.search(r"\b(ews|economically weaker section)\b", text_lower):
        profile["category"] = "EWS"
    elif re.search(r"\b(general|open)\b", text_lower):
        profile["category"] = "General"

    # Education
    if re.search(r"\b(postgraduate|master|phd|mtech|msc|ma|mba)\b", text_lower):
        profile["education"] = "postgraduate"
    elif re.search(r"\b(graduate|degree|btech|bsc|ba|bcom)\b", text_lower):
        profile["education"] = "graduate"
    elif re.search(r"\b(12th|twelfth|intermediate|inter)\b", text_lower):
        profile["education"] = "12th"
    elif re.search(r"\b(10th|tenth|matriculation|ssc)\b", text_lower):
        profile["education"] = "10th"
    elif re.search(r"\b(below 10th|uneducated|illiterate)\b", text_lower):
        profile["education"] = "below_10th"

    # Marital Status
    if re.search(r"\b(single|unmarried)\b", text_lower):
        profile["marital_status"] = "single"
    elif re.search(r"\b(married|husband|wife)\b", text_lower):
        profile["marital_status"] = "married"
    elif re.search(r"\b(widow|widower)\b", text_lower):
        profile["marital_status"] = "widow"
    elif re.search(r"\b(divorced|separated)\b", text_lower):
        profile["marital_status"] = "divorced"

    # Disability Status
    if re.search(r"\b(disabled|disability|handicap|pwd|blind|deaf)\b", text_lower):
        profile["disability_status"] = True
    else:
        profile["disability_status"] = False

    return profile

def calculate_completeness(profile: Dict[str, Any]) -> int:
    core_fields = ["age", "gender", "state", "occupation", "income", "category"]
    filled = sum(1 for f in core_fields if profile.get(f) is not None)
    return int((filled / len(core_fields)) * 100)
