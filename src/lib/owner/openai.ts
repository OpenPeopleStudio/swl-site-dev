import OpenAI from "openai";

let openAIClient: OpenAI | null = null;

export function getOpenAIClient() {
  if (openAIClient) return openAIClient;
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
  
  // Trim whitespace and remove quotes if present
  apiKey = apiKey.trim().replace(/^["']|["']$/g, "");
  
  // Validate key format (should start with sk-)
  if (!apiKey.startsWith("sk-")) {
    throw new Error(
      `Invalid OpenAI API key format. Keys should start with "sk-". ` +
      `Your key appears to start with "${apiKey.substring(0, 10)}...". ` +
      `Please check your OPENAI_API_KEY in .env.local and ensure it's a valid OpenAI API key. ` +
      `Get a new key at https://platform.openai.com/account/api-keys`
    );
  }
  
  openAIClient = new OpenAI({
    apiKey,
  });
  return openAIClient;
}
