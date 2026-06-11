import { SchemeModel } from '../models/index.js';
import { realSchemesData } from './schemes-data.js';

export async function seedData() {
  try {
    // Delete all existing schemes to ensure fresh seed with our enriched attributes
    await SchemeModel.deleteMany({});

    // --- SEED SCHEMES ONLY ---
    await SchemeModel.insertMany(realSchemesData);

    console.log('[SEED] Welfare schemes seeded successfully!');
  } catch (err) {
    console.error('[SEED Error]', err);
  }
}
