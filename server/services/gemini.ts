import { GoogleGenerativeAI } from '@google/generative-ai';
import { Scheme, User, ChatMessage, AIRecommendation, EligibilityResult, CitizenProfile, CitizenReport, EligibilityDimension } from '../types/index.js';
import { scoreSchemeForUser, scoreWithBreakdown } from '../utils/helpers.js';

let genAI: GoogleGenerativeAI | null = null;
const summaryCache = new Map<string, string>();

function getModel() {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
      console.warn('[GEMINI] No API key configured — using fallback logic');
      return null;
    }
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
}

const langMap: Record<string, string> = {
  'en-IN': 'English',
  'hi-IN': 'Hindi',
  'te-IN': 'Telugu',
  'ta-IN': 'Tamil',
  'kn-IN': 'Kannada',
  'mr-IN': 'Marathi',
  'gu-IN': 'Gujarati',
  'bn-IN': 'Bengali',
  'ml-IN': 'Malayalam',
  'pa-IN': 'Punjabi',
  'or-IN': 'Odia',
};

/**
 * Pre-filters schemes using the hard-reject engine before passing to Gemini.
 * This prevents Gemini from ever hallucinating a female-only scheme for a male user.
 */
function preFilterSchemes(schemes: Scheme[], userProfile: Partial<User> | CitizenProfile): Array<{ scheme: Scheme; algoScore: number; breakdown: EligibilityDimension[] }> {
  return schemes
    .map(s => {
      const { score, breakdown } = scoreWithBreakdown(s, userProfile);
      return { scheme: s, algoScore: score, breakdown };
    })
    .filter(({ algoScore }) => algoScore > 0) // Remove all hard-rejected schemes
    .sort((a, b) => b.algoScore - a.algoScore);
}

export async function getSchemeRecommendations(
  userProfile: Partial<User>,
  allSchemes: Scheme[],
  lang = 'en-IN',
  query?: string
): Promise<AIRecommendation[]> {
  const model = getModel();
  const language = langMap[lang] || 'English';

  // Step 1: Pre-filter using hard-reject rule engine
  const eligible = preFilterSchemes(allSchemes, userProfile);

  if (eligible.length === 0) {
    return [];
  }

  // Use the deterministic algorithmic scores directly
  return eligible.map(({ scheme, algoScore, breakdown }) => ({
    schemeId: scheme.id,
    matchScore: algoScore,
    reason: generateFallbackReason(scheme, userProfile),
    breakdown,
  }));
}

function generateFallbackReason(scheme: Scheme, user: Partial<User> | CitizenProfile): string {
  const parts: string[] = [];
  if (user.occupation && scheme.eligibility.occupations?.some(o => (user.occupation as string).toLowerCase().includes(o.toLowerCase()))) {
    parts.push(`your ${user.occupation} occupation matches`);
  }
  if (user.category && scheme.eligibility.categories?.some(c => c.toLowerCase() === user.category!.toLowerCase())) {
    parts.push(`${user.category} category is eligible`);
  }
  const userIncome = (user as any).annualIncome ?? (user as any).income;
  if (userIncome && scheme.eligibility.maxIncome && userIncome <= scheme.eligibility.maxIncome) {
    parts.push('your income qualifies');
  }
  if (user.state && scheme.eligibility.states?.some(s => s.toLowerCase() === user.state!.toLowerCase())) {
    parts.push(`available in ${user.state}`);
  }
  if (parts.length > 0) {
    return `Based on your profile: ${parts.join(', ')}.`;
  }
  return 'This scheme matches your general eligibility criteria.';
}

/**
 * Generates a full Personalized Citizen Report with top matches, partial matches, and document guide.
 */
