import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const GEMINI_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_KEY) {
  console.error("❌ GEMINI_API_KEY not found in .env");
  process.exit(1);
}

console.log("🔑 Testing Gemini API Key...");
console.log(`Key: ${GEMINI_KEY.substring(0, 10)}...`);

try {
  const genAI = new GoogleGenerativeAI(GEMINI_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  console.log("✅ API initialized, sending test prompt...");

  const result = await model.generateContent("Say hello in one word");
  console.log("✅ API Response:", result.response.text());
  console.log("\n🎉 API Key is valid!");
} catch (err) {
  console.error("❌ API Error:", err.message);
  process.exit(1);
}
