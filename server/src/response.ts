import { generateResponse } from "./ai_request.ts";

export async function getResponse(prompt: string): Promise<string> {
  return await generateResponse(prompt);
}