export async function generateCitizenReport(
  userProfile: CitizenProfile,
  allSchemes: Scheme[]
): Promise<CitizenReport> {
  const model = getModel();

  // Pre-filter using hard-reject engine
  const eligible = preFilterSchemes(allSchemes, userProfile);
  
  // Partial matches: schemes that scored 0 but only because of soft criteria (show near-miss)
  const allScored = allSchemes.map(s => ({
    scheme: s,
    ...scoreWithBreakdown(s, userProfile)
  }));
  const partialMatches = allScored
    .filter(({ score }) => score === 0)
    .filter(({ breakdown }) => {
      // Only include if the ONLY failing dimension is occupation (soft reject)
      const failedDims = breakdown.filter(d => !d.pass);
      return failedDims.length === 1 && failedDims[0].label === 'Occupation Eligibility';
    })
    .slice(0, 3);

  // Profile Summary from Gemini
  let profileSummary = `${userProfile.age ? `${userProfile.age}-year-old` : 'A'} ${userProfile.gender || ''} ${userProfile.occupation || 'citizen'} from ${userProfile.state || 'India'}${userProfile.category ? ` (${userProfile.category})` : ''}.`;

  if (model) {
    try {
      const topSchemeNames = eligible.slice(0, 5).map(e => e.scheme.name).join(', ');
      const prompt = `In 2 sentences, write a personalized profile summary for a citizen and their top welfare scheme matches. Be warm and encouraging.
      
Profile: ${JSON.stringify(userProfile)}
Top Matching Schemes: ${topSchemeNames}

Return ONLY the 2-sentence summary text, nothing else.`;
      
      const result = await model.generateContent(prompt);
      profileSummary = result.response.text().trim();
    } catch (e) {
      // Use the default summary
    }
  }

  return {
    profile: userProfile,
    profileSummary,
    topMatches: eligible.slice(0, 8).map(({ scheme, algoScore, breakdown }) => ({
      scheme,
      matchScore: algoScore,
      reason: generateFallbackReason(scheme, userProfile),
      breakdown,
      documents: scheme.documents || [],
    })),
    partialMatches: partialMatches.map(({ scheme, breakdown }) => ({
      scheme,
      matchScore: 0,
      missingCriteria: breakdown.find(d => !d.pass)?.detail || 'Some criteria do not match',
    })),
    generatedAt: new Date().toISOString(),
  };
}

export async function chatWithAssistant(
  userMessage: string,
  userProfile: Partial<User>,
  conversationHistory: ChatMessage[],
  allSchemes: Scheme[]
): Promise<string> {
  const model = getModel();

  if (model) {
    try {
      // Pre-filter schemes for this user before passing to the chat model
      const eligible = preFilterSchemes(allSchemes, userProfile);
      const schemeSummaries = eligible.slice(0, 20).map(({ scheme: s }) =>
        `- ${s.name} (${s.ministry}): ${s.benefits}. Apply: ${s.applyLink}`
      ).join('\n');

      const systemPrompt = `You are SchemeSage Assistant, a helpful welfare advisor for Indian citizens. You help citizens find government schemes they're eligible for, explain benefits, and guide applications.

Be warm, helpful, and speak in simple Indian English. Keep responses concise (2-4 paragraphs max).

Eligible Schemes for This Citizen (pre-filtered for eligibility):
${schemeSummaries}

Citizen's Profile:
- Name: ${userProfile.fullName || 'Citizen'}
- Age: ${userProfile.age || 'not set'}
- Gender: ${userProfile.gender || 'not set'}
- Occupation: ${userProfile.occupation || 'not set'}
- Annual Income: ₹${userProfile.annualIncome || 'not set'}
- State: ${userProfile.state || 'not set'}
- Category: ${userProfile.category || 'not set'}

Always suggest specific eligible schemes by name. If the user asks about eligibility, you have already pre-validated these schemes for them.`;

      const contents = [
        { role: 'user' as const, parts: [{ text: systemPrompt + '\n\nPlease acknowledge and respond to the user.' }] },
        { role: 'model' as const, parts: [{ text: 'I understand. I am SchemeSage Assistant and will help the citizen with government welfare schemes.' }] },
        ...conversationHistory.map(m => ({
          role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.content }],
        })),
        { role: 'user' as const, parts: [{ text: userMessage }] },
      ];

      const result = await model.generateContent({ contents });
      return result.response.text();
    } catch (err) {
      console.warn('[GEMINI] Chat failed, using fallback:', (err as Error).message);
    }
  }

  // Fallback
  const lowerMsg = userMessage.toLowerCase();
  if (lowerMsg.includes('eligible') || lowerMsg.includes('eligibility')) {
    return "Based on your profile, I'd recommend using the Scheme Finder to filter schemes by your age, income, and category. The AI recommendation engine will show you all schemes you're potentially eligible for!";
  }
  if (lowerMsg.includes('apply') || lowerMsg.includes('application')) {
    return "To apply for a scheme:\n1. Find the scheme in the Discover section\n2. Click Details to see the full information\n3. Check the required documents list\n4. Click Apply Now to visit the official application portal\n\nMake sure you have all required documents ready before applying!";
  }
  return "I'm here to help you find government welfare schemes! Ask me about which schemes you're eligible for, how to apply, or what documents you need.";
}

