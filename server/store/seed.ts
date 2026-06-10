import { SchemeModel } from '../models/index.js';
import { realSchemesData } from './schemes-data.js';

export async function seedData() {
  try {
    // Check if schemes are already seeded to avoid duplicates
    const existingScheme = await SchemeModel.findOne({ id: 's1' });
    if (existingScheme) {
      console.log('[SEED] Schemes already seeded. Skipping.');
      return;
    }

    // --- SEED SCHEMES ONLY ---
    await SchemeModel.insertMany(realSchemesData);

    console.log('[SEED] Welfare schemes seeded successfully!');
  } catch (err) {
    console.error('[SEED Error]', err);
  }
}
