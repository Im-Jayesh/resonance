import { AIProvider, SongAnalysis } from "../types";
import { env } from "@/lib/env";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GeminiAdapter implements AIProvider {
  private genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  // Using the latest flash identifier which is most stable across API versions
  private model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  async analyzeSong(title: string, artist: string, lyrics?: string): Promise<SongAnalysis> {
    console.log(`🤖 AI: Analyzing "${title}" by "${artist}"...`);
    const prompt = `
      Analyze the song "${title}" by "${artist}". 
      ${lyrics ? `Lyrics: ${lyrics}` : "No lyrics provided, analyze based on general knowledge."}

      Provide:
      1. A 2-3 sentence summary of the song's meaning and lyrical themes.
      2. A list of 3-5 emotional themes (e.g., Nostalgia, Longing).
      3. 3 reflective journaling prompts for a user who loves this song.

      Format the response as JSON:
      {
        "summary": "...",
        "emotionalThemes": ["...", "..."],
        "journalingPrompts": ["...", "..."]
      }
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      console.log("🤖 AI: Response received");

      const cleanedJson = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanedJson);
    } catch (error: any) {
      console.error("🤖 AI Analysis Failed:", error.message);
      // Fallback to gemini-pro if flash-latest fails
      if (error.message.includes("404") || error.message.includes("not found")) {
         console.log("🤖 AI: Attempting fallback model gemini-pro...");
         const fallbackModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
         const result = await fallbackModel.generateContent(prompt);
         const text = result.response.text();
         const cleanedJson = text.replace(/```json|```/g, "").trim();
         return JSON.parse(cleanedJson);
      }
      throw new Error(`AI Analysis failed: ${error.message}`);
    }
  }

  async analyzeJournalTrend(entries: string[]): Promise<string> {
    const prompt = `
      Analyze these journal entries and identify common emotional patterns or trends:
      ${entries.join("\n---\n")}
      
      Provide a concise emotional recap (2-3 paragraphs).
    `;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }

  async askQuestion(title: string, artist: string, question: string, context?: string): Promise<string> {
    const prompt = `
      You are an expert music critic and emotional analyst. 
      Context: User is listening to "${title}" by "${artist}".
      ${context ? `Previous context: ${context}` : ""}
      
      User Question: "${question}"
      
      Provide a concise, insightful, and emotionally resonant answer.
    `;

    const result = await this.model.generateContent(prompt);
    return result.response.text();
  }
}