export async function summarizeScheme(scheme: Scheme): Promise<string> {
  if (summaryCache.has(scheme.id)) {
    return summaryCache.get(scheme.id)!;
  }

  const model = getModel();

  if (model) {
    try {
      const prompt = `Summarize this Indian government welfare scheme in 2-3 simple sentences that a common citizen can easily understand. Include who it's for and what they get.

Scheme: ${scheme.name}
Ministry: ${scheme.ministry}
Description: ${scheme.description}
Benefits: ${scheme.benefits}
Eligibility: Age ${scheme.eligibility.minAge || 'any'}-${scheme.eligibility.maxAge || 'any'}, Income max ₹${scheme.eligibility.maxIncome || 'no limit'}, Gender: ${scheme.eligibility.gender || 'all'}, Occupations: ${(scheme.eligibility.occupations || []).join(', ') || 'all'}

Return ONLY the summary text, nothing else.`;

      const result = await model.generateContent(prompt);
      const summary = result.response.text().trim();
      summaryCache.set(scheme.id, summary);
      return summary;
    } catch (err) {
      console.warn('[GEMINI] Summary failed, using fallback:', (err as Error).message);
    }
  }

  return scheme.description;
}

// ─── Score Label Helper ───────────────────────────────────────────────────────
export function getMatchLabel(score: number): string {
  if (score >= 95) return 'Excellent Match';
  if (score >= 85) return 'Strong Match';
  if (score >= 70) return 'Relevant Match';
  if (score >= 50) return 'Possible Match';
  return 'Low Match';
}

// ─── Profile Completeness Engine ─────────────────────────────────────────────
export function calculateProfileCompleteness(profile: CitizenProfile): {
  completeness: number;
  filledFields: string[];
  missingFields: string[];
} {
  const keyFields: Array<{ key: keyof CitizenProfile; label: string }> = [
    { key: 'age', label: 'Age' },
    { key: 'gender', label: 'Gender' },
    { key: 'state', label: 'State' },
    { key: 'occupation', label: 'Occupation' },
    { key: 'annualIncome', label: 'Annual Income' },
    { key: 'category', label: 'Category (SC/ST/OBC/General)' },
    { key: 'educationLevel', label: 'Education Level' },
    { key: 'maritalStatus', label: 'Marital Status' },
    { key: 'ruralUrban', label: 'Area Type (Rural/Urban)' },
  ];

  const filled: string[] = [];
  const missing: string[] = [];

  for (const { key, label } of keyFields) {
    const val = profile[key];
    const hasValue = val !== null && val !== undefined && val !== '' && val !== 0;
    if (hasValue) filled.push(label);
    else missing.push(label);
  }

  const completeness = Math.round((filled.length / keyFields.length) * 100);
  return { completeness, filledFields: filled, missingFields: missing };
}

