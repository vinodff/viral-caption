import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Caption, LanguageStyle, SEOResult } from "../types";

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.error("API_KEY is not set in environment variables.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || 'DUMMY_KEY_FOR_BUILD' });

export const generateCaptionsFromAudio = async (base64Audio: string, languageStyle: LanguageStyle = LanguageStyle.ENGLISH): Promise<Caption[]> => {
  try {
    const schema: Schema = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          start: { type: Type.NUMBER, description: "Start time in seconds" },
          end: { type: Type.NUMBER, description: "End time in seconds" },
          text: { type: Type.STRING, description: "The spoken text segment" },
        },
        required: ["start", "end", "text"],
      },
    };

    // Construct prompt based on selected style
    let styleInstruction = "";
    switch (languageStyle) {
      case LanguageStyle.NATIVE:
        styleInstruction = "Transcribe this audio accurately in its original spoken language and script (e.g., if Telugu, use Telugu script; if Hindi, use Hindi script). Do not translate.";
        break;
      case LanguageStyle.ROMANIZED:
        styleInstruction = "Transcribe the audio in its original language but strictly using the English/Latin alphabet (Transliteration). For example, if the audio is Telugu, write in 'Telglish' (Telugu words using English letters). If Hindi, write 'Hinglish'. Do not translate the meaning to English, just transcribe the sounds using English letters.";
        break;
      case LanguageStyle.ENGLISH:
      default:
        styleInstruction = "Translate the spoken audio content into English language captions.";
        break;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav",
              data: base64Audio,
            },
          },
          {
            text: `${styleInstruction} Return a JSON array where each item has a 'start' (float, seconds), 'end' (float, seconds), and 'text' (string). Split captions naturally by phrases or pauses for video subtitles. Keep text segments relatively short (3-8 words). Ensure timestamps are extremely precise.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.2, // Low temperature for accuracy
      },
    });

    const jsonString = response.text;
    if (!jsonString) throw new Error("No response from AI");

    const parsedData = JSON.parse(jsonString);
    
    // Add IDs
    return parsedData.map((c: any, idx: number) => ({
      id: `caption-${idx}`,
      start: c.start,
      end: c.end,
      text: c.text
    }));

  } catch (error) {
    console.error("Error generating captions:", error);
    throw error;
  }
};

export const generateVideoSEO = async (transcript: string): Promise<SEOResult> => {
  try {
    const schema: Schema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A viral, clickbait-style video title" },
        description: { type: Type.STRING, description: "An engaging video description for YouTube Shorts/Reels" },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 10 high-traffic hashtags/keywords" }
      },
      required: ["title", "description", "keywords"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Analyze this video transcript and generate metadata optimized for high engagement on YouTube Shorts and Instagram Reels.
      
      Transcript: "${transcript}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      }
    });
    
    const jsonString = response.text;
    if (!jsonString) throw new Error("No SEO response");
    return JSON.parse(jsonString) as SEOResult;

  } catch (error) {
    console.error("Error generating SEO:", error);
    throw error;
  }
};

export const generateThumbnail = async (frameBase64: string, style: string, overlayText: string): Promise<string> => {
  try {
    // Enhanced prompt for Viral/MrBeast style thumbnails
    const prompt = `Create a professional, viral YouTube thumbnail based on this video frame.
    
    **Headline Text**: "${overlayText}"
    - Font: Massive, Bold, Sans-Serif (like Komika Axis, Impact or Montserrat Black).
    - Color: Bright Yellow (#FFD700) or White with a thick Black Outline/Stroke and Drop Shadow.
    - Visibility: The text must be the most visible element, readable on small mobile screens.

    **Subject**:
    - Feature the person from the frame prominently in the foreground.
    - Enhance facial expressions to be more exaggerated (shocked, excited, or intense).
    - Add a subtle "rim light" (glow) around the person (e.g., purple or blue) to separate them from the background.

    **Style & Composition (${style})**:
    - Composition: Use the "Rule of Thirds". Subject on one side, text/graphics on the other.
    - Visuals: Add high-quality 3D rendered elements relevant to the topic (e.g., if about Money: add 3D floating cash, gold coins; if Tech: add floating gadgets). Use arrows or circles to direct attention.
    - Background: Dynamic, high-saturation background (gradient, blurred studio, or abstract neon) that contrasts with the subject.
    - Vibe: High energy, click-worthy, and professional (MrBeast/YouTuber style).

    Ensure the final image is high resolution (16:9) and looks like a finished production asset.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
             inlineData: {
               mimeType: "image/jpeg",
               data: frameBase64
             }
          },
          { text: prompt }
        ]
      }
    });

    // Iterate parts to find image
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
             return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image generated");

  } catch (error) {
    console.error("Error generating thumbnail:", error);
    throw error;
  }
};