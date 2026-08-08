/**
 * Voice Profile Routes — Production-Grade Self-Sufficient Implementation
 * 
 * Pipeline:
 * 1. Attempt Python ML Service for translation + extraction
 * 2. If Python fails OR returns empty profile → Node.js fallback extraction
 * 3. Run scheme matching locally using realSchemesData (never depends on Python for this)
 * 4. Always return results — even partial matches — for any user input
 */
import { Router, Request, Response } from 'express';
import { realSchemesData } from '../store/schemes-data.js';

const router = Router();

// ─── Indian States Lookup ────────────────────────────────────────────────────
const INDIAN_STATES: Record<string, string> = {
  'andhra pradesh': 'Andhra Pradesh', 'arunachal pradesh': 'Arunachal Pradesh',
  'assam': 'Assam', 'bihar': 'Bihar', 'chhattisgarh': 'Chhattisgarh',
  'goa': 'Goa', 'gujarat': 'Gujarat', 'haryana': 'Haryana',
  'himachal pradesh': 'Himachal Pradesh', 'jharkhand': 'Jharkhand',
  'karnataka': 'Karnataka', 'kerala': 'Kerala', 'madhya pradesh': 'Madhya Pradesh',
  'maharashtra': 'Maharashtra', 'manipur': 'Manipur', 'meghalaya': 'Meghalaya',
  'mizoram': 'Mizoram', 'nagaland': 'Nagaland', 'odisha': 'Odisha',
  'punjab': 'Punjab', 'rajasthan': 'Rajasthan', 'sikkim': 'Sikkim',
  'tamil nadu': 'Tamil Nadu', 'telangana': 'Telangana', 'tripura': 'Tripura',
  'uttar pradesh': 'Uttar Pradesh', 'uttarakhand': 'Uttarakhand',
  'west bengal': 'West Bengal', 'delhi': 'Delhi', 'jammu and kashmir': 'Jammu and Kashmir',
};

// ─── Occupation Keywords ─────────────────────────────────────────────────────
const OCCUPATION_MAP: Record<string, string[]> = {
  'farmer':       ['farmer', 'kisan', 'krishi', 'agriculture', 'farming', 'kisaan', 'kheti'],
  'student':      ['student', 'studying', 'vidyarthi', 'padhai', 'college', 'school', 'university'],
  'laborer':      ['laborer', 'labourer', 'mazdoor', 'worker', 'shramik', 'daily wage', 'coolie'],
  'self-employed': ['self-employed', 'self employed', 'freelance', 'khud ka kaam'],
  'business':     ['business', 'businessman', 'merchant', 'vyapari', 'dukandaar', 'shopkeeper', 'shop'],
  'unemployed':   ['unemployed', 'jobless', 'berozgar', 'no job', 'without job'],
  'teacher':      ['teacher', 'shikshak', 'professor', 'lecturer'],
  'artisan':      ['artisan', 'craftsman', 'weaver', 'carpenter', 'blacksmith', 'potter', 'tailor'],
  'entrepreneur': ['entrepreneur', 'startup', 'founder'],
};