// ─── Smart Citizen Report ─────────────────────────────────────────────────────
export interface SmartSchemeMatch {
  scheme: Scheme;
  matchScore: number;
  matchLabel: string;
  reason: string;
  whyRecommended: string[];   // Bullet points e.g. ["✓ Telangana Resident", "✓ SC Category"]
  breakdown: EligibilityDimension[];
  documents: string[];
  documentReadiness: number;  // 0-100 based on profile completeness
}

export interface SmartCitizenReport {
  profileSummary: string;
  profileCompleteness: number;
  recommendationLevel: string;
  missingFields: string[];
  topMatches: SmartSchemeMatch[];
  partialMatches: Array<{
    scheme: Scheme;
    matchScore: number;
    missingCriteria: string;
  }>;
  agentEscalation: boolean;
  generatedAt: string;
}

export async function generateSmartCitizenReport(
  userProfile: CitizenProfile,
  allSchemes: Scheme[]
): Promise<SmartCitizenReport> {
  const model = getModel();

  // Step 1: Profile completeness
  const { completeness, missingFields } = calculateProfileCompleteness(userProfile);

  // Step 2: Score all schemes
  const allScored = allSchemes.map(s => ({
    scheme: s,
    ...scoreWithBreakdown(s, userProfile)
  }));

  // Step 3: Top matches (score >= 50, above "Do Not Recommend" threshold)
  const eligible = allScored
    .filter(({ score }) => score >= 50)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  // Step 4: Partial matches (scored 0 but only failed occupation — near misses)
  const partialMatches = allScored
    .filter(({ score }) => score === 0)
    .filter(({ breakdown }) => {
      const failed = breakdown.filter(d => !d.pass);
      return failed.length === 1 && failed[0].label === 'Occupation Eligibility';
    })
    .slice(0, 3);

  // Step 5: Build "why recommended" from breakdown (no Gemini needed for this)
  const buildWhyRecommended = (breakdown: EligibilityDimension[]): string[] => {
    return breakdown
      .filter(d => d.pass)
      .map(d => `✓ ${d.detail.replace(' ✓', '')}`);
  };

  // Step 6: Document readiness estimate (based on how complete the profile is)
  const documentReadiness = Math.min(100, Math.round(completeness * 0.8));

  // Step 7: Generate profile summary + per-scheme Gemini reasons (single batch call)
  let profileSummary = `${userProfile.age ? `${userProfile.age}-year-old` : 'A'} ${userProfile.gender || ''} ${userProfile.occupation || 'citizen'} from ${userProfile.state || 'India'}${userProfile.category ? ` (${userProfile.category})` : ''}.`;

  let schemeReasonMap: Record<string, string> = {};

  if (model && eligible.length > 0) {
    try {
      const schemeList = eligible.slice(0, 8).map((e, i) =>
        `${i + 1}. ID: ${e.scheme.id} | Name: ${e.scheme.name} | Ministry: ${e.scheme.ministry} | Benefits: ${e.scheme.benefits} | Score: ${e.score}/100`
      ).join('\n');

      const profileDesc = [
        userProfile.age ? `Age: ${userProfile.age}` : '',
        userProfile.gender ? `Gender: ${userProfile.gender}` : '',
        userProfile.state ? `State: ${userProfile.state}` : '',
        userProfile.occupation ? `Occupation: ${userProfile.occupation}` : '',
        userProfile.annualIncome ? `Annual Income: ₹${userProfile.annualIncome.toLocaleString('en-IN')}` : '',
        userProfile.category ? `Category: ${userProfile.category}` : '',
        userProfile.educationLevel ? `Education: ${userProfile.educationLevel}` : '',
        userProfile.maritalStatus ? `Marital Status: ${userProfile.maritalStatus}` : '',
      ].filter(Boolean).join(', ');

      const prompt = `You are a professional Indian Government Welfare Scheme Advisor helping a citizen understand why specific schemes are recommended for them.

Citizen Profile: ${profileDesc}

Recommended Schemes (already passed eligibility screening):
${schemeList}

Tasks:
1. Write a warm, professional 2-sentence profile summary for this citizen (what their situation is, what opportunities they have).
2. For EACH scheme, write a concise 1-sentence explanation of WHY it is specifically recommended for this citizen (mention their specific matching attributes like state, category, occupation, income).

Return ONLY valid JSON:
{
  "profileSummary": "<2 sentence warm summary>",
  "reasons": {
    "<schemeId1>": "<1 sentence why recommended for this specific citizen>",
    "<schemeId2>": "<1 sentence why recommended for this specific citizen>"
  }
}`;

      const result = await model.generateContent(prompt);
      let text = result.response.text().trim();
      text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
      const parsed = JSON.parse(text);

      if (parsed.profileSummary) profileSummary = parsed.profileSummary;
      if (parsed.reasons) schemeReasonMap = parsed.reasons;

    } catch (err) {
      console.warn('[Smart Report Gemini Error]:', (err as Error).message);
    }
  }

  // Step 8: Assemble final report
  const topMatches: SmartSchemeMatch[] = eligible.slice(0, 8).map(({ scheme, score, breakdown }) => ({
    scheme,
    matchScore: score,
    matchLabel: getMatchLabel(score),
    reason: schemeReasonMap[scheme.id] || generateFallbackReason(scheme, userProfile),
    whyRecommended: buildWhyRecommended(breakdown),
    breakdown,
    documents: scheme.documents || [],
    documentReadiness,
  }));

  let recommendationLevel = "Level 1";
  const filledCount = calculateProfileCompleteness(userProfile).filledFields.length;
  if (filledCount >= 4) recommendationLevel = "Level 3";
  else if (filledCount >= 2) recommendationLevel = "Level 2";
  if (filledCount >= 7) recommendationLevel = "Level 4";

  return {
    profileSummary,
    profileCompleteness: completeness,
    recommendationLevel,
    missingFields,
    topMatches,
    partialMatches: partialMatches.map(({ scheme, breakdown }) => ({
      scheme,
      matchScore: 0,
      missingCriteria: breakdown.find(d => !d.pass)?.detail || 'Some criteria do not match',
    })),
    agentEscalation: completeness < 60 || topMatches.length === 0,
    generatedAt: new Date().toISOString(),
  };
}

