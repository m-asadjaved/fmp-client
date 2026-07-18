const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');

const envPath = '.env';
let key = '';
try {
  const env = fs.readFileSync(envPath, 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
  key = env ? env.split('=')[1].trim() : '';
} catch (e) {
  console.log('No .env found');
}

async function test() {
  const ai = new GoogleGenAI({ apiKey: key });
  const mockWords = [
    { text: 'नमस्ते', start: 0, end: 1 },
    { text: 'दुनिया', start: 1, end: 2 }
  ];
  
  const prompt = `You are a professional Hindi translator. I will provide a JSON array of words. Your task is to translate ONLY the "text" field of each word from Devanagari Hindi into Roman Hindi (Hinglish). 
DO NOT change the structure of the JSON.
DO NOT change the "start" or "end" values.
Return ONLY valid JSON, nothing else.

Input JSON:
${JSON.stringify(mockWords)}
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json'
    }
  });
  console.log("Raw response text:");
  let resultText = typeof response.text === 'function' ? response.text() : response.text;
  console.log(resultText);
}

test().catch(console.error);
