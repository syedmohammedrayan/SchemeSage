import { Scheme, User, EligibilityDimension, CitizenProfile } from '../types/index.js';

// ============================================================
// ELIGIBILITY ENGINE — Phase 1 of SchemeSage AI Transformation
// Implements a weighted, hard-reject scoring system.
// Hard-reject dimensions return score=0 immediately on failure.
// ============================================================

/**
 * The core weighted eligibility engine.
 * Returns a score (0-100) and a per-dimension breakdown.
 * Hard rejects (gender, state, category, income, age) return score=0.
 * Soft dimensions (education, occupation) apply penalties only.
 */
export function scoreSchemeForUser(
  scheme: Scheme,
  user: Partial<User> | CitizenProfile
): number {
  return scoreWithBreakdown(scheme, user).score;
}

export function scoreWithBreakdown(
  scheme: Scheme,
  user: Partial<User> | CitizenProfile
): { score: number; breakdown: EligibilityDimension[] } {
  const e = scheme.eligibility || {};
  const breakdown: EligibilityDimension[] = [];
  let score = 0;

  // ── 1. STATE MATCH (25%) ── HARD REJECT ──────────────────────────────────
  if (e.states && e.states.length > 0) {
    const userState = (user.state || '').toLowerCase().trim();
    const stateMatch = e.states.some(s => s.toLowerCase().trim() === userState || s.toLowerCase() === 'all india');
    if (!userState || !stateMatch) {
      breakdown.push({ pass: false, label: 'State Eligibility', detail: `Scheme is for: ${e.states.join(', ')}` });
      return { score: 0, breakdown }; // HARD REJECT
    }
    score += 25;
    breakdown.push({ pass: true, label: 'State Eligibility', detail: `${user.state} resident ✓` });
  } else {
    score += 20; // National scheme — partial credit
    breakdown.push({ pass: true, label: 'State Eligibility', detail: 'All-India scheme ✓' });
  }

  // ── 2. AGE MATCH (10%) ── HARD REJECT ───────────────────────────────────
  if (user.age) {
    if (e.minAge && user.age < e.minAge) {
      breakdown.push({ pass: false, label: 'Age Eligibility', detail: `Minimum age required: ${e.minAge}` });
      return { score: 0, breakdown }; // HARD REJECT
    }
    if (e.maxAge && user.age > e.maxAge) {
      breakdown.push({ pass: false, label: 'Age Eligibility', detail: `Maximum age limit: ${e.maxAge}` });
      return { score: 0, breakdown }; // HARD REJECT
    }
    if (e.minAge || e.maxAge) {
      score += 10;
      breakdown.push({ pass: true, label: 'Age Eligibility', detail: `Age ${user.age} is within ${e.minAge || 0}–${e.maxAge || '∞'} ✓` });
    } else {
      score += 8;
      breakdown.push({ pass: true, label: 'Age Eligibility', detail: 'No age restriction ✓' });
    }
  } else {
    score += 5;
    breakdown.push({ pass: true, label: 'Age Eligibility', detail: 'Age not specified' });
  }

  // ── 3. GENDER MATCH (10%) ── HARD REJECT ─────────────────────────────────
  if (e.gender && e.gender !== 'all') {
    const userGender = (user.gender || '').toLowerCase();
    if (!userGender) {
      score += 5;
      breakdown.push({ pass: true, label: 'Gender Eligibility', detail: 'Gender not specified' });
    } else if (e.gender !== userGender) {
      breakdown.push({ pass: false, label: 'Gender Eligibility', detail: `This scheme is for ${e.gender} applicants only` });
      return { score: 0, breakdown }; // HARD REJECT
    } else {
      score += 10;
      breakdown.push({ pass: true, label: 'Gender Eligibility', detail: `${e.gender} applicant ✓` });
    }
  } else {
    score += 10;
    breakdown.push({ pass: true, label: 'Gender Eligibility', detail: 'Open to all genders ✓' });
  }

  // ── 4. INCOME MATCH (10%) ── HARD REJECT ─────────────────────────────────
  const userIncome = (user as any).annualIncome ?? (user as any).income;
  if (e.maxIncome && userIncome) {
    const incomeNum = typeof userIncome === 'string' ? parseInt(userIncome) : userIncome;
    if (incomeNum > e.maxIncome) {
      breakdown.push({ pass: false, label: 'Income Eligibility', detail: `Income limit: ₹${e.maxIncome.toLocaleString('en-IN')}` });
      return { score: 0, breakdown }; // HARD REJECT
    }
    // The closer to limit, the higher the score
    const ratio = 1 - (incomeNum / e.maxIncome);
    score += Math.round(ratio * 10);
    breakdown.push({ pass: true, label: 'Income Eligibility', detail: `₹${incomeNum.toLocaleString('en-IN')} is within limit ✓` });
  } else if (e.maxIncome) {
    score += 8; // No income specified by user, assume eligible
    breakdown.push({ pass: true, label: 'Income Eligibility', detail: `Income limit: ₹${e.maxIncome.toLocaleString('en-IN')}` });
  } else {
    score += 10;
    breakdown.push({ pass: true, label: 'Income Eligibility', detail: 'No income restriction ✓' });
  }

  // ── 5. CASTE/CATEGORY MATCH (15%) ── HARD REJECT ─────────────────────────
  if (e.categories && e.categories.length > 0) {
    const userCat = (user.category || '').toLowerCase();
    const schemeCategories = e.categories.map(c => c.toLowerCase());
    if (!userCat) {
      score += 8;
      breakdown.push({ pass: true, label: 'Category Eligibility', detail: `Eligible categories: ${e.categories.join(', ')}` });
    } else if (schemeCategories.includes(userCat) || schemeCategories.includes('all')) {
      score += 15;
      breakdown.push({ pass: true, label: 'Category Eligibility', detail: `${user.category} category eligible ✓` });
    } else {
      breakdown.push({ pass: false, label: 'Category Eligibility', detail: `Only for: ${e.categories.join(', ')}` });
      return { score: 0, breakdown }; // HARD REJECT
    }
  } else {
    score += 15;
    breakdown.push({ pass: true, label: 'Category Eligibility', detail: 'Open to all categories ✓' });
  }

  // ── 6. OCCUPATION MATCH (20%) ── SOFT PENALTY ────────────────────────────
  if (e.occupations && e.occupations.length > 0) {
    const userOcc = (user.occupation || '').toLowerCase();
    const schemeOccs = e.occupations.map(o => o.toLowerCase());
    if (!userOcc) {
      score += 10;
      breakdown.push({ pass: true, label: 'Occupation Eligibility', detail: `Target: ${e.occupations.join(', ')}` });
    } else if (schemeOccs.some(o => userOcc.includes(o) || o.includes(userOcc))) {
      score += 20;
      breakdown.push({ pass: true, label: 'Occupation Eligibility', detail: `${user.occupation} occupation matches ✓` });
    } else {
      // Soft penalty — not a hard reject, but heavily penalised
      score -= 15;
      breakdown.push({ pass: false, label: 'Occupation Eligibility', detail: `Scheme targets: ${e.occupations.join(', ')}` });
    }
  } else {
    score += 15;
    breakdown.push({ pass: true, label: 'Occupation Eligibility', detail: 'Open to all occupations ✓' });
  }

  // ── 7. DISABILITY / MINORITY (5%) ── SOFT ────────────────────────────────
  if (e.disabilityRequired) {
    const userDisability = (user as any).disability;
    if (userDisability) {
      score += 5;
      breakdown.push({ pass: true, label: 'Disability Criteria', detail: 'Disability status verified ✓' });
    } else {
      score -= 20;
      breakdown.push({ pass: false, label: 'Disability Criteria', detail: 'Scheme is for persons with disabilities' });
    }
  }
  if (e.minorityRequired) {
    const userMinority = (user as any).minority;
    if (userMinority) {
      score += 5;
      breakdown.push({ pass: true, label: 'Minority Status', detail: 'Minority community verified ✓' });
    } else {
      score -= 10;
      breakdown.push({ pass: false, label: 'Minority Status', detail: 'Scheme targets minority communities' });
    }
  }

  // ── 8. RURAL/URBAN (5%) ── SOFT ──────────────────────────────────────────
  if (e.ruralUrban && e.ruralUrban !== 'both') {
    const userRU = (user as any).ruralUrban;
    if (userRU && userRU !== e.ruralUrban) {
      score -= 10;
      breakdown.push({ pass: false, label: 'Rural/Urban', detail: `Scheme is for ${e.ruralUrban} areas` });
    } else {
      score += 5;
      breakdown.push({ pass: true, label: 'Rural/Urban', detail: `${e.ruralUrban} scheme ✓` });
    }
  }

  return { score: Math.max(0, Math.min(100, score)), breakdown };
}

