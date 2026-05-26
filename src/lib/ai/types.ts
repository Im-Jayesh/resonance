export interface SongAnalysis {
  summary: string;
  emotionalThemes: string[];
  prompts: string[];
  lineByLineExplanation?: string;
}

export interface AIProvider {
  analyzeSong(title: string, artist: string, lyrics?: string): Promise<SongAnalysis>;
  analyzeJournalTrend(entries: string[]): Promise<string>;
}
