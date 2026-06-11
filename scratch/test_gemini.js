import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent("Hello! Say 'Key is working!' if you can hear me.");
    console.log("SUCCESS:", result.response.text());
  } catch (err) {
    console.error("ERROR:", err);
  }
}

run();
