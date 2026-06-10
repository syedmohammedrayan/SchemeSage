import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup environment
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import { UserModel, ApplicationModel, SavedSchemeModel, ChatMessageModel, UserDocumentModel } from '../models/index.js';

async function cleanup() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/technove';
    console.log(`🧹 Connecting to database: ${mongoUri.split('@').pop()}`);
    await mongoose.connect(mongoUri);

    // 1. Find all citizens
    const citizens = await UserModel.find({ role: 'citizen' });
    const count = citizens.length;
    
    if (count === 0) {
      console.log('✅ No citizen accounts found. Cleanup already complete.');
      process.exit(0);
    }

    console.log(`🚨 Found ${count} legacy citizen accounts to purge.`);
    const citizenIds = citizens.map(c => c.id);

    // 2. Delete associated data
    console.log('🗑️  Deleting associated applications...');
    await ApplicationModel.deleteMany({ userId: { $in: citizenIds } });

    console.log('🗑️  Deleting saved schemes...');
    await SavedSchemeModel.deleteMany({ userId: { $in: citizenIds } });

    console.log('🗑️  Deleting chat history...');
    await ChatMessageModel.deleteMany({ userId: { $in: citizenIds } });

    console.log('🗑️  Deleting user documents...');
    await UserDocumentModel.deleteMany({ userId: { $in: citizenIds } });

    // 3. Delete users
    console.log('🗑️  Permanently removing citizen accounts...');
    await UserModel.deleteMany({ role: 'citizen' });

    console.log(`\n✨ SUCCESS: Cleaned up ${count} legacy accounts and all associated data.`);
    process.exit(0);
  } catch (err: any) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
}

cleanup();
