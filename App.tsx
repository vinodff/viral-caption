import React, { useState, useEffect, useRef } from 'react';
import { extractAudioFromVideo } from './utils/audioUtils';
import { generateCaptionsFromAudio, generateVideoSEO, generateThumbnail } from './services/geminiService';
import VideoProcessor from './components/VideoProcessor';
import { Caption, CaptionStyleType, LanguageStyle, StyleConfig, VideoProcessorRef, SEOResult } from './types';
import { STYLE_PRESETS } from './constants';

// --- ICONS ---
const IconTimeline = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/></svg>;
const IconTemplate = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>;
const IconStyle = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconMagic = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 5h4"/><path d="M18 17v4"/><path d="M15 19h4"/></svg>;
const IconVideo = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z"/><rect x="2" y="6" width="14" height="12" rx="2" ry="2"/></svg>;
const IconEdit = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>;
const IconEye = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconDots = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>;
const IconEmoji = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;

// Helper to parse RGBA for the color picker
const parseColor = (colorStr?: string) => {
  if (!colorStr) return { hex: '#000000', opacity: 0 };
  if (colorStr.startsWith('#')) return { hex: colorStr, opacity: 1 };
  if (colorStr.startsWith('rgba')) {
     const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
     if (match) {
        const r = parseInt(match[1]);
        const g = parseInt(match[2]);
        const b = parseInt(match[3]);
        const a = match[4] ? parseFloat(match[4]) : 1;
        const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return { hex, opacity: a };
     }
  }
  return { hex: '#000000', opacity: 1 };
};

// Helper to convert hex + opacity to RGBA
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
};