export function filterSchemes(
  schemes: Scheme[],
  filters: {
    age?: string;
    gender?: string;
    income?: string;
    state?: string;
    category?: string;
    occupation?: string;
    search?: string;
    tags?: string;
  }
): Scheme[] {
  let result = schemes;

  const { age, gender, income, state, category, occupation, search, tags } = filters;

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.description.toLowerCase().includes(q)
    );
  }

  if (tags) {
    const tagList = tags.split(',').map(t => t.trim().toLowerCase());
    result = result.filter(s =>
      s.tags.some(t => tagList.includes(t.toLowerCase()))
    );
  }

  if (age) {
    const ageNum = parseInt(age);
    if (!isNaN(ageNum)) {
      result = result.filter((s) => {
        const e = s.eligibility || {};
        if (e.minAge && ageNum < e.minAge) return false;
        if (e.maxAge && ageNum > e.maxAge) return false;
        return true;
      });
    }
  }

  if (gender && gender !== 'all') {
    result = result.filter((s) => {
      const e = s.eligibility || {};
      if (!e.gender || e.gender === 'all') return true;
      return e.gender === gender;
    });
  }

  if (income) {
    const incomeNum = parseInt(income);
    if (!isNaN(incomeNum)) {
      result = result.filter((s) => {
        const e = s.eligibility || {};
        if (e.maxIncome && incomeNum > e.maxIncome) return false;
        return true;
      });
    }
  }

  if (category) {
    result = result.filter((s) => {
      const e = s.eligibility || {};
      if (!e.categories || e.categories.length === 0) return true;
      return e.categories.some(c => c.toLowerCase() === category.toLowerCase());
    });
  }

  if (occupation) {
    result = result.filter((s) => {
      const e = s.eligibility || {};
      if (!e.occupations || e.occupations.length === 0) return true;
      const userOcc = occupation.toLowerCase();
      return e.occupations.some(o => o.toLowerCase() === userOcc || userOcc.includes(o.toLowerCase()) || o.toLowerCase().includes(userOcc));
    });
  }

  if (state) {
    result = result.filter((s) => {
      const e = s.eligibility || {};
      if (!e.states || e.states.length === 0) return true;
      return e.states.some(st => st.toLowerCase() === state.toLowerCase());
    });
  }

  return result;
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...safe } = user;
  return safe;
}
