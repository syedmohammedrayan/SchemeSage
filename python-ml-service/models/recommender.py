import numpy as np
from typing import List, Dict, Any

class SchemeRecommender:
    def __init__(self):
        # In a real scenario, you would load your SentenceTransformer model here
        # e.g., self.model = SentenceTransformer('all-MiniLM-L6-v2')
        print("Initialized SchemeRecommender")

    def _calculate_score(self, profile: Dict[str, Any], scheme: Dict[str, Any]) -> float:
        """
        Calculates a baseline match score between a user profile and a scheme.
        """
        score = 0.5 # Base score
        eligibility = scheme.get('eligibility', {})
        
        # 1. Income Check
        if profile.get('income') is not None and 'maxIncome' in eligibility:
            if profile['income'] <= eligibility['maxIncome']:
                score += 0.2
            else:
                return 0.0 # Strict disqualification
        
        # 2. Age Check
        age = profile.get('age')
        if age is not None:
            if 'minAge' in eligibility and age < eligibility['minAge']:
                return 0.0
            if 'maxAge' in eligibility and age > eligibility['maxAge']:
                return 0.0
            score += 0.1

        # 3. State Check
        if profile.get('state') and 'states' in eligibility:
            if profile['state'] in eligibility['states']:
                score += 0.1
            elif eligibility['states'] and profile['state'] not in eligibility['states']:
                return 0.0
                
        # 4. Gender Check
        if profile.get('gender') and 'gender' in eligibility:
            if eligibility['gender'] != 'all' and profile['gender'].lower() != eligibility['gender'].lower():
                return 0.0
            score += 0.05
            
        return min(score, 1.0)

    def predict(self, profile: Dict[str, Any], schemes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Takes a profile and a list of schemes, returns the top recommendations.
        """
        results = []
        for scheme in schemes:
            score = self._calculate_score(profile, scheme)
            if score > 0.0:
                results.append({
                    "schemeId": scheme['id'],
                    "matchScore": round(score * 100, 1),
                    "reason": "Based on your demographic and financial profile."
                })
        
        # Sort by highest score
        results = sorted(results, key=lambda x: x['matchScore'], reverse=True)
        return results
