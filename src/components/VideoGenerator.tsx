import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Clock, Trash2, RefreshCw, Camera, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

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
  const { user } = useAuth();
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
  const [userStats, setUserStats] = useState<any>(null);
  const [canGenerate, setCanGenerate] = useState(true);

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

    if (!canGenerate) {
      toast({ 
        title: "Daily limit reached", 
        description: "You've used all your daily video credits. Invite friends to earn more!",
        variant: "destructive" 
      });
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
      
      // Save to database
      if (user) {
        await supabase.from("video_history").insert({
          user_id: user.id,
          prompt: prompt,
          camera_control: cameraControl !== 'NONE' ? cameraControl : null,
          video_url: watermarkedVideoUrl
        });

        // Update usage stats
        await supabase
          .from("user_stats")
          .update({ 
            daily_videos_used: userStats.daily_videos_used + 1 
          })
          .eq("user_id", user.id);

        await fetchUserStats();
      }
      
      const newVideoData: GeneratedVideo = { prompt, cameraControl, url: watermarkedVideoUrl, timestamp: Date.now() };
      setVideoUrl(watermarkedVideoUrl);
      setCurrentVideo(newVideoData);
      
      toast({ title: "Success! 🎉", description: "Your watermarked video is ready." });

    } catch (error) {
      console.error("Generation failed:", error);
      toast({ title: "Generation Failed", description: "An error occurred. Please try again.", variant: "destructive" });
      setProgress(0);
    }

    setIsGenerating(false);
    setStatusText("");
  };

  const fetchUserStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      // Check if we need to reset daily usage
      const lastReset = new Date(data.last_reset_at);
      const now = new Date();
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset daily usage
        await supabase
          .from("user_stats")
          .update({
            daily_videos_used: 0,
            last_reset_at: now.toISOString()
          })
          .eq("user_id", user.id);

        const resetStats = { ...data, daily_videos_used: 0, last_reset_at: now.toISOString() };
        setUserStats(resetStats);
        setCanGenerate(true);
      } else {
        setUserStats(data);
        const totalLimit = data.base_daily_limit + data.bonus_credits;
        setCanGenerate(data.daily_videos_used < totalLimit);
      }
    }
  };

  const fetchVideoHistory = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("video_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (!error && data) {
      setVideoHistory(data.map(v => ({
        url: v.video_url,
        prompt: v.prompt,
        cameraControl: v.camera_control || undefined,
        timestamp: new Date(v.created_at).getTime()
      })));
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserStats();
      fetchVideoHistory();
    }
  }, [user]);

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
  
  const clearHistory = async () => {
    if (!user) return;
    
    await supabase
      .from("video_history")
      .delete()
      .eq("user_id", user.id);
    
    setVideoHistory([]);
    toast({ title: "History Cleared" });
  };

  const loadFromHistory = (video: GeneratedVideo) => {
    setVideoUrl(video.url);
    setPrompt(video.prompt);
    setCameraControl(video.cameraControl as keyof typeof CAMERA_CONTROLS || "NONE");
    setCurrentVideo(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalLimit = userStats ? userStats.base_daily_limit + userStats.bonus_credits : 10;
  const remaining = userStats ? totalLimit - userStats.daily_videos_used : 10;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-4">
      {/* Usage Stats Alert */}
      {userStats && (
        <Alert className={`${!canGenerate ? 'border-destructive/50 bg-destructive/10' : 'border-primary/50 bg-primary/10'}`}>
          <AlertCircle className={`h-4 w-4 ${!canGenerate ? 'text-destructive' : 'text-primary'}`} />
          <AlertDescription>
            {canGenerate ? (
              <>You have <strong>{remaining}</strong> of <strong>{totalLimit}</strong> daily videos remaining</>
            ) : (
              <>Daily limit reached! Invite friends to earn +2 credits per referral</>
            )}
          </AlertDescription>
        </Alert>
      )}

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

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim() || !canGenerate} 
            size="lg" 
            className="w-full text-lg font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <><Loader2 className="h-6 w-6 animate-spin mr-2" />Generating...</>
            ) : !canGenerate ? (
              <><AlertCircle className="h-6 w-6 mr-2" />Daily Limit Reached</>
            ) : (
              <><Video className="h-6 w-6 mr-2" />Generate Video</>
            )}
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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            <Button onClick={handleDownload} variant="secondary" className="gap-2"><Download className="h-4 w-4" />Download</Button>
            <Button onClick={handleGenerate} variant="outline" className="gap-2" disabled={!canGenerate}>
              <RefreshCw className="h-4 w-4" />Regenerate
            </Button>
            <Button onClick={() => setVideoUrl(null)} variant="outline" className="gap-2"><Video className="h-4 w-4" />Create New</Button>
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
