import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function testConnection() {
  console.log('🔍 [Diagnostic] Testing MongoDB Atlas Connectivity...');
  
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI is missing in .env file!');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, 
    });
    console.log('\n✅ SUCCESS: Successfully connected to MongoDB Atlas!');
    console.log('🚀 Your IP is now correctly whitelisted. You can start the full server now.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (err: any) {
    console.log('\n❌ CONNECTION FAILED');
    
    if (err.message.includes('whitelist') || err.message.includes('connect')) {
      console.log('📍 REASON: Likely blocked by IP Whitelist.');
      console.log('👉 Please go to https://cloud.mongodb.com/ and add your "Current IP Address".');
    } else if (err.message.includes('auth')) {
      console.log('📍 REASON: Authentication failure (Username/Password in .env might be wrong).');
    } else {
      console.log(`📍 REASON: ${err.message}`);
    }
    
    console.log('\n🔄 Retrying in 5 seconds... (Press Ctrl+C to stop)');
    setTimeout(testConnection, 5000);
  }
}

testConnection();
