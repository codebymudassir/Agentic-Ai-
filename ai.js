import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";

export const model = new ChatOpenAI({
  model: process.env.AI_MODEL,
  apiKey: process.env.AI_API_KEY,
  temperature: 0.7,
  configuration: {
    baseURL: process.env.AI_BASE_URL,
  },
});