import { Scheme, User } from '../types/index.js';

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
      return e.occupations.some(o => o.toLowerCase() === occupation.toLowerCase());
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

export function scoreSchemeForUser(scheme: Scheme, user: Partial<User>): number {
  let score = 50; // base
  const e = scheme.eligibility || {};

  // Age check
  if (user.age) {
    if (e.minAge && user.age < e.minAge) return 0;
    if (e.maxAge && user.age > e.maxAge) return 0;
    if ((e.minAge || e.maxAge) && !(e.minAge && user.age < e.minAge) && !(e.maxAge && user.age > e.maxAge)) {
      score += 15;
    }
  }

  // Gender check
  if (user.gender && e.gender && e.gender !== 'all') {
    if (e.gender !== user.gender) return 0;
    score += 10;
  }

  // Income check
  if (user.annualIncome && e.maxIncome) {
    if (user.annualIncome > e.maxIncome) return 0;
    const ratio = 1 - (user.annualIncome / e.maxIncome);
    score += Math.round(ratio * 15);
  }

  // Category check
  if (user.category && e.categories && e.categories.length > 0) {
    if (e.categories.some(c => c.toLowerCase() === user.category!.toLowerCase())) {
      score += 10;
    } else {
      return 0;
    }
  }

  // Occupation check
  if (user.occupation && e.occupations && e.occupations.length > 0) {
    if (e.occupations.some(o => o.toLowerCase() === user.occupation!.toLowerCase())) {
      score += 15;
    } else {
      score -= 20;
    }
  }

  // State check
  if (user.state && e.states && e.states.length > 0) {
    if (e.states.some(s => s.toLowerCase() === user.state!.toLowerCase())) {
      score += 10;
    } else {
      return 0;
    }
  }

  return Math.max(0, Math.min(100, score));
}

export function sanitizeUser(user: User): Omit<User, 'password'> {
  const { password, ...safe } = user;
  return safe;
}
