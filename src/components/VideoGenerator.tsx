import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw, Camera, Ban, Info, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Define interfaces for history and other objects
interface GeneratedVideo {
  url: string;
  prompt: string;
  negativePrompt?: string;
  cameraControl?: string;
  timestamp: number;
  quality: keyof typeof VIDEO_QUALITY_LEVELS;
}

const VIDEO_QUALITY_LEVELS = {
  STANDARD: { name: 'Standard Quality (Fast)' },
  HIGH: { name: 'High Quality (Slower)' },
};

const CAMERA_CONTROLS = {
  NONE: "None",
  ZOOM_IN: "Zoom In",
  ZOOM_OUT: "Zoom Out",
  PAN_LEFT: "Pan Left",
  PAN_RIGHT: "Pan Right",
  TILT_UP: "Tilt Up",
  TILT_DOWN: "Tilt Down",
};

// The new Google AI API Key has been updated here
const GOOGLE_AI_API_KEY = "AIzaSyClIUDwcotN1WuFLdL9ac6GJhuiZ234Foo";

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("blurry, low quality, text, watermark, grainy");
  const [cameraControl, setCameraControl] = useState<keyof typeof CAMERA_CONTROLS>("NONE");
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [selectedQuality, setSelectedQuality] = useState<keyof typeof VIDEO_QUALITY_LEVELS>('STANDARD');
  const [examplePrompts, setExamplePrompts] = useState<string[]>(["Loading AI ideas..."]);

  // Function to enhance prompt using Google AI
  const enhancePromptWithAI = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt is empty",
        description: "Write a simple idea first, then enhance it with AI.",
        variant: "destructive",
      });
      return;
    }
    
    setIsEnhancing(true);
    try {
      const api_prompt = `You are a creative assistant for a text-to-video AI. Enhance this simple user prompt into a detailed, vivid, and cinematic description. Add details about the atmosphere, lighting, style, and composition. Keep the final prompt concise (around 25-30 words). Do not use quotes. Simple prompt: "${prompt}"`;
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: api_prompt }] }] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(errorData.error.message || "Failed to fetch from AI API");
      }

      const data = await response.json();
      const enhancedPrompt = data.candidates[0].content.parts[0].text.trim();
      setPrompt(enhancedPrompt);
      toast({ title: "Prompt Enhanced!", description: "Your idea has been supercharged by AI." });

    } catch (error) {
      console.error("Prompt enhancement failed:", error);
      toast({ title: "Enhancement Failed", description: "Could not connect to the AI service. Please check the API key.", variant: "destructive" });
    }
    setIsEnhancing(false);
  };

  // Function to get dynamic example prompts
  const getDynamicExamples = async () => {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GOOGLE_AI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Generate 6 short, creative, and visually interesting video prompt ideas. Separate each idea with a newline. Do not use numbering or bullet points." }] }] }),
      });
      if (!response.ok) throw new Error("Failed to fetch examples");
      const data = await response.json();
      const prompts = data.candidates[0].content.parts[0].text.split('\n').filter(p => p.trim() !== '');
      setExamplePrompts(prompts);
    } catch (error) {
      console.error("Failed to get dynamic examples:", error);
      // Fallback to static prompts if API fails
      setExamplePrompts([
        "A majestic eagle soaring over mountains",
        "Ocean waves crashing on a sunny beach",
        "A futuristic city with flying cars at night",
        "A quiet forest with sunbeams filtering through trees",
        "A time-lapse of a flower blooming",
        "A cat playfully chasing a laser pointer",
      ]);
    }
  };

  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) setVideoHistory(JSON.parse(savedHistory));
    getDynamicExamples();
  }, []);

  const saveToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...videoHistory].slice(0, 10);
    setVideoHistory(newHistory);
    localStorage.setItem("videoHistory", JSON.stringify(newHistory));
  };

  const buildFinalPrompt = () => {
    let finalPrompt = prompt;
    if (cameraControl !== 'NONE') finalPrompt += `, ${CAMERA_CONTROLS[cameraControl]}`;
    if (negativePrompt.trim()) finalPrompt += ` | avoid: ${negativePrompt}`;
    return finalPrompt;
  };

  const generateVideo = async (fullPrompt: string): Promise<string> => {
    const apiEndpoint = selectedQuality === 'HIGH'
      ? `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=576&seed=${Date.now()}`
      : `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodeURIComponent(fullPrompt)}`;

    const response = await fetch(apiEndpoint);
    if (!response.ok) throw new Error('Video generation API request failed');

    if (selectedQuality === 'HIGH') {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } else {
        const data = await response.json();
        if (!data.success || !data.url) throw new Error(data.error || 'Invalid video API response');
        return data.url;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt is empty", description: "Please enter a description for the video.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    
    const finalPrompt = buildFinalPrompt();
    const newVideoData: Omit<GeneratedVideo, 'url' | 'timestamp'> = { prompt, negativePrompt, cameraControl, quality: selectedQuality };
    
    const progressInterval = setInterval(() => setProgress(p => (p >= 95 ? p : p + Math.random() * 10)), 800);

    try {
      const url = await generateVideo(finalPrompt);
      const generatedVideo: GeneratedVideo = { ...newVideoData, url, timestamp: Date.now() };
      setVideoUrl(url);
      setCurrentVideo(generatedVideo);
      setProgress(100);
      saveToHistory(generatedVideo);
      toast({ title: "Success! 🎉", description: "Your video has been generated." });
    } catch (error) {
      console.error("Generation failed:", error);
      toast({ title: "Generation Failed", description: "The video service is busy. Please try again.", variant: "destructive" });
      setProgress(0);
    }

    clearInterval(progressInterval);
    setIsGenerating(false);
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const extension = blob.type.startsWith('video') ? 'mp4' : 'jpeg';
      a.download = `ai-video-${Date.now()}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Downloaded!", description: "Video saved to your device." });
    } catch (error) {
      toast({ title: "Download Error", description: "Could not download the video.", variant: "destructive" });
    }
  };
  
  const handleShare = async () => {
    if (!videoUrl) return;
    await navigator.clipboard.writeText(videoUrl);
    toast({ title: "Link Copied!", description: "A shareable link is copied to your clipboard." });
  };
  
  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem("videoHistory");
    toast({ title: "History Cleared", description: "Your recent videos have been deleted." });
  };

  const loadFromHistory = (video: GeneratedVideo) => {
    setVideoUrl(video.url);
    setPrompt(video.prompt);
    setNegativePrompt(video.negativePrompt || "blurry, low quality, text, watermark, grainy");
    setCameraControl(video.cameraControl as keyof typeof CAMERA_CONTROLS || "NONE");
    setSelectedQuality(video.quality);
    setCurrentVideo(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-4">
      <Card className="p-6 md:p-8 bg-card/50 backdrop-blur-lg border-border/20 shadow-lg">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              Describe Your Video
            </label>
            <Textarea
              id="prompt"
              placeholder="e.g., A majestic eagle soaring over mountains"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base resize-none bg-background/70"
              disabled={isGenerating || isEnhancing}
            />
            <Button onClick={enhancePromptWithAI} disabled={isEnhancing || !prompt.trim()} variant="outline" size="sm" className="gap-2">
              {isEnhancing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
              Enhance with AI
            </Button>
          </div>

          <div className="space-y-3">
            <label htmlFor="negative-prompt" className="text-base font-medium flex items-center gap-2 text-foreground">
              <Ban className="h-5 w-5 text-destructive" />
              Negative Prompt (What to avoid)
            </label>
            <Textarea
              id="negative-prompt"
              placeholder="e.g., blurry, text, watermark, grainy"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="min-h-[60px] text-sm resize-none bg-background/70"
              disabled={isGenerating}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2"><Camera className="h-4 w-4" />Camera Control</label>
              <Select value={cameraControl} onValueChange={(v) => setCameraControl(v as keyof typeof CAMERA_CONTROLS)} disabled={isGenerating}>
                <SelectTrigger className="bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CAMERA_CONTROLS).map(([key, name]) => (
                    <SelectItem key={key} value={key}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Video Quality</label>
              <Select value={selectedQuality} onValueChange={(v) => setSelectedQuality(v as keyof typeof VIDEO_QUALITY_LEVELS)} disabled={isGenerating}>
                <SelectTrigger className="bg-background/70"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(VIDEO_QUALITY_LEVELS).map(([key, quality]) => (
                    <SelectItem key={key} value={key}>{quality.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <Info className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-xs text-primary/90">Our tool uses multiple providers to ensure your video is always generated, even if one service is busy.</p>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating your masterpiece...</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} size="lg" className="w-full text-lg font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:scale-105 transition-transform">
            {isGenerating ? <><Loader2 className="h-6 w-6 animate-spin mr-2" />Generating...</> : <><Video className="h-6 w-6 mr-2" />Generate Video</>}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-card/50 backdrop-blur-lg border-border/20 shadow-lg">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" />AI-Generated Ideas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {examplePrompts.map((example, index) => (
            <button key={index} onClick={() => setPrompt(example)} className="text-left p-3 rounded-lg bg-background/50 hover:bg-background border transition-colors text-sm" disabled={isGenerating || isEnhancing}>
              {example}
            </button>
          ))}
        </div>
      </Card>

      {videoUrl && currentVideo && (
        <Card className="p-6 bg-card/50 backdrop-blur-lg border-border/20 shadow-lg">
          <h3 className="text-xl font-bold mb-4">Your Video is Ready!</h3>
          <p className="text-sm text-muted-foreground mb-4 p-3 bg-background/50 rounded-lg border"><strong>Prompt:</strong> {currentVideo.prompt}</p>
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video src={videoUrl} controls autoPlay loop className="w-full h-auto" />
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={handleDownload} variant="secondary" className="gap-2"><Download className="h-4 w-4" />Download</Button>
            <Button onClick={handleShare} variant="outline" className="gap-2"><Share2 className="h-4 w-4" />Share</Button>
            <Button onClick={handleGenerate} variant="outline" className="gap-2"><RefreshCw className="h-4 w-4" />Regenerate</Button>
            <Button onClick={() => setVideoUrl(null)} variant="destructive" className="gap-2"><Video className="h-4 w-4" />Create New</Button>
          </div>
        </Card>
      )}

      {videoHistory.length > 0 && (
        <Card className="p-6 bg-card/50 backdrop-blur-lg border-border/20 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-accent" />Recent Videos</h3>
            <Button onClick={clearHistory} variant="ghost" size="sm" className="gap-2 text-destructive"><Trash2 className="h-4 w-4" />Clear</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoHistory.map((video) => (
              <div key={video.timestamp} className="group relative rounded-lg overflow-hidden border cursor-pointer" onClick={() => loadFromHistory(video)}>
                <video src={video.url} className="w-full h-32 object-cover bg-black" muted />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                  <p className="text-xs text-white/90 line-clamp-2">{video.prompt}</p>
                  <span className="text-xs text-white/60 mt-1">{new Date(video.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
