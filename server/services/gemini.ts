import { GoogleGenerativeAI } from '@google/generative-ai';
import { Scheme, User, ChatMessage, AIRecommendation, EligibilityResult } from '../types/index.js';
import { scoreSchemeForUser } from '../utils/helpers.js';

let genAI: GoogleGenerativeAI | null = null;
const summaryCache = new Map<string, string>();

function getModel(withTools = false) {
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_api_key_here') {
      console.warn('[GEMINI] No API key configured — using fallback logic');
      return null;
    }
    genAI = new GoogleGenerativeAI(key);
  }
  
  const options: any = { model: 'gemini-2.0-flash' };
  
  if (withTools) {
    options.tools = [{
      functionDeclarations: [
        {
          name: "search_schemes",
          description: "Search for government welfare schemes by keywords or phrases.",
          parameters: {
            type: "OBJECT",
            properties: {
              query: { type: "STRING", description: "Search query, e.g. 'agriculture', 'education', 'women'" }
            },
            required: ["query"]
          }
        },
        {
          name: "get_eligibility_and_benefits",
          description: "Retrieve specific eligibility rules and detailed benefits for a scheme by its name or ID.",
          parameters: {
            type: "OBJECT",
            properties: {
              schemeId: { type: "STRING", description: "The unique ID or name of the scheme." }
            },
            required: ["schemeId"]
          }
        },
        {
          name: "check_user_profile_match",
          description: "Checks how well the user profile matches a specific scheme.",
          parameters: {
            type: "OBJECT",
            properties: {
              schemeId: { type: "STRING", description: "The ID of the scheme to match against." }
            },
            required: ["schemeId"]
          }
        }
      ]
    }];
  }

  return genAI.getGenerativeModel(options);
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

