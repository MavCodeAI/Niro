import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface GeneratedVideo {
  url: string;
  prompt: string;
  timestamp: number;
}

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) {
      setVideoHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...videoHistory].slice(0, 5); // Keep last 5 videos
    setVideoHistory(newHistory);
    localStorage.setItem("videoHistory", JSON.stringify(newHistory));
  };

  const examplePrompts = [
    "A cat riding a skateboard in space, high resolution",
    "Sunset over mountains with birds flying, cinematic",
    "Robot dancing in a futuristic city, neon lights",
    "Ocean waves crashing on a beach at golden hour",
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the video",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setCurrentPrompt(prompt);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const encodedPrompt = encodeURIComponent(prompt.trim());
      const apiUrl = `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodedPrompt}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const jsonData = await response.json();
      
      if (!jsonData.success || !jsonData.url) {
        throw new Error(jsonData.error || "Invalid API response");
      }

      const videoUrl = jsonData.url;
      setVideoUrl(videoUrl);
      setProgress(100);
      
      saveToHistory({
        url: videoUrl,
        prompt: prompt.trim(),
        timestamp: Date.now(),
      });
      
      toast({
        title: "Success!",
        description: "Your video is ready",
      });
      
    } catch (error) {
      console.error("Error generating video:", error);
      
      let errorMessage = "There was a problem generating the video. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes("429")) {
          errorMessage = "Too many requests. Please try again later.";
        } else if (error.message.includes("500")) {
          errorMessage = "Server error. Please try again.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      clearInterval(progressInterval);
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!videoUrl) return;
    
    try {
      toast({
        title: "Starting download...",
        description: "Please wait",
      });

      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download successful!",
        description: "The video has been saved to your device",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Error",
        description: "There was an issue downloading the video. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (!videoUrl) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Generated Video",
          text: currentPrompt,
          url: window.location.href,
        });
        toast({
          title: "Shared!",
          description: "The video was shared successfully",
        });
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Copied!",
          description: "Link copied to clipboard",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem("videoHistory");
    toast({
      title: "Cleared",
      description: "All history has been deleted",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 bg-[var(--gradient-card)] backdrop-blur-xl border-border shadow-[var(--shadow-card)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Write your video description
            </label>
            <Textarea
              id="prompt"
              placeholder="Example: A cat riding a skateboard in space, high resolution"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base resize-none bg-background/50 backdrop-blur"
              disabled={isGenerating}
            />
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating...</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            variant="hero"
            className="w-full text-base font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating video...
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                Generate Video
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Example Prompts */}
      <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          Example Prompts
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {examplePrompts.map((example, index) => (
            <button
              key={index}
              onClick={() => setPrompt(example)}
              className="text-left p-3 rounded-lg bg-background/30 hover:bg-background/50 border border-border/50 transition-all duration-200 hover:scale-[1.02] text-sm"
              disabled={isGenerating}
            >
              {example}
            </button>
          ))}
        </div>
      </Card>

      {/* Video Preview */}
      {videoUrl && (
        <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Your Video
          </h3>
          
          {currentPrompt && (
            <p className="text-sm text-muted-foreground mb-4 p-3 bg-background/30 rounded-lg border border-border/50">
              <strong>Prompt:</strong> {currentPrompt}
            </p>
          )}
          
          <div className="relative rounded-lg overflow-hidden bg-background/20">
            <video
              src={videoUrl}
              controls
              className="w-full h-auto max-h-[500px] object-contain"
              autoPlay
              loop
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleDownload}
              variant="secondary"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <Button
              onClick={() => {
                setPrompt(currentPrompt);
                handleGenerate();
              }}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </Button>
            <Button
              onClick={() => {
                setVideoUrl(null);
                setPrompt("");
                setCurrentPrompt("");
              }}
              variant="outline"
              className="gap-2"
            >
              <Video className="h-4 w-4" />
              New Video
            </Button>
          </div>
        </Card>
      )}

      {/* Video History */}
      {videoHistory.length > 0 && (
        <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              Recent Videos
            </h3>
            <Button
              onClick={clearHistory}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {videoHistory.map((video, index) => (
              <div
                key={index}
                className="group relative rounded-lg overflow-hidden bg-background/30 border border-border/50 hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => {
                  setVideoUrl(video.url);
                  setCurrentPrompt(video.prompt);
                  setPrompt(video.prompt);
                }}
              >
                <video
                  src={video.url}
                  className="w-full h-32 object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-3">
                  <p className="text-xs text-foreground/90 line-clamp-2">{video.prompt}</p>
                </div>
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs">
                  {new Date(video.timestamp).toLocaleDateString('en-US')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
