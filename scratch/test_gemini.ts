import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.error('No GEMINI_API_KEY found in .env');
    return;
  }
  
  console.log('Testing Gemini API with key starting with:', key.substring(0, 5));
  
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
    const result = await model.generateContent('Say "Hello World"');
    console.log('Response:', result.response.text());
  } catch (err) {
    if (err instanceof Error) {
      console.error('Gemini API test failed:', err.message);
    } else {
      console.error('Gemini API test failed:', err);
    }
  }
}

testGemini();