export async function getSchemeRecommendations(
  userProfile: Partial<User>,
  allSchemes: Scheme[],
  lang = 'en-IN',
  query?: string
): Promise<AIRecommendation[]> {
  const model = getModel();
  const language = langMap[lang] || 'English';

  if (model) {
    try {
      const schemeSummaries = allSchemes.map(s =>
        `ID: ${s.id} | Name: ${s.name} | Ministry: ${s.ministry} | Benefits: ${s.benefits} | Eligibility: age ${s.eligibility.minAge || 'any'}-${s.eligibility.maxAge || 'any'}, income max ${s.eligibility.maxIncome || 'any'}, gender: ${s.eligibility.gender || 'all'}, categories: ${(s.eligibility.categories || []).join(',') || 'all'}, occupations: ${(s.eligibility.occupations || []).join(',') || 'all'}`
      ).join('\n');

      const prompt = `You are an Indian government welfare scheme matching expert. Given a citizen's profile, their specific situation/request (which may be in ${language} or English), and available schemes, return the best matching schemes ranked by relevance.

IMPORTANT LANGUAGE INSTRUCTION:
- You MUST write the "reason" field ONLY in ${language}.
- Do NOT use English if ${language} is not English.
- If you respond in any other language, the answer is incorrect.

Citizen's Profile:
- Age: ${userProfile.age || 'not specified'}
- Gender: ${userProfile.gender || 'not specified'}
- Occupation: ${userProfile.occupation || 'not specified'}
- Annual Income: ₹${userProfile.annualIncome || 'not specified'}
- State: ${userProfile.state || 'not specified'}
- Category: ${userProfile.category || 'not specified'}

Citizen's Situation/Description (in ${language} or English):
"${query || 'Looking for suitable welfare schemes'}"

Available Schemes (in English):
${schemeSummaries}

Return ONLY a JSON array with NO extra text, like:
[{"schemeId": "s1", "matchScore": 95, "reason": "<reason in ${language}>"}]

Rules:
- matchScore should be 0-100 based on how well the user matches the scheme criteria and their specific situation.
- Use your advanced language understanding to match the ${language} situation description against the English scheme criteria.
- Include ALL schemes, even low matches
- reason must be 1 short sentence in ${language} explaining why this scheme is a good match for their profile and situation
- If a scheme explicitly excludes the user (wrong gender, too old, etc), give score 0-10`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as AIRecommendation[];
        return parsed.sort((a, b) => b.matchScore - a.matchScore);
      }
    } catch (err) {
      console.warn('[GEMINI] Recommendation failed, using fallback:', (err as Error).message);
    }
  }

  // Fallback: algorithmic scoring
  return allSchemes
    .map(scheme => ({
      schemeId: scheme.id,
      matchScore: scoreSchemeForUser(scheme, userProfile),
      reason: generateFallbackReason(scheme, userProfile),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

function generateFallbackReason(scheme: Scheme, user: Partial<User>): string {
  const parts: string[] = [];
  if (user.occupation && scheme.eligibility.occupations?.some(o => o.toLowerCase() === user.occupation?.toLowerCase())) {
    parts.push(`your ${user.occupation} occupation matches`);
  }
  if (user.category && scheme.eligibility.categories?.some(c => c.toLowerCase() === user.category?.toLowerCase())) {
    parts.push(`${user.category} category is eligible`);
  }
  if (user.annualIncome && scheme.eligibility.maxIncome && user.annualIncome <= scheme.eligibility.maxIncome) {
    parts.push('your income qualifies');
  }
  if (parts.length > 0) {
    return `Based on your profile: ${parts.join(', ')}.`;
  }
  return 'This scheme may be relevant based on general eligibility criteria.';
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
      const schemeSummaries = allSchemes.map(s =>
        `- ${s.name} (${s.ministry}): ${s.benefits}. Eligibility: age ${s.eligibility.minAge || 'any'}-${s.eligibility.maxAge || 'any'}, income max ₹${s.eligibility.maxIncome || 'any'}, gender: ${s.eligibility.gender || 'all'}, occupations: ${(s.eligibility.occupations || []).join(', ') || 'all'}. Apply: ${s.applyLink}`
      ).join('\n');

      const systemPrompt = `You are WelfareBot, a helpful AI assistant for the Indian Government Welfare Scheme Navigator app called "Scheme Sage". You help citizens find government schemes they're eligible for, explain scheme benefits, guide them through applications, and answer questions about eligibility.

Be warm, helpful, and speak in simple language. Use Indian English. Keep responses concise (2-4 paragraphs max).

Available Schemes:
${schemeSummaries}

User's Profile:
- Name: ${userProfile.fullName || 'not set'}
- Age: ${userProfile.age || 'not set'}
- Gender: ${userProfile.gender || 'not set'}
- Occupation: ${userProfile.occupation || 'not set'}
- Annual Income: ₹${userProfile.annualIncome || 'not set'}
- State: ${userProfile.state || 'not set'}
- Category: ${userProfile.category || 'not set'}

Always suggest specific schemes by name when relevant. If the user asks about eligibility, check their profile against scheme criteria. Be encouraging and helpful.`;

      const contents = [
        { role: 'user' as const, parts: [{ text: systemPrompt + '\n\nPlease acknowledge and respond to the user.' }] },
        { role: 'model' as const, parts: [{ text: 'I understand. I am WelfareBot and will help the user with government welfare schemes.' }] },
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
    return "Based on your profile, I'd recommend using the **Scheme Finder** tab to filter schemes by your age, income, and category. The filters will show you all schemes you're potentially eligible for. You can also click on any scheme card to see detailed eligibility criteria.";
  }
  if (lowerMsg.includes('apply') || lowerMsg.includes('application')) {
    return "To apply for a scheme:\n1. Go to the **Scheme Finder** tab and find the scheme\n2. Click **Details** to see the full information\n3. Check the required documents list\n4. Click **Apply Now** to visit the official application portal\n\nMake sure you have all required documents ready before applying!";
  }
  if (lowerMsg.includes('document') || lowerMsg.includes('upload')) {
    return "You can upload your documents in the **Profile** tab. We support Aadhaar Card, Income Certificate, Caste Certificate, and Address Proof. Having these ready will speed up your scheme applications.";
  }
  return "I'm here to help you find government welfare schemes! You can ask me about:\n- Which schemes you're eligible for\n- How to apply for a specific scheme\n- What documents you need\n- Details about any scheme\n\nTry asking something like \"What schemes am I eligible for?\" or \"Tell me about PM Kisan\".";
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

export async function checkEligibility(
  userProfile: Partial<User>,
  scheme: Scheme
): Promise<EligibilityResult> {
  const model = getModel();

  if (model) {
    try {
      const prompt = `Analyze whether this citizen is eligible for this Indian government scheme. Return ONLY a JSON object.

Citizen Profile:
- Age: ${userProfile.age || 'not specified'}
- Gender: ${userProfile.gender || 'not specified'}
- Occupation: ${userProfile.occupation || 'not specified'}
- Annual Income: ₹${userProfile.annualIncome || 'not specified'}
- State: ${userProfile.state || 'not specified'}
- Category: ${userProfile.category || 'not specified'}

Scheme: ${scheme.name}
Eligibility Criteria:
- Min Age: ${scheme.eligibility.minAge || 'none'}
- Max Age: ${scheme.eligibility.maxAge || 'none'}
- Max Income: ₹${scheme.eligibility.maxIncome || 'no limit'}
- Gender: ${scheme.eligibility.gender || 'all'}
- Categories: ${(scheme.eligibility.categories || []).join(', ') || 'all'}
- Occupations: ${(scheme.eligibility.occupations || []).join(', ') || 'all'}

Return ONLY this JSON:
{"eligible": true/false, "confidence": "high"/"medium"/"low", "explanation": "1-2 sentence explanation"}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as EligibilityResult;
      }
    } catch (err) {
      console.warn('[GEMINI] Eligibility check failed, using fallback:', (err as Error).message);
    }
  }

  // Fallback: rule-based
  return ruleBasedEligibility(userProfile, scheme);
}

function ruleBasedEligibility(user: Partial<User>, scheme: Scheme): EligibilityResult {
  const e = scheme.eligibility;
  const issues: string[] = [];

  if (user.age && e.minAge && user.age < e.minAge) issues.push(`minimum age is ${e.minAge}`);
  if (user.age && e.maxAge && user.age > e.maxAge) issues.push(`maximum age is ${e.maxAge}`);
  if (user.gender && e.gender && e.gender !== 'all' && e.gender !== user.gender) issues.push(`only for ${e.gender} applicants`);
  if (user.annualIncome && e.maxIncome && user.annualIncome > e.maxIncome) issues.push(`income must be below ₹${e.maxIncome.toLocaleString()}`);
  if (user.category && e.categories?.length && !e.categories.some(c => c.toLowerCase() === user.category!.toLowerCase())) {
    issues.push(`only for ${e.categories.join(', ')} categories`);
  }
  if (user.occupation && e.occupations?.length && !e.occupations.some(o => o.toLowerCase() === user.occupation!.toLowerCase())) {
    issues.push(`primarily for ${e.occupations.join(', ')}`);
  }

  if (issues.length === 0) {
    return {
      eligible: true,
      confidence: user.age && user.gender && user.occupation ? 'high' : 'medium',
      explanation: `Based on your profile, you appear to meet all the eligibility criteria for ${scheme.name}. You can proceed with your application.`,
    };
  }

  return {
    eligible: false,
    confidence: 'high',
    explanation: `You may not be eligible because: ${issues.join('; ')}. Please verify with the official portal.`,
  };
}
