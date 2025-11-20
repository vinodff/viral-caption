
import { CaptionStyleType, StyleConfig } from './types';

export const STYLE_PRESETS: Record<CaptionStyleType, StyleConfig> = {
  [CaptionStyleType.MR_BEAST]: {
    id: CaptionStyleType.MR_BEAST,
    name: 'BEAST',
    category: 'Celebrities',
    fontFamily: 'Komika Axis',
    textColor: '#FFFF00',
    strokeColor: '#000000',
    strokeWidth: 0.15,
    yOffset: 70,
    fontSize: 8,
    uppercase: true,
    animation: 'pop',
    shadow: '4px 4px 0px #000000'
  },
  [CaptionStyleType.HORMOZI]: {
    id: CaptionStyleType.HORMOZI,
    name: 'ALEX',
    category: 'Celebrities',
    fontFamily: 'Montserrat',
    textColor: '#00FF00',
    strokeColor: '#000000',
    strokeWidth: 0.1,
    yOffset: 60,
    fontSize: 9,
    uppercase: true,
    animation: 'pop',
    shadow: '0px 4px 10px rgba(0,0,0,0.8)'
  },
  [CaptionStyleType.BOLD]: {
    id: CaptionStyleType.BOLD,
    name: 'BEN',
    category: 'Celebrities',
    fontFamily: 'Montserrat',
    textColor: '#FFFFFF',
    strokeColor: '#000000',
    strokeWidth: 0.12,
    yOffset: 65,
    fontSize: 8.5,
    uppercase: true,
    animation: 'word-by-word',
    shadow: '0px 4px 0px #000000'
  },
  [CaptionStyleType.MINIMAL]: {
    id: CaptionStyleType.MINIMAL,
    name: 'DEFAULT',
    category: 'Originals',
    fontFamily: 'Roboto',
    textColor: '#FFFFFF',
    strokeColor: 'transparent',
    strokeWidth: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    yOffset: 80,
    fontSize: 5,
    uppercase: false,
    animation: 'fade'
  },
  [CaptionStyleType.NEON]: {
    id: CaptionStyleType.NEON,
    name: 'GALAXY',
    category: 'Originals',
    fontFamily: 'Montserrat',
    textColor: '#FFFFFF',
    strokeColor: '#FF00FF',
    strokeWidth: 0.05,
    shadow: '0 0 20px #FF00FF, 0 0 40px #FF00FF',
    yOffset: 50,
    fontSize: 7,
    uppercase: true,
    animation: 'none'
  },
  [CaptionStyleType.CINEMATIC]: {
    id: CaptionStyleType.CINEMATIC,
    name: 'MOVIE',
    category: 'Originals',
    fontFamily: 'The Nautigal',
    textColor: '#F0E68C',
    strokeColor: '#000000',
    strokeWidth: 0.02,
    yOffset: 85,
    fontSize: 8,
    uppercase: false,
    animation: 'fade',
    shadow: '2px 2px 4px rgba(0,0,0,0.5)'
  },
  [CaptionStyleType.KARAOKE]: {
    id: CaptionStyleType.KARAOKE,
    name: 'SPOKE',
    category: 'Celebrities',
    fontFamily: 'Montserrat',
    textColor: '#a855f7', // Purple
    strokeColor: '#ffffff',
    strokeWidth: 0.05,
    yOffset: 60,
    fontSize: 8,
    uppercase: true,
    animation: 'word-by-word',
    shadow: '2px 2px 0px #000000'
  }
};
