import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// (Interfaces, Constants, etc. remain the same)
interface GeneratedVideo {
  url: string;
  prompt: string;
  cameraControl?: string;
  timestamp: number;
}

const CAMERA_CONTROLS = {
  NONE: "None",
  ZOOM_IN: "Zoom In",
  ZOOM_OUT: "Zoom Out",
  PAN_LEFT: "Pan Left",
  PAN_RIGHT: "Pan Right",
  TILT_UP: "Tilt Up",
  TILT_DOWN: "Tilt Down",
};

const FALLBACK_PROMPTS = [
    "A majestic eagle soaring over mountains, cinematic lighting",
    "Ocean waves crashing on a sunny beach, hyperrealistic",
    "A futuristic city with flying cars at night, neon-drenched",
    "A quiet, enchanted forest with glowing mushrooms",
    "A time-lapse of a flower blooming, vibrant colors",
    "A cat playfully chasing a shimmering butterfly",
];

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt] = useState("blurry, low quality, text, watermark, grainy, deformed, ugly");
  const [cameraControl, setCameraControl] = useState<keyof typeof CAMERA_CONTROLS>("NONE");
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [examplePrompts] = useState<string[]>(FALLBACK_PROMPTS);

  // --- NEW: Function to apply a moving watermark ---
  const applyWatermark = async (videoSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoSrc;
      video.crossOrigin = "anonymous"; // Necessary for loading external media in canvas

      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error("Canvas context not available"));

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const stream = canvas.captureStream();
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };
        recorder.onerror = reject;

        recorder.start();

        let frameCount = 0;
        const totalFrames = video.duration * 30; // Assuming 30fps
        const watermarkPositions = [
          { x: 0.95, y: 0.10, align: 'right' }, // Top-right
          { x: 0.05, y: 0.90, align: 'left' },  // Bottom-left
          { x: 0.95, y: 0.90, align: 'right' }, // Bottom-right
          { x: 0.05, y: 0.10, align: 'left' },  // Top-left
        ];
        
        const drawFrame = () => {
          if (video.paused || video.ended) {
            recorder.stop();
            return;
          }
          
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Watermark style
          const fontSize = Math.max(16, canvas.width / 50);
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Semi-transparent white

          // Change position every 2 seconds
          const posIndex = Math.floor(video.currentTime / 2) % watermarkPositions.length;
          const pos = watermarkPositions[posIndex];
          ctx.textAlign = pos.align as CanvasTextAlign;
          ctx.fillText("Nero", canvas.width * pos.x, canvas.height * pos.y);
          
          frameCount++;
          requestAnimationFrame(drawFrame);
        };

        video.play();
        drawFrame();
      };

      video.onerror = () => reject(new Error("Failed to load video for watermarking."));
    });
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({ title: "Prompt is empty", description: "Please enter a description for the video.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    
    try {
      // Step 1: Generate the video
      setStatusText("Generating video...");
      const finalPrompt = buildFinalPrompt();
      const rawVideoUrl = await generateVideo(finalPrompt);
      setProgress(50);
      
      // Step 2: Apply the watermark
      setStatusText("Applying watermark...");
      const watermarkedVideoUrl = await applyWatermark(rawVideoUrl);
      setProgress(100);
      
      const newVideoData: GeneratedVideo = { prompt, cameraControl, url: watermarkedVideoUrl, timestamp: Date.now() };
      setVideoUrl(watermarkedVideoUrl);
      setCurrentVideo(newVideoData);
      saveToHistory(newVideoData);
      
      toast({ title: "Success! 🎉", description: "Your watermarked video is ready." });

    } catch (error) {
      console.error("Generation failed:", error);
      toast({ title: "Generation Failed", description: "An error occurred. Please try again.", variant: "destructive" });
      setProgress(0);
    }

    setIsGenerating(false);
    setStatusText("");
  };

  // --- The rest of the functions (buildFinalPrompt, generateVideo, etc.) remain the same ---
  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) setVideoHistory(JSON.parse(savedHistory));
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
    const apiEndpoint = `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodeURIComponent(fullPrompt)}`;
    const response = await fetch(apiEndpoint);
    if (!response.ok) throw new Error('Video generation API request failed');
    const data = await response.json();
    if (!data.success || !data.url) throw new Error(data.error || 'Invalid API response');
    return data.url;
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `nero-ai-video-${Date.now()}.webm`;
    document.body.appendChild(a);
a.click();
    document.body.removeChild(a);
    toast({ title: "Download Started", description: "Your video is being saved." });
  };
  
  const handleShare = async () => {
    if (!videoUrl) return;
    await navigator.clipboard.writeText(videoUrl);
    toast({ title: "Link Copied!", description: "A shareable link is copied to your clipboard." });
  };
  
  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem("videoHistory");
    toast({ title: "History Cleared" });
  };

  const loadFromHistory = (video: GeneratedVideo) => {
    setVideoUrl(video.url);
    setPrompt(video.prompt);
    setCameraControl(video.cameraControl as keyof typeof CAMERA_CONTROLS || "NONE");
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
              disabled={isGenerating}
            />
          </div>

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

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{statusText || "Processing..."}</span>
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
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-accent" />Example Ideas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {examplePrompts.map((example, index) => (
            <button key={index} onClick={() => setPrompt(example)} className="text-left p-3 rounded-lg bg-background/50 hover:bg-background border transition-colors text-sm" disabled={isGenerating}>
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
