import os
import json
from typing import List, Dict, Any, Tuple
from google import genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "mock-gemini-key")
try:
    client = genai.Client(api_key=GEMINI_API_KEY)
except Exception:
    client = None

WEIGHTS = {
    "state": 25,
    "category": 20,
    "income": 20,
    "occupation": 25,  # Boosted occupation weight
    "education": 10,
    "age": 10,
    "gender": 10
}

class SchemeRecommender:
    def __init__(self):
        print("Initialized Enhanced SchemeRecommender with AI capabilities")

    def _get_match_level(self, score: float) -> str:
        if score >= 80:
            return "Excellent Match"
        elif score >= 60:
            return "Strong Match"
        elif score >= 35:
            return "Relevant Match"
        return "Potential Match"

    def _calculate_completeness(self, profile: Dict[str, Any]) -> Tuple[int, List[str]]:
        fields = ["age", "state", "income", "category", "occupation", "gender"]
        missing = []
        filled = 0
        for f in fields:
            val = profile.get(f)
            if val is not None and val != "" and val != 0:
                filled += 1
            else:
                missing.append(f)
        
        completeness = int((filled / len(fields)) * 100) if fields else 0
        return completeness, missing

    def _calculate_score(self, profile: Dict[str, Any], scheme: Dict[str, Any]) -> Tuple[float, List[str]]:
        score = 0.0
        reasons = []
        eligibility = scheme.get('eligibility', {})
        
        # 1. State Match
        p_state = profile.get('state')
        s_states = eligibility.get('states', [])
        is_national = not s_states or "All" in s_states or "National" in s_states
        
        if p_state and s_states and not is_national:
            if p_state.lower() in [s.lower() for s in s_states]:
                score += WEIGHTS['state']
                reasons.append(f"✓ {p_state} Resident")
            else:
                return 0.0, []  # Strict disqualification if explicitly wrong state
        elif is_national:
            score += WEIGHTS['state'] * 0.7
            reasons.append("✓ National Scheme")
        elif not p_state and s_states and not is_national:
            # User didn't provide state — give partial credit, don't disqualify
            score += WEIGHTS['state'] * 0.3

        # 2. Category Match
        p_cat = profile.get('category')
        s_cats = eligibility.get('categories', [])
        if p_cat and s_cats and "All" not in s_cats:
            if p_cat.lower() in [c.lower() for c in s_cats]:
                score += WEIGHTS['category']
                reasons.append(f"✓ {p_cat} Category")
            else:
                return 0.0, []
        elif not s_cats or "All" in s_cats:
            score += WEIGHTS['category'] * 0.5
        elif not p_cat and s_cats:
            # User didn't provide category — give partial credit
            score += WEIGHTS['category'] * 0.3

        # 3. Income Match
        p_inc = profile.get('income')
        max_inc = eligibility.get('maxIncome')
        if p_inc is not None and max_inc is not None:
            if p_inc <= max_inc:
                score += WEIGHTS['income']
                reasons.append("✓ Income Eligible")
            else:
                return 0.0, []
        elif max_inc is None:
            score += WEIGHTS['income'] * 0.5
        elif p_inc is None and max_inc is not None:
            # User didn't provide income — give partial credit
            score += WEIGHTS['income'] * 0.3

        # 4. Occupation Match — KEY for voice inputs like "I am a farmer"
        p_occ = profile.get('occupation')
        s_occs = eligibility.get('occupations', [])
        if p_occ and s_occs and "All" not in s_occs:
            if p_occ.lower() in [o.lower() for o in s_occs]:
                score += WEIGHTS['occupation']
                reasons.append(f"✓ {p_occ}")
            else:
                # User has an occupation but it doesn't match — small penalty but no disqualification
                score += WEIGHTS['occupation'] * 0.1
        elif p_occ and (not s_occs or "All" in s_occs):
            # Scheme is open to all occupations, user has one
            score += WEIGHTS['occupation'] * 0.5
            reasons.append("✓ Open to All Occupations")
        elif not p_occ:
            score += WEIGHTS['occupation'] * 0.3

        # 5. Education Match
        p_edu = profile.get('education')
        s_edus = eligibility.get('educationLevels', [])
        if p_edu and s_edus and "All" not in s_edus and "any" not in s_edus:
            if p_edu.lower() in [e.lower() for e in s_edus]:
                score += WEIGHTS['education']
                reasons.append(f"✓ {p_edu} Education")
            else:
                score += WEIGHTS['education'] * 0.1
        elif not s_edus or "All" in s_edus or "any" in s_edus:
            score += WEIGHTS['education'] * 0.5
        elif not p_edu:
            score += WEIGHTS['education'] * 0.3

        # 6. Age Match
        p_age = profile.get('age')
        min_age = eligibility.get('minAge')
        max_age = eligibility.get('maxAge')
        if p_age is not None:
            if min_age and p_age < min_age:
                return 0.0, []
            if max_age and p_age > max_age:
                return 0.0, []
            score += WEIGHTS['age']
            reasons.append("✓ Working Age" if 18 <= p_age <= 60 else "✓ Age Eligible")
        elif min_age is None and max_age is None:
            score += WEIGHTS['age'] * 0.5
        else:
            # User didn't provide age — give partial credit
            score += WEIGHTS['age'] * 0.3

        # 7. Gender Match
        p_gender = profile.get('gender')
        s_gender = eligibility.get('gender', 'all')
        if p_gender and s_gender and s_gender.lower() != 'all':
            if p_gender.lower() == s_gender.lower():
                score += WEIGHTS['gender']
                reasons.append(f"✓ {p_gender.capitalize()} Applicable")
            else:
                return 0.0, []
        elif not s_gender or s_gender.lower() == 'all':
            score += WEIGHTS['gender'] * 0.5
        elif not p_gender:
            score += WEIGHTS['gender'] * 0.3

        # 8. Keyword/Tag bonus — match user's occupation or details against scheme name, description, tags
        p_occ_lower = (p_occ or '').lower()
        scheme_name_lower = scheme.get('name', '').lower()
        scheme_desc_lower = scheme.get('description', '').lower()
        scheme_tags = [t.lower() for t in scheme.get('tags', [])]
        
        if p_occ_lower:
            if p_occ_lower in scheme_name_lower or p_occ_lower in scheme_desc_lower or p_occ_lower in scheme_tags:
                score += 15  # Strong keyword bonus
                if f"✓ Relevant to {p_occ.capitalize()}" not in reasons:
                    reasons.append(f"✓ Relevant to {p_occ.capitalize()}")

        # Base boost if at least one personal trait matched
        personal_reasons = [r for r in reasons if "National" not in r and "Open to All" not in r]
        if len(personal_reasons) > 0:
            score += 15
            
        return score, reasons

    def _get_ai_suggestions(self, profile: Dict[str, Any], top_schemes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not client or GEMINI_API_KEY == "mock-gemini-key":
            return []
            
        schemes_context = []
        for s in top_schemes:
            scheme_obj = s.get('scheme', {})
            schemes_context.append({
                "id": scheme_obj.get('id'),
                "name": scheme_obj.get('name'),
                "description": scheme_obj.get('description', '')[:200],
                "benefits": scheme_obj.get('benefits', '')
            })
            
        prompt = f"""
        You are an AI welfare scheme advisor.
        User Profile:
        {json.dumps(profile, indent=2)}
        
        Available Schemes:
        {json.dumps(schemes_context, indent=2)}
        
        Pick the top 3 best matching schemes for this user. For each, provide a personalized reason why it's a good fit based on their profile.
        
        Return ONLY a JSON array like this:
        [
          {{
             "schemeId": "id_here",
             "ai_reason": "Because you are a farmer..."
          }}
        ]
        """
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash-lite',
                contents=prompt
            )
            text = response.text.strip()
            if text.startswith("```json"): text = text[7:]
            if text.endswith("```"): text = text[:-3]
            return json.loads(text)
        except Exception as e:
            print(f"AI suggestion failed: {e}")
            return []

    def predict(self, profile: Dict[str, Any], schemes: List[Dict[str, Any]]) -> Dict[str, Any]:
        completeness, missing = self._calculate_completeness(profile)
            
        scored_schemes = []
        for scheme in schemes:
            score, reasons = self._calculate_score(profile, scheme)
            if score >= 20.0:  # Relaxed threshold to show matches even with partial profiles
                scored_schemes.append({
                    "schemeId": scheme['id'],
                    "schemeName": scheme.get('name', 'Unknown Scheme'),
                    "matchScore": round(min(score, 100), 1), # Cap at 100
                    "matchLevel": self._get_match_level(score),
                    "reasons": reasons,
                    "scheme": scheme
                })
        
        # Sort by highest score
        scored_schemes = sorted(scored_schemes, key=lambda x: x['matchScore'], reverse=True)

        categories = {
            "AI Top Picks": [],
            "Recommended For You": [],
            "State Schemes": [],
            "National Schemes": [],
            "Scholarships": [],
            "Farmer Welfare": [],
            "Employment Programs": [],
            "Women Welfare": [],
            "Healthcare": []
        }

        # AI Logic to suggest schemes
        if client and GEMINI_API_KEY != "mock-gemini-key" and len(scored_schemes) > 0:
            ai_sugs = self._get_ai_suggestions(profile, scored_schemes[:15])
            if ai_sugs:
                ai_dict = {x['schemeId']: x.get('ai_reason', '') for x in ai_sugs if 'schemeId' in x}
                for match in scored_schemes:
                    if match['schemeId'] in ai_dict:
                        ai_match = match.copy()
                        ai_match['reasons'] = [f"✨ AI Insight: {ai_dict[match['schemeId']]}"] + ai_match['reasons']
                        categories["AI Top Picks"].append(ai_match)

        # Take top 3 for generic recommendations
        categories["Recommended For You"] = scored_schemes[:3]

        for match in scored_schemes:
            scheme_obj = match.get('scheme', {})
            name_lower = scheme_obj.get('name', '').lower()
            desc_lower = scheme_obj.get('description', '').lower()
            eligibility = scheme_obj.get('eligibility', {})
            
            # State vs National
            states = eligibility.get('states', [])
            if not states or "All" in states or "National" in states:
                categories["National Schemes"].append(match)
            else:
                categories["State Schemes"].append(match)
                
            if 'scholarship' in name_lower or 'education' in name_lower or 'student' in name_lower:
                categories["Scholarships"].append(match)
                
            if 'farmer' in name_lower or 'kisan' in name_lower or 'krishi' in name_lower or 'agriculture' in desc_lower:
                categories["Farmer Welfare"].append(match)
                
            if 'employ' in name_lower or 'job' in name_lower or 'worker' in name_lower or 'skill' in name_lower or 'shramik' in name_lower:
                categories["Employment Programs"].append(match)
                
            if 'health' in name_lower or 'medical' in name_lower or 'ayushman' in name_lower or 'swasthya' in name_lower:
                categories["Healthcare"].append(match)
                
            if 'women' in name_lower or 'mahila' in name_lower or 'widow' in name_lower or 'maternity' in name_lower or 'girl' in name_lower:
                categories["Women Welfare"].append(match)

        # Remove empty categories
        filtered_categories = {k: v for k, v in categories.items() if len(v) > 0}

        return {
            "profileCompleteness": completeness,
            "missingFields": missing,
            "recommendations": filtered_categories
        }
