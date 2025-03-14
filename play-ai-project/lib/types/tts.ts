export interface TTSSettings {
  model: string;
  voice: string;
  quality: string;
  outputFormat: string;
  speed: number;
  sampleRate: number;
  language: string;
  seed: number | null;
  temperature: number | null;
  voiceGuidance: number | null;
  styleGuidance: number | null;
  textGuidance: number;
}

export interface TTSQueueItem {
  id: string;
  text: string;
  isFullText: boolean;
} 