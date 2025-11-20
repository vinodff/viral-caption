
export interface Caption {
  id: string;
  start: number; // seconds
  end: number; // seconds
  text: string;
}

export enum CaptionStyleType {
  MR_BEAST = 'MR_BEAST',
  HORMOZI = 'HORMOZI',
  MINIMAL = 'MINIMAL',
  NEON = 'NEON',
  CINEMATIC = 'CINEMATIC',
  BOLD = 'BOLD',
  KARAOKE = 'KARAOKE'
}

export enum LanguageStyle {
  NATIVE = 'NATIVE',       // Telugu script, Hindi script, etc.
  ROMANIZED = 'ROMANIZED', // Telglish, Hinglish (English characters)
  ENGLISH = 'ENGLISH'      // Translated to English
}

export interface StyleConfig {
  id: CaptionStyleType;
  name: string;
  category: 'Originals' | 'Celebrities' | 'Customs'; // Grouping for UI
  fontFamily: string;
  textColor: string;
  strokeColor: string;
  strokeWidth: number; // Relative to font size
  backgroundColor?: string;
  shadow?: string;
  yOffset: number; // % from top
  fontSize: number; // % of video height
  uppercase: boolean;
  animation?: 'pop' | 'fade' | 'none' | 'word-by-word';
}

export interface VideoState {
  file: File | null;
  url: string | null;
  duration: number;
  dimensions: { width: number; height: number };
}

export interface SEOResult {
  title: string;
  description: string;
  keywords: string[];
}

export interface ThumbnailOptions {
  style: string;
  text: string;
}

export type VideoProcessorRef = {
  captureFrame: () => string | null;
};