// ─── Profile Extraction from Text (Node.js Fallback) ─────────────────────────
function extractProfileFromText(text: string): Record<string, any> {
  const profile: Record<string, any> = {};
  const t = text.toLowerCase();

  // Age
  let ageMatch = t.match(/(\d{1,2})\s*(?:year|yr|sal|saal)/);
  if (!ageMatch) ageMatch = t.match(/(?:age|aged|i am|i'm|main)\s*(\d{1,2})/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age >= 1 && age <= 120) profile.age = age;
  }

  // State
  for (const [key, val] of Object.entries(INDIAN_STATES)) {
    if (t.includes(key)) { profile.state = val; break; }
  }

  // Occupation
  for (const [occ, keywords] of Object.entries(OCCUPATION_MAP)) {
    if (keywords.some(kw => t.includes(kw))) {
      profile.occupation = occ === 'self-employed' ? 'Self-Employed' : occ.charAt(0).toUpperCase() + occ.slice(1);
      break;
    }
  }

  // Income
  let incMatch = t.match(/(?:₹|rs\.?|rupees?|income|earn|salary)\s*(\d[\d,]*)\s*(lakh|lac|lakhs?)?/);
  if (!incMatch) incMatch = t.match(/(\d[\d,]*)\s*(lakh|lac|lakhs?)/);
  if (incMatch) {
    let amount = parseInt(incMatch[1].replace(/,/g, ''));
    if (incMatch[2] && incMatch[2].startsWith('la')) amount *= 100000;
    profile.income = amount;
  }

  // Gender
  if (['female', 'woman', 'girl', 'mahila', 'ladki', 'stri', 'aurat'].some(w => t.includes(w))) {
    profile.gender = 'female';
  } else if (['male', 'boy', 'man', 'ladka', 'purush'].some(w => t.includes(w))) {
    profile.gender = 'male';
  }

  // Category
  if (['scheduled caste', ' sc ', 'sc category', 'dalit'].some(w => t.includes(w))) profile.category = 'SC';
  else if (['scheduled tribe', ' st ', 'st category', 'adivasi', 'tribal'].some(w => t.includes(w))) profile.category = 'ST';
  else if ([' obc ', 'other backward', 'obc category'].some(w => t.includes(w))) profile.category = 'OBC';
  else if ([' ews ', 'economically weaker'].some(w => t.includes(w))) profile.category = 'EWS';
  else if (['general category', 'general caste'].some(w => t.includes(w))) profile.category = 'General';

  // Education
  if (['phd', 'doctorate', 'ph.d'].some(w => t.includes(w))) profile.education = 'PhD';
  else if (['postgraduate', 'post graduate', 'master', 'mba'].some(w => t.includes(w))) profile.education = 'Postgraduate';
  else if (['graduate', 'bachelor', 'b.tech', 'btech', 'degree'].some(w => t.includes(w))) profile.education = 'Graduate';
  else if (['12th', '12 pass', 'hsc', 'intermediate'].some(w => t.includes(w))) profile.education = '12th Pass';
  else if (['10th', '10 pass', 'ssc', 'matric'].some(w => t.includes(w))) profile.education = '10th Pass';

  return profile;
}

// ─── Scheme Matching Engine (Node.js Native) ─────────────────────────────────
function matchSchemes(profile: Record<string, any>, schemes: any[]) {
  const results: any[] = [];

  for (const scheme of schemes) {
    const elig = scheme.eligibility || {};
    let score = 0;
    const reasons: string[] = [];

    // --- State ---
    const sStates: string[] = elig.states || [];
    const isNational = !sStates.length || sStates.includes('All') || sStates.includes('National');
    if (profile.state && sStates.length && !isNational) {
      if (sStates.map((s: string) => s.toLowerCase()).includes(profile.state.toLowerCase())) {
        score += 25; reasons.push(`✓ ${profile.state} Resident`);
      } else { 
        continue; // STRICT FILTER: Scheme is state-specific and doesn't match user's state
      }
    } else if (isNational) {
      score += 18; reasons.push('✓ National Scheme');
    } else if (!profile.state && sStates.length && !isNational) {
      score += 8; // partial for unknown state
    }

    // --- Occupation (most important for voice like "I am a farmer") ---
    const sOccs: string[] = elig.occupations || [];
    if (profile.occupation && sOccs.length && !sOccs.includes('All')) {
      if (sOccs.map((o: string) => o.toLowerCase()).includes(profile.occupation.toLowerCase())) {
        score += 30; reasons.push(`✓ ${profile.occupation}`);
      } else {
        continue; // STRICT FILTER: Scheme is occupation-specific and doesn't match user's occupation
      }
    } else if (profile.occupation && (!sOccs.length || sOccs.includes('All'))) {
      score += 12; reasons.push('✓ Open to All Occupations');
    } else if (!profile.occupation) {
      score += 5;
    }

    // --- Income ---
    const maxInc = elig.maxIncome;
    if (profile.income != null && maxInc != null) {
      if (profile.income <= maxInc) { score += 15; reasons.push('✓ Income Eligible'); }
      else { continue; } // strict disqualification
    } else if (maxInc == null) {
      score += 8;
    } else {
      score += 5; // unknown income
    }

    // --- Age ---
    const minAge = elig.minAge;
    const maxAge = elig.maxAge;
    if (profile.age != null) {
      if (minAge && profile.age < minAge) { continue; }
      if (maxAge && profile.age > maxAge) { continue; }
      score += 10; reasons.push(profile.age >= 18 && profile.age <= 60 ? '✓ Working Age' : '✓ Age Eligible');
    } else if (!minAge && !maxAge) {
      score += 5;
    } else {
      score += 3;
    }

    // --- Gender ---
    const sGender = (elig.gender || 'all').toLowerCase();
    if (profile.gender && sGender !== 'all') {
      if (profile.gender.toLowerCase() === sGender) { score += 10; reasons.push(`✓ ${profile.gender} Applicable`); }
      else { continue; } // strict disqualification
    } else if (sGender === 'all') {
      score += 5;
    } else {
      score += 3;
    }

    // --- Category ---
    const sCats: string[] = elig.categories || [];
    if (profile.category && sCats.length && !sCats.includes('All')) {
      if (sCats.map((c: string) => c.toLowerCase()).includes(profile.category.toLowerCase())) {
        score += 15; reasons.push(`✓ ${profile.category} Category`);
      } else { continue; } // strict disqualification
    } else if (!sCats.length || sCats.includes('All')) {
      score += 5;
    } else {
      score += 3;
    }

    // --- Keyword Bonus: match occupation/text against scheme name, description, tags ---
    const occLower = (profile.occupation || '').toLowerCase();
    const nameLower = (scheme.name || '').toLowerCase();
    const descLower = (scheme.description || '').toLowerCase();
    const tags = (scheme.tags || []).map((t: string) => t.toLowerCase());
    
    if (occLower && (nameLower.includes(occLower) || descLower.includes(occLower) || tags.includes(occLower))) {
      score += 15;
      reasons.push(`✓ Directly Relevant to ${profile.occupation}`);
    }

    // Cap and classify
    score = Math.min(score, 100);
    
    if (score >= 15) {
      let matchLevel = 'Potential Match';
      if (score >= 80) matchLevel = 'Excellent Match';
      else if (score >= 60) matchLevel = 'Strong Match';
      else if (score >= 35) matchLevel = 'Relevant Match';

      results.push({
        schemeId: scheme.id,
        schemeName: scheme.name,
        matchScore: score,
        matchLevel,
        reasons,
        ministry: scheme.ministry,
        benefits: scheme.benefits,
        scheme
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.matchScore - a.matchScore);

  // Categorize
  const categories: Record<string, any[]> = {};

  // Top picks
  if (results.length > 0) {
    categories['Recommended For You'] = results.slice(0, 5);
  }

  // Occupation-specific
  const occLower = (profile.occupation || '').toLowerCase();
  if (occLower) {
    const occSpecific = results.filter(r => {
      const tags = (r.scheme?.tags || []).map((t: string) => t.toLowerCase());
      const name = (r.schemeName || '').toLowerCase();
      return name.includes(occLower) || tags.includes(occLower) || 
             (r.scheme?.eligibility?.occupations || []).map((o: string) => o.toLowerCase()).includes(occLower);
    });
    if (occSpecific.length > 0) {
      const label = `${profile.occupation} Schemes`;
      categories[label] = occSpecific.slice(0, 5);
    }
  }

  // State-specific
  if (profile.state) {
    const stateSchemes = results.filter(r => {
      const states = r.scheme?.eligibility?.states || [];
      return states.map((s: string) => s.toLowerCase()).includes(profile.state.toLowerCase());
    });
    if (stateSchemes.length > 0) {
      categories[`${profile.state} Schemes`] = stateSchemes;
    }
  }

  // National
  const national = results.filter(r => {
    const states = r.scheme?.eligibility?.states || [];
    return !states.length || states.includes('All') || states.includes('National');
  });
  if (national.length > 0) {
    categories['National Schemes'] = national.slice(0, 5);
  }

  return categories;
}

// ─── Profile Completeness ────────────────────────────────────────────────────
function getCompleteness(profile: Record<string, any>): number {
  const fields = ['age', 'state', 'income', 'category', 'occupation', 'gender'];
  const filled = fields.filter(f => profile[f] != null && profile[f] !== '').length;
  return Math.round((filled / fields.length) * 100);
}

// ─── Merge Profiles (Python + Node fallback) ─────────────────────────────────
function mergeProfiles(pythonProfile: Record<string, any>, nodeProfile: Record<string, any>): Record<string, any> {
  const merged: Record<string, any> = { ...pythonProfile };
  for (const [key, value] of Object.entries(nodeProfile)) {
    if (value != null && value !== '' && (merged[key] == null || merged[key] === '')) {
      merged[key] = value;
    }
  }
  return merged;
}

// ─── Main Route ──────────────────────────────────────────────────────────────
router.post('/voice-profile', async (req: Request, res: Response) => {
  try {
    const { language, text } = req.body;
    const PYTHON_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
    
    let pythonProfile: Record<string, any> = {};
    let translatedText = text || '';

    // 1. Attempt Python ML Service for translation + extraction
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
      
      const pythonResponse = await fetch(`${PYTHON_URL}/voice-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text || '', language: language || 'en' }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      
      if (pythonResponse.ok) {
        const extractedData = await pythonResponse.json();
        pythonProfile = extractedData.profile || {};
        translatedText = extractedData.translatedText || text || '';
      }
    } catch (pyErr: any) {
      console.warn('[Voice] Python ML Service unavailable, using Node.js fallback:', pyErr.message);
    }

    // 1.5 If Python didn't translate (translatedText unchanged), use Gemini to translate
    if (translatedText === (text || '') && text && !/^[a-zA-Z0-9\s.,!?'"₹$%&()\-:;]+$/.test(text)) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const key = process.env.GEMINI_API_KEY;
        if (key && key !== 'your_gemini_api_key_here') {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
          const result = await model.generateContent(
            `Translate this text to English. Only return the English translation, nothing else: "${text}"`
          );
          const translated = result.response.text().trim();
          if (translated) translatedText = translated;
        }
      } catch (translateErr: any) {
        console.warn('[Voice] Gemini translation fallback failed:', translateErr.message);
      }
    }

    // 2. Node.js fallback extraction from translated text
    const nodeProfile = extractProfileFromText(translatedText);

    // 3. Merge: Python profile takes priority, Node fills gaps
    const finalProfile = mergeProfiles(pythonProfile, nodeProfile);

    // 4. Calculate completeness
    const completeness = getCompleteness(finalProfile);

    // 5. Run scheme matching LOCALLY (never depends on Python for this)
    const recommendations = matchSchemes(finalProfile, realSchemesData);

    // 6. Return response
    res.json({
      originalText: text,
      translatedText,
      profile: finalProfile,
      profileCompleteness: completeness,
      recommendations
    });

  } catch (error: any) {
    console.error('[Voice Profile Error]', error.message);
    
    // Ultimate fallback: even on total failure, try to extract and return something
    try {
      const { text } = req.body;
      const profile = extractProfileFromText(text || '');
      const completeness = getCompleteness(profile);
      const recommendations = matchSchemes(profile, realSchemesData);
      
      res.json({
        originalText: text,
        translatedText: text,
        profile,
        profileCompleteness: completeness,
        recommendations
      });
    } catch {
      res.status(500).json({ error: "Failed to process voice profile" });
    }
  }
});

export default router;