const App: React.FC = () => {
  // App State
  const [file, setFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [step, setStep] = useState<number>(1); // 1: Upload, 2: Config, 3: Processing, 4: Editor
  const [isProcessing, setIsProcessing] = useState(false);
  const [captions, setCaptions] = useState<Caption[]>([]);
  
  // Editor State
  const [activeTab, setActiveTab] = useState<'timeline' | 'templates' | 'styles' | 'broll' | 'ai'>('timeline');
  const [activeStyle, setActiveStyle] = useState<StyleConfig>({ ...STYLE_PRESETS[CaptionStyleType.MR_BEAST] });
  const [activePresetId, setActivePresetId] = useState<CaptionStyleType>(CaptionStyleType.MR_BEAST);
  
  // Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Derived Background
  const [bgColorHex, setBgColorHex] = useState('#000000');
  const [bgOpacity, setBgOpacity] = useState(0.6);
  
  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // AI Tools State
  const [aiToolMode, setAiToolMode] = useState<'menu' | 'seo' | 'thumbnail'>('menu');
  const [seoResult, setSeoResult] = useState<SEOResult | null>(null);
  const [isGeneratingSEO, setIsGeneratingSEO] = useState(false);
  
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailStyle, setThumbnailStyle] = useState('Vibrant & Clickbait');
  const [thumbnailText, setThumbnailText] = useState('');
  const [isGeneratingThumb, setIsGeneratingThumb] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);

  const videoProcessorRef = useRef<VideoProcessorRef>(null);

  // Update derived background state
  useEffect(() => {
    if (activeStyle.backgroundColor) {
      const { hex, opacity } = parseColor(activeStyle.backgroundColor);
      setBgColorHex(hex);
      setBgOpacity(opacity);
    }
  }, [activeStyle.id, activeStyle.backgroundColor]);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setVideoSrc(URL.createObjectURL(selectedFile));
      setStep(2); 
    }
  };

  const handleProcessVideo = async (style: LanguageStyle) => {
    if (!file) return;
    setStep(3);
    setIsProcessing(true);
    try {
      const base64Audio = await extractAudioFromVideo(file);
      const generatedCaptions = await generateCaptionsFromAudio(base64Audio, style);
      setCaptions(generatedCaptions);
      setStep(4);
      setActiveTab('templates'); // Default to templates
    } catch (err) {
      console.error(err);
      setStep(1);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPreset = (presetId: CaptionStyleType) => {
    setActivePresetId(presetId);
    setActiveStyle({ ...STYLE_PRESETS[presetId] });
  };

  const updateStyle = (key: keyof StyleConfig, value: any) => {
    setActiveStyle(prev => ({ ...prev, [key]: value }));
  };

  const updateBackground = (enable: boolean, hex: string, opacity: number) => {
    setBgColorHex(hex);
    setBgOpacity(opacity);
    updateStyle('backgroundColor', enable ? hexToRgba(hex, opacity) : undefined);
  };

  const handleGenerateSEO = async () => {
    setIsGeneratingSEO(true);
    try {
      const fullTranscript = captions.map(c => c.text).join(' ');
      const result = await generateVideoSEO(fullTranscript);
      setSeoResult(result);
      // Auto-set thumbnail text based on title
      setThumbnailText(result.title.split(' ').slice(0, 4).join(' ')); 
    } catch (e) {
      console.error("SEO Generation failed", e);
    } finally {
      setIsGeneratingSEO(false);
    }
  };

  const handleCaptureFrame = () => {
     if (videoProcessorRef.current) {
       const base64 = videoProcessorRef.current.captureFrame();
       if (base64) {
         setThumbnailPreview(base64);
       }
     }
  };

  const handleGenerateThumbnail = async () => {
    if (!thumbnailPreview) return;
    setIsGeneratingThumb(true);
    try {
      const result = await generateThumbnail(thumbnailPreview, thumbnailStyle, thumbnailText);
      setGeneratedThumbnail(result);
    } catch (e) {
      console.error("Thumb Generation failed", e);
    } finally {
      setIsGeneratingThumb(false);
    }
  };

  // --- RENDER COMPONENTS ---

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button 
      onClick={() => {
        setActiveTab(id);
        if (id === 'ai') setAiToolMode('menu');
      }}
      className={`flex flex-col items-center justify-center w-full py-4 gap-1 transition-colors ${activeTab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
    >
      <Icon />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  const TimelinePanel = () => (
    <div className="flex flex-col h-full bg-[#121212]">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-xl font-bold mb-2">Timeline</h2>
        <p className="text-sm text-gray-500">Edit your captions here</p>
      </div>
      
      <div className="p-4 border-b border-white/10">
        <div className="relative">
           <input 
             type="text" 
             placeholder="Search words..." 
             className="w-full bg-[#1e1e1e] text-sm text-white rounded-lg pl-4 pr-10 py-2.5 outline-none border border-white/5 focus:border-white/20"
             value={searchTerm}
             onChange={e => setSearchTerm(e.target.value)}
           />
           <div className="absolute right-3 top-2.5 text-gray-500">
             <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21 21-4.35-4.35M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z"/></svg>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {captions.filter(c => c.text.toLowerCase().includes(searchTerm.toLowerCase())).map((cap, idx) => {
           const isActive = currentTime >= cap.start && currentTime <= cap.end;
           return (
            <div key={cap.id} className={`group relative`}>
               {/* Header Row */}
               <div className="flex items-center justify-between mb-2">
                  <div className={`text-xs font-mono font-bold px-2 py-1 rounded bg-[#1e1e1e] border ${isActive ? 'border-purple-500 text-purple-400' : 'border-white/10 text-gray-400'}`}>
                    {cap.start.toFixed(2)} - {cap.end.toFixed(2)}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                     <button className="hover:text-white p-1"><IconEdit /></button>
                     <button className="hover:text-white p-1"><IconEye /></button>
                     <button className="hover:text-white p-1"><IconDots /></button>
                  </div>
               </div>
               
               {/* Input Row */}
               <div className={`p-3 rounded-lg bg-[#1e1e1e] border transition-colors ${isActive ? 'border-purple-500/50' : 'border-white/5 hover:border-white/20'}`}>
                  <textarea 
                    value={cap.text}
                    rows={2}
                    onChange={(e) => {
                      const newCaptions = [...captions];
                      newCaptions[idx].text = e.target.value;
                      setCaptions(newCaptions);
                    }}
                    className="w-full bg-transparent outline-none text-sm font-medium resize-none text-gray-100 placeholder-gray-600"
                  />
                  <div className="flex justify-end mt-1">
                     <button className="text-gray-500 hover:text-white"><IconEmoji /></button>
                  </div>
               </div>
            </div>
           );
        })}
      </div>
    </div>
  );

  const TemplatesPanel = () => {
    const [subTab, setSubTab] = useState<'Originals' | 'Celebrities' | 'Customs'>('Originals');
    
    return (
      <div className="flex flex-col h-full bg-[#121212]">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-bold mb-2">Templates</h2>
          <p className="text-sm text-gray-500">Select any templates here</p>
        </div>

        <div className="px-4 pt-4">
           <div className="flex p-1 bg-[#1e1e1e] rounded-lg mb-4">
              {(['Originals', 'Celebrities', 'Customs'] as const).map(t => (
                <button 
                  key={t}
                  onClick={() => setSubTab(t)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${subTab === t ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {t}
                </button>
              ))}
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-3 content-start custom-scrollbar">
           {Object.values(STYLE_PRESETS)
             .filter(s => s.category === subTab)
             .map((style) => (
               <button
                 key={style.id}
                 onClick={() => applyPreset(style.id)}
                 className={`relative aspect-[4/3] rounded-xl border-2 flex items-center justify-center bg-[#1e1e1e] transition-all group ${activePresetId === style.id ? 'border-purple-500' : 'border-transparent hover:border-gray-600'}`}
               >
                  {/* Visual Preview of Text Style */}
                  <span 
                    style={{
                       fontFamily: style.fontFamily,
                       color: style.textColor,
                       WebkitTextStroke: style.strokeWidth > 0 ? `1px ${style.strokeColor}` : 'none',
                       textShadow: style.shadow,
                       textTransform: style.uppercase ? 'uppercase' : 'none',
                       fontSize: '1.2rem',
                       fontWeight: '900'
                    }}
                  >
                    {style.name}
                  </span>
                  {activePresetId === style.id && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse"/>
                  )}
               </button>
             ))}
             {/* Placeholders for empty grid spots */}
             {subTab === 'Celebrities' && (
                <>
                 <div className="aspect-[4/3] rounded-xl bg-[#1e1e1e]/30 border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-600 font-bold">Coming Soon</div>
                 <div className="aspect-[4/3] rounded-xl bg-[#1e1e1e]/30 border border-dashed border-white/10 flex items-center justify-center text-xs text-gray-600 font-bold">Coming Soon</div>
                </>
             )}
        </div>
      </div>
    );
  };

  const StylesPanel = () => (
     <div className="flex flex-col h-full bg-[#121212]">
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold mb-1">Styles</h2>
           <p className="text-sm text-gray-500">Manage your styles here</p>
        </div>
        <button className="px-3 py-1.5 text-xs font-bold border border-white/20 rounded-lg hover:bg-white/10 flex items-center gap-2">
           <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
           Save template
        </button>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar">
         
         {/* Display By */}
         <div>
            <label className="text-xs font-bold text-white mb-3 block">Display by</label>
            <div className="flex gap-3">
               <button 
                 onClick={() => updateStyle('animation', 'word-by-word')}
                 className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${activeStyle.animation === 'word-by-word' ? 'bg-[#1e1e1e] border-white' : 'bg-[#1e1e1e] border-transparent text-gray-500 hover:border-white/20'}`}
               >
                  <span className="text-xl font-serif">ab</span>
                  <span className="text-xs font-bold">Word</span>
               </button>
               <button 
                 onClick={() => updateStyle('animation', 'pop')}
                 className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${activeStyle.animation !== 'word-by-word' ? 'bg-[#1e1e1e] border-white' : 'bg-[#1e1e1e] border-transparent text-gray-500 hover:border-white/20'}`}
               >
                  <span className="text-xl">—</span>
                  <span className="text-xs font-bold">Line</span>
               </button>
            </div>
            
            {activeStyle.animation !== 'word-by-word' && (
               <div className="mt-4 flex items-center justify-center bg-[#1e1e1e] rounded-lg p-2">
                  <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400">-</button>
                  <span className="mx-4 text-xs font-bold">1 LINES</span>
                  <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400">+</button>
               </div>
            )}
         </div>

         {/* Organize By */}
         <div>
            <label className="text-xs font-bold text-white mb-3 block">Organize by</label>
            <div className="flex gap-3">
               <button className="flex-1 py-3 rounded-xl border border-white bg-[#1e1e1e] flex flex-col items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4h4v16h-4zM6 14h2v6H6zM16 10h2v10h-2z"/></svg>
                  <span className="text-xs font-bold">Punctuation</span>
               </button>
               <button className="flex-1 py-3 rounded-xl border border-transparent bg-[#1e1e1e] text-gray-500 flex flex-col items-center gap-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span className="text-xs font-bold">Fixed</span>
               </button>
            </div>
         </div>

         {/* Advanced Details */}
         <div className="space-y-4">
            {/* Font */}
            <div>
                <div className="flex justify-between text-xs mb-2 font-bold text-gray-400"><span>Font Family</span></div>
                <select 
                  value={activeStyle.fontFamily}
                  onChange={e => updateStyle('fontFamily', e.target.value)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-3 text-sm outline-none focus:border-purple-500"
                >
                   <option value="Komika Axis">Komika Axis</option>
                   <option value="Montserrat">Montserrat</option>
                   <option value="The Nautigal">The Nautigal</option>
                   <option value="Roboto">Roboto</option>
                </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-2 block">Text Color</label>
                    <div className="flex items-center bg-[#1e1e1e] rounded-lg p-2 border border-white/10">
                        <input type="color" value={activeStyle.textColor} onChange={e => updateStyle('textColor', e.target.value)} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer mr-2"/>
                        <span className="text-xs font-mono text-gray-400">{activeStyle.textColor}</span>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-gray-400 mb-2 block">Stroke</label>
                    <div className="flex items-center bg-[#1e1e1e] rounded-lg p-2 border border-white/10">
                        <input type="color" value={activeStyle.strokeColor} onChange={e => updateStyle('strokeColor', e.target.value)} className="w-6 h-6 rounded bg-transparent border-none cursor-pointer mr-2"/>
                        <span className="text-xs font-mono text-gray-400">{activeStyle.strokeColor}</span>
                    </div>
                </div>
            </div>

            {/* Sliders */}
            <div>
               <div className="flex justify-between text-xs mb-2 font-bold text-gray-400">
                  <span>Size</span>
                  <span className="text-purple-400">{activeStyle.fontSize}%</span>
               </div>
               <input type="range" min="2" max="15" step="0.5" value={activeStyle.fontSize} onChange={e => updateStyle('fontSize', parseFloat(e.target.value))} className="w-full accent-purple-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"/>
            </div>

            <div>
               <div className="flex justify-between text-xs mb-2 font-bold text-gray-400">
                  <span>Vertical Position</span>
                  <span className="text-purple-400">{activeStyle.yOffset}%</span>
               </div>
               <input type="range" min="10" max="90" step="1" value={activeStyle.yOffset} onChange={e => updateStyle('yOffset', parseFloat(e.target.value))} className="w-full accent-purple-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"/>
            </div>

         </div>
      </div>
     </div>
  );

  const AIToolsPanel = () => {
    return (
      <div className="flex flex-col h-full bg-[#121212]">
        {aiToolMode === 'menu' && (
          <>
            <div className="p-4 border-b border-white/10">
              <h2 className="text-xl font-bold mb-2">AI Tools</h2>
              <p className="text-sm text-gray-500">Supercharge your content</p>
            </div>
            <div className="p-4 space-y-4">
              <button 
                onClick={() => setAiToolMode('seo')}
                className="w-full p-5 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 hover:border-purple-500 transition-all text-left group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 bg-purple-600 text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
                <div className="mb-3 text-purple-400"><IconMagic /></div>
                <h3 className="font-bold text-lg mb-1">SEO Optimizer</h3>
                <p className="text-xs text-gray-400">Generate viral titles, descriptions & tags based on your video.</p>
              </button>
              
              <button 
                 onClick={() => setAiToolMode('thumbnail')}
                 className="w-full p-5 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 hover:border-purple-500 transition-all text-left"
              >
                <div className="mb-3 text-pink-400"><IconEye /></div>
                <h3 className="font-bold text-lg mb-1">Thumbnail Creator</h3>
                <p className="text-xs text-gray-400">Generate high CTR thumbnails from your video frames.</p>
              </button>
            </div>
          </>
        )}

        {aiToolMode === 'seo' && (
          <div className="flex flex-col h-full">
             <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <button onClick={() => setAiToolMode('menu')} className="text-gray-400 hover:text-white">←</button>
                <h2 className="font-bold">SEO Optimizer</h2>
             </div>
             <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-6">
                {!seoResult ? (
                   <div className="text-center py-10">
                      <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IconMagic />
                      </div>
                      <p className="text-sm text-gray-400 mb-6">AI will analyze your captions to create viral metadata.</p>
                      <button 
                        onClick={handleGenerateSEO}
                        disabled={isGeneratingSEO}
                        className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 disabled:opacity-50"
                      >
                        {isGeneratingSEO ? 'Generating...' : 'Generate Metadata'}
                      </button>
                   </div>
                ) : (
                   <div className="space-y-4 animate-fade-in">
                      <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">VIRAL TITLE</label>
                         <div className="bg-[#1e1e1e] p-3 rounded-lg border border-white/10 text-sm font-medium">{seoResult.title}</div>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">DESCRIPTION</label>
                         <div className="bg-[#1e1e1e] p-3 rounded-lg border border-white/10 text-xs text-gray-300 leading-relaxed">{seoResult.description}</div>
                      </div>
                      <div>
                         <label className="text-xs font-bold text-gray-500 mb-1 block">KEYWORDS</label>
                         <div className="flex flex-wrap gap-2">
                            {seoResult.keywords.map((k, i) => (
                               <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-md">#{k.replace(/\s/g, '')}</span>
                            ))}
                         </div>
                      </div>
                      <button onClick={() => setSeoResult(null)} className="w-full py-2 border border-white/10 rounded-lg text-xs hover:bg-white/5">Regenerate</button>
                   </div>
                )}
             </div>
          </div>
        )}

        {aiToolMode === 'thumbnail' && (
          <div className="flex flex-col h-full">
             <div className="p-4 border-b border-white/10 flex items-center gap-2">
                <button onClick={() => setAiToolMode('menu')} className="text-gray-400 hover:text-white">←</button>
                <h2 className="font-bold">Thumbnail Creator</h2>
             </div>
             <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-5">
                
                {/* 1. Capture Frame */}
                <div>
                   <label className="text-xs font-bold text-gray-500 mb-2 block">1. SOURCE FRAME</label>
                   <div className="aspect-video bg-black rounded-lg border border-white/10 overflow-hidden relative group">
                      {thumbnailPreview ? (
                         <img src={`data:image/jpeg;base64,${thumbnailPreview}`} alt="Source" className="w-full h-full object-cover" />
                      ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">No frame captured</div>
                      )}
                      <button 
                        onClick={handleCaptureFrame}
                        className="absolute bottom-2 right-2 bg-white text-black text-xs font-bold px-3 py-1.5 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Capture Current
                      </button>
                   </div>
                </div>

                {/* 2. Configuration */}
                <div>
                    <label className="text-xs font-bold text-gray-500 mb-2 block">2. STYLE & TEXT</label>
                    <select 
                       value={thumbnailStyle}
                       onChange={e => setThumbnailStyle(e.target.value)}
                       className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs mb-2 outline-none"
                    >
                       <option>Vibrant & Clickbait</option>
                       <option>Finance & Money (Viral)</option>
                       <option>Minimalist & Clean</option>
                       <option>Dark & Mysterious</option>
                       <option>Tech & Futuristic</option>
                    </select>
                    <input 
                       type="text" 
                       value={thumbnailText}
                       onChange={e => setThumbnailText(e.target.value)}
                       placeholder="Text overlay (e.g. SECRET REVEALED)"
                       className="w-full bg-[#1e1e1e] border border-white/10 rounded-lg p-2 text-xs outline-none"
                    />
                </div>

                {/* 3. Generate Action */}
                <button 
                  onClick={handleGenerateThumbnail}
                  disabled={!thumbnailPreview || isGeneratingThumb}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                   {isGeneratingThumb ? 'Designing...' : 'Generate Thumbnail'}
                </button>

                {/* 4. Result */}
                {generatedThumbnail && (
                   <div className="animate-fade-in pt-4 border-t border-white/10">
                      <label className="text-xs font-bold text-green-400 mb-2 block">RESULT</label>
                      <img src={generatedThumbnail} alt="Generated Thumbnail" className="w-full rounded-lg border border-white/20 shadow-lg mb-2" />
                      <a 
                        href={generatedThumbnail} 
                        download="thumbnail.png" 
                        className="block w-full py-2 text-center bg-white text-black text-xs font-bold rounded-lg hover:bg-gray-200"
                      >
                         Download Image
                      </a>
                   </div>
                )}
             </div>
          </div>
        )}
      </div>
    );
  };

  // --- MAIN APP FLOW ---

  // 1. Upload Screen
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
             <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">ViralCaptions AI</h1>
             <p className="text-gray-400 mb-12">Create engaging short videos in seconds</p>

             <label className="block w-full aspect-video border-2 border-dashed border-gray-700 rounded-3xl hover:border-purple-500 hover:bg-purple-500/5 transition-all cursor-pointer flex flex-col items-center justify-center group">
                 <div className="w-16 h-16 bg-[#1e1e1e] rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                    <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                 </div>
                 <h3 className="text-xl font-bold">Upload Video</h3>
                 <p className="text-sm text-gray-500 mt-2">MP4, MOV up to 50MB</p>
                 <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
             </label>
          </div>
      </div>
    );
  }

  // 2. Language Selection
  if (step === 2) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center p-4">
         <div className="max-w-4xl w-full text-center">
            <h2 className="text-3xl font-bold mb-12">Select Language Style</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                   { id: LanguageStyle.NATIVE, icon: '🇮🇳', title: 'Native Script', desc: 'Hindi, Telugu, etc.' },
                   { id: LanguageStyle.ROMANIZED, icon: '🅰️', title: 'Hinglish / Telglish', desc: 'English characters', badge: 'VIRAL' },
                   { id: LanguageStyle.ENGLISH, icon: '🇺🇸', title: 'English', desc: 'Translated captions' }
                ].map((opt) => (
                   <button 
                     key={opt.id}
                     onClick={() => handleProcessVideo(opt.id)}
                     className="bg-[#1e1e1e] border border-white/5 p-8 rounded-2xl hover:border-purple-500 hover:bg-purple-500/10 transition-all group relative"
                   >
                      {opt.badge && <span className="absolute top-0 right-0 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">{opt.badge}</span>}
                      <div className="text-4xl mb-6 group-hover:scale-110 transition-transform">{opt.icon}</div>
                      <h3 className="text-xl font-bold mb-2">{opt.title}</h3>
                      <p className="text-sm text-gray-500">{opt.desc}</p>
                   </button>
                ))}
            </div>
            <button onClick={() => setStep(1)} className="mt-12 text-gray-500 hover:text-white text-sm">Back</button>
         </div>
      </div>
    );
  }

  // 3. Processing
  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center flex-col">
         <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6"/>
         <h2 className="text-2xl font-bold animate-pulse">AI is Magic...</h2>
         <p className="text-gray-500 mt-2">Generating captions & aligning timestamps</p>
      </div>
    );
  }

  // 4. EDITOR (Main UI)
  return (
    <div className="flex h-screen w-screen bg-[#0f0f0f] text-white overflow-hidden font-montserrat">
       
       {/* Left Sidebar Navigation */}
       <aside className="w-[72px] flex-shrink-0 flex flex-col items-center py-6 border-r border-white/10 bg-[#121212] gap-2 z-20">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg mb-6 flex items-center justify-center font-bold text-sm">V</div>
          
          <SidebarItem id="timeline" icon={IconTimeline} label="Timeline" />
          <SidebarItem id="templates" icon={IconTemplate} label="Templates" />
          <SidebarItem id="styles" icon={IconStyle} label="Styles" />
          
          <div className="w-8 h-[1px] bg-white/10 my-2"/>
          
          <SidebarItem id="broll" icon={IconVideo} label="B-roll" />
          <SidebarItem id="ai" icon={IconMagic} label="AI Tools" />
       </aside>

       {/* Active Panel (Slide out) */}
       <div className="w-[360px] flex-shrink-0 border-r border-white/10 bg-[#121212] flex flex-col z-10 shadow-2xl">
          {activeTab === 'timeline' && <TimelinePanel />}
          {activeTab === 'templates' && <TemplatesPanel />}
          {activeTab === 'styles' && <StylesPanel />}
          {activeTab === 'ai' && <AIToolsPanel />}
          {activeTab === 'broll' && (
             <div className="flex items-center justify-center h-full text-gray-600 font-bold">Coming Soon</div>
          )}
       </div>

       {/* Video Preview Area */}
       <main className="flex-1 bg-black relative flex flex-col">
          
          {/* Top Bar */}
          <header className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-[#0f0f0f]">
             <div className="text-sm font-bold text-gray-400">Project: Untitled Video</div>
             <div className="flex gap-4">
                {isExporting ? (
                   <div className="px-6 py-2 bg-gray-800 rounded-full text-xs font-bold text-white flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                      Exporting {Math.round(exportProgress)}%
                   </div>
                ) : downloadUrl ? (
                   <a href={downloadUrl} download="viral-video.webm" className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-full text-xs font-bold text-white transition-colors">
                      Download Video
                   </a>
                ) : (
                   <button 
                     onClick={() => { setIsPlaying(false); setIsExporting(true); }}
                     className="px-6 py-2 bg-white text-black rounded-full text-xs font-bold hover:bg-gray-200 transition-colors"
                   >
                      Export
                   </button>
                )}
             </div>
          </header>

          {/* Canvas Area */}
          <div className="flex-1 flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a1a] to-black">
             <div className="relative shadow-2xl shadow-black rounded-2xl overflow-hidden border border-white/10 max-h-full aspect-[9/16]">
                 <VideoProcessor 
                   ref={videoProcessorRef}
                   videoSrc={videoSrc!}
                   captions={captions}
                   styleConfig={activeStyle}
                   isPlaying={isPlaying}
                   onTimeUpdate={setCurrentTime}
                   onDurationChange={setDuration}
                   isExporting={isExporting}
                   onExportComplete={(url) => {
                      setDownloadUrl(url);
                      setIsExporting(false);
                   }}
                   onExportProgress={setExportProgress}
                 />
             </div>
          </div>

          {/* Floating Playback Controls */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-3 bg-[#1e1e1e]/90 backdrop-blur-md border border-white/10 rounded-full shadow-xl z-30">
             <button onClick={() => { const v = document.querySelector('video'); if(v) v.currentTime -= 5; }} className="text-gray-400 hover:text-white">
               <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5"/></svg>
             </button>
             
             <button 
               onClick={() => setIsPlaying(!isPlaying)}
               className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform"
             >
                {isPlaying ? (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24" className="ml-1"><path d="M8 5v14l11-7z"/></svg>
                )}
             </button>
             
             <button onClick={() => { const v = document.querySelector('video'); if(v) v.currentTime += 5; }} className="text-gray-400 hover:text-white">
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 17l5-5-5-5M6 17l5-5-5-5"/></svg>
             </button>

             <div className="w-px h-8 bg-white/10 mx-2"/>
             
             <div className="text-xs font-mono font-bold text-gray-400 w-24 text-center">
                {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
             </div>
          </div>

          {/* Support FAB */}
          <button className="absolute bottom-8 right-8 w-12 h-12 bg-[#a855f7] rounded-full flex items-center justify-center shadow-lg shadow-purple-900/50 hover:scale-110 transition-transform z-30">
             <svg width="24" height="24" fill="white" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
          </button>
       </main>
    </div>
  );
};

export default App;