import 'dotenv/config';
import { connectDB } from '../config/db.js';
import { SchemeModel } from '../models/index.js';
import { realSchemesData } from '../store/schemes-data.js';

async function updateSchemes() {
  console.log("Connecting to database...");
  const dbSuccess = await connectDB();
  if (!dbSuccess) {
    console.error("Failed to connect to DB");
    process.exit(1);
  }

  console.log("Deleting existing schemes...");
  await SchemeModel.deleteMany({});

  console.log(`Inserting ${realSchemesData.length} realistic schemes...`);
  await SchemeModel.insertMany(realSchemesData);

  console.log("Database seeded successfully with new schemes!");
  process.exit(0);
}

updateSchemes();
