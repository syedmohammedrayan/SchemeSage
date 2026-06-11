import spacy
import re
from typing import Dict, Any, Tuple, List
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    import spacy.cli
    print("Downloading en_core_web_sm...")
    spacy.cli.download("en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

INDIAN_STATES = [
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", 
    "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", 
    "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab", 
    "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", 
    "uttarakhand", "west bengal", "delhi", "jammu and kashmir"
]

class ProfileExtractor:
    def __init__(self):
        print("Initialized ProfileExtractor with spaCy")

    def extract(self, text: str) -> Tuple[Dict[str, Any], List[str], List[str]]:
        text_lower = text.lower()
        doc = nlp(text)
        
        profile = {
            "age": None,
            "gender": None,
            "state": None,
            "district": None,
            "occupation": None,
            "income": None,
            "category": None,
            "educationLevel": None,
            "maritalStatus": None,
            "ruralUrban": None,
            "minority": None,
            "disability": None
        }
        reasoning = []

        # Age Extraction
        age_match = re.search(r"\b(\d{1,3})\s*(?:years?|yrs?)(?:\s*old)?\b", text_lower)
        if age_match:
            profile["age"] = int(age_match.group(1))
            reasoning.append(f"Detected age: {profile['age']}")
        else:
            # Fallback spacy entities
            for ent in doc.ents:
                if ent.label_ == "DATE" and "year" in ent.text.lower():
                    nums = re.findall(r"\d+", ent.text)
                    if nums:
                        profile["age"] = int(nums[0])
                        reasoning.append(f"Detected age: {profile['age']}")
                        break

        # Gender
        if re.search(r"\b(female|woman|girl|lady)\b", text_lower):
            profile["gender"] = "female"
            reasoning.append("Detected gender: female")
        elif re.search(r"\b(male|man|boy|guy)\b", text_lower):
            profile["gender"] = "male"
            reasoning.append("Detected gender: male")

        # State
        for state in INDIAN_STATES:
            if state in text_lower:
                profile["state"] = state.title()
                reasoning.append(f"Detected state: {profile['state']}")
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
                reasoning.append(f"Detected occupation: {occ}")
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
                reasoning.append(f"Detected income: ₹{profile['income']}")
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

        if profile["category"]:
            reasoning.append(f"Detected category: {profile['category']}")

        # Education
        if re.search(r"\b(postgraduate|master|phd|mtech|msc|ma|mba)\b", text_lower):
            profile["educationLevel"] = "postgraduate"
        elif re.search(r"\b(graduate|degree|btech|bsc|ba|bcom)\b", text_lower):
            profile["educationLevel"] = "graduate"
        elif re.search(r"\b(12th|twelfth|intermediate|inter)\b", text_lower):
            profile["educationLevel"] = "12th"
        elif re.search(r"\b(10th|tenth|matriculation|ssc)\b", text_lower):
            profile["educationLevel"] = "10th"
        elif re.search(r"\b(below 10th|uneducated|illiterate)\b", text_lower):
            profile["educationLevel"] = "below_10th"

        if profile["educationLevel"]:
            reasoning.append(f"Detected education: {profile['educationLevel']}")

        # Marital Status
        if re.search(r"\b(single|unmarried)\b", text_lower):
            profile["maritalStatus"] = "single"
        elif re.search(r"\b(married|husband|wife)\b", text_lower):
            profile["maritalStatus"] = "married"
        elif re.search(r"\b(widow|widower)\b", text_lower):
            profile["maritalStatus"] = "widow"
        elif re.search(r"\b(divorced|separated)\b", text_lower):
            profile["maritalStatus"] = "divorced"

        if profile["maritalStatus"]:
            reasoning.append(f"Detected marital status: {profile['maritalStatus']}")

        # Special Boolean Flags
        if re.search(r"\b(minority|muslim|christian|sikh|buddhist|parsi|jain)\b", text_lower):
            profile["minority"] = True
            reasoning.append("Detected minority status")
            
        if re.search(r"\b(disabled|disability|handicap|pwd|blind|deaf)\b", text_lower):
            profile["disability"] = True
            reasoning.append("Detected disability")

        # Determine missing fields
        missing_fields = []
        for key in ["age", "state", "occupation", "income", "category", "gender"]:
            if profile.get(key) is None:
                missing_fields.append(key)

        if not reasoning:
            reasoning.append("Could not confidently detect profile fields from the input.")

        return profile, missing_fields, reasoning