export async function checkEligibility(
  userProfile: Partial<User>,
  scheme: Scheme
): Promise<EligibilityResult> {
  // Always run the rule-based engine first for ground truth
  const { score, breakdown } = scoreWithBreakdown(scheme, userProfile);

  // Return rule-based eligibility result directly without Gemini
  return {
    eligible: score > 20,
    confidence: score > 60 ? 'high' : score > 30 ? 'medium' : 'low',
    explanation: score > 20
      ? `Based on your profile, you meet the key eligibility criteria for ${scheme.name}.`
      : `You do not meet the eligibility requirements. Check the breakdown below for details.`,
    breakdown,
  };
}

// ─── Voice Profile Extraction ──────────────────────────────────────────────────
export async function extractVoiceProfile(transcript: string, lang: string) {
  const model = getModel();
  if (!model) throw new Error("Gemini AI is not configured.");
  
  const prompt = `You are an AI extracting a citizen's profile from a voice transcript.
The transcript might be in Indian languages. Translate it to English if needed.

Transcript: "${transcript}"

Extract the following into a JSON object:
- age (number)
- gender (Male/Female/Other)
- state (string)
- occupation (string)
- annualIncome (number)
- category (General/OBC/SC/ST)
- educationLevel (string)
- maritalStatus (string)

If a field is not mentioned, do not include it.

Return ONLY valid JSON like:
{
  "translatedText": "I am a 25 year old farmer from Assam...",
  "profile": {
    "age": 25,
    "occupation": "farmer",
    "state": "Assam"
  }
}`;

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(text);
}

