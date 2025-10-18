import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Clock, Trash2, RefreshCw, Camera, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { useClerkAuth } from "@/contexts/ClerkAuthContext";
import { supabase } from "@/integrations/supabase/client";

// Define interfaces for history and other objects
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

// Static fallback prompts
const FALLBACK_PROMPTS = [
    "A majestic eagle soaring over mountains, cinematic lighting",
    "Ocean waves crashing on a sunny beach, hyperrealistic",
    "A futuristic city with flying cars at night, neon-drenched",
    "A quiet, enchanted forest with glowing mushrooms",
    "A time-lapse of a flower blooming, vibrant colors",
    "A cat playfully chasing a shimmering butterfly",
];

export const VideoGenerator = () => {
  const navigate = useNavigate();
  const { isSignedIn, userId, userStats, refreshUserStats } = useClerkAuth();
  
  const [prompt, setPrompt] = useState("");
  const [negativePrompt] = useState("blurry, low quality, text, watermark, grainy, deformed, ugly");
  const [cameraControl, setCameraControl] = useState<keyof typeof CAMERA_CONTROLS>("NONE");
  
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [examplePrompts, setExamplePrompts] = useState<string[]>(FALLBACK_PROMPTS);

  const remainingCredits = userStats ? userStats.totalDailyLimit - userStats.dailyVideosUsed : 0;
  const canGenerate = isSignedIn && remainingCredits > 0;

  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) {
      setVideoHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...videoHistory].slice(0, 10);
    setVideoHistory(newHistory);
    localStorage.setItem("videoHistory", JSON.stringify(newHistory));
  };

  const buildFinalPrompt = () => {
    let finalPrompt = prompt;
    if (cameraControl !== 'NONE') {
      finalPrompt += `, ${CAMERA_CONTROLS[cameraControl]}`;
    }
    if (negativePrompt.trim()) {
      finalPrompt += ` | avoid: ${negativePrompt}`;
    }
    return finalPrompt;
  };

  // Simplified to use only one provider (Yabes)
  const generateVideo = async (fullPrompt: string): Promise<string> => {
    const apiEndpoint = `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodeURIComponent(fullPrompt)}`;
    const response = await fetch(apiEndpoint);
    if (!response.ok) throw new Error('Video generation API request failed');
    
    const data = await response.json();
    if (!data.success || !data.url) throw new Error(data.error || 'Invalid video API response');
    return data.url;
  };

  const handleGenerate = async () => {
    if (!isSignedIn) {
      toast({ title: "Sign In Required", description: "Please sign in to generate videos.", variant: "destructive" });
      navigate("/sign-in");
      return;
    }

    if (remainingCredits <= 0) {
      toast({ 
        title: "Daily Limit Reached", 
        description: "You've used all your daily credits. Invite friends to get more!", 
        variant: "destructive" 
      });
      return;
    }

    if (!prompt.trim()) {
      toast({ title: "Prompt is empty", description: "Please enter a description for the video.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    
    const finalPrompt = buildFinalPrompt();
    const newVideoData: Omit<GeneratedVideo, 'url' | 'timestamp'> = { prompt, cameraControl };
    
    const progressInterval = setInterval(() => setProgress(p => (p >= 95 ? p : p + Math.random() * 10)), 800);

    try {
      const url = await generateVideo(finalPrompt);
      const generatedVideo: GeneratedVideo = { ...newVideoData, url, timestamp: Date.now() };
      setVideoUrl(url);
      setCurrentVideo(generatedVideo);
      setProgress(100);
      saveToHistory(generatedVideo);

      // Save to database and update usage
      if (userId) {
        await supabase.from('video_history').insert({
          clerk_user_id: userId,
          prompt,
          camera_control: cameraControl === 'NONE' ? null : cameraControl,
          video_url: url,
        });

        await supabase
          .from('user_stats')
          .update({
            daily_videos_used: (userStats?.dailyVideosUsed || 0) + 1,
          })
          .eq('clerk_user_id', userId);

        await refreshUserStats();
      }

      toast({ title: "Success! 🎉", description: "Your video has been generated." });
    } catch (error) {
      console.error("Generation failed:", error);
      toast({ title: "Generation Failed", description: "The video service is busy. Please try again.", variant: "destructive" });
      setProgress(0);
    }

    clearInterval(progressInterval);
    setIsGenerating(false);
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    window.open(videoUrl, '_blank');
    toast({
      title: "Opening Video in New Tab",
      description: "Right-click on the video and choose 'Save video as...' to download.",
    });
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
    setCameraControl(video.cameraControl as keyof typeof CAMERA_CONTROLS || "NONE");
    setCurrentVideo(video);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 p-4">
      {isSignedIn && userStats && (
        <Card className="p-4 bg-card/80 backdrop-blur-lg border-border/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <span className="font-semibold">Daily Credits:</span>
              <span className="text-lg font-bold text-primary">
                {remainingCredits} / {userStats.totalDailyLimit}
              </span>
            </div>
            {remainingCredits === 0 && (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Limit reached!</span>
              </div>
            )}
          </div>
          {userStats.totalReferrals > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              🎉 You have {userStats.totalReferrals} referral{userStats.totalReferrals > 1 ? 's' : ''} 
              (+{userStats.totalDailyLimit - 10} bonus credits)
            </p>
          )}
        </Card>
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
              disabled={isGenerating || !isSignedIn}
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
                <span className="text-muted-foreground">Generating your masterpiece...</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim() || !canGenerate} 
            size="lg" 
            className="w-full text-lg font-bold bg-gradient-to-r from-primary to-accent text-primary-foreground hover:shadow-lg hover:scale-105 transition-transform disabled:opacity-50"
          >
            {!isSignedIn ? (
              <>Sign In to Generate</>
            ) : isGenerating ? (
              <><Loader2 className="h-6 w-6 animate-spin mr-2" />Generating...</>
            ) : remainingCredits === 0 ? (
              <>Daily Limit Reached</>
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
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button onClick={handleDownload} variant="secondary" className="gap-2"><Download className="h-4 w-4" />Download</Button>
            <Button onClick={handleGenerate} variant="outline" className="gap-2" disabled={!canGenerate}><RefreshCw className="h-4 w-4" />Regenerate</Button>
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
