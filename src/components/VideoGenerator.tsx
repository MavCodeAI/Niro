import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw, Timer } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface GeneratedVideo {
  url: string;
  prompt: string;
  timestamp: number;
  duration: string;
}

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("4s");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [currentDuration, setCurrentDuration] = useState("4s");
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

  const durationOptions = [
    { value: "4s", label: "4 seconds" },
    { value: "8s", label: "8 seconds" },
    { value: "15s", label: "15 seconds" },
    { value: "30s", label: "30 seconds" },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a video description",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setCurrentPrompt(prompt);
    setCurrentDuration(duration);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      // Create enhanced prompt with duration
      const enhancedPrompt = `${prompt.trim()}, duration: ${duration}`;
      const encodedPrompt = encodeURIComponent(enhancedPrompt);
      const apiUrl = `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodedPrompt}`;
      
      console.log("Fetching video from:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "GET",
      });
      
      console.log("Response status:", response.status);
      console.log("Response content-type:", response.headers.get("content-type"));
      
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = `API Error: ${response.status}`;
        try {
          const errorText = await response.text();
          console.log("Error response:", errorText);
          
          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch {
          // Ignore if we can't read the error
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type") || "";
      console.log("Content type:", contentType);

      // Check if response is JSON (error or URL response)
      if (contentType.includes("application/json") || contentType.includes("text")) {
        const jsonData = await response.json();
        console.log("JSON response:", jsonData);
        
        // Check if there's an error in JSON
        if (jsonData.error) {
          throw new Error(jsonData.error);
        }
        
        // Check if there's a video URL in response
        if (jsonData.url || jsonData.video_url || jsonData.videoUrl) {
          const videoUrlFromApi = jsonData.url || jsonData.video_url || jsonData.videoUrl;
          setVideoUrl(videoUrlFromApi);
          setProgress(100);
          
          saveToHistory({
            url: videoUrlFromApi,
            prompt: prompt.trim(),
            duration: duration,
            timestamp: Date.now(),
          });
          
          toast({
            title: "Success!",
            description: "Your video has been generated",
          });
          return;
        }
        
        throw new Error("Invalid API response format");
      }

      // Handle video blob response
      if (contentType.includes("video") || contentType.includes("octet-stream")) {
        const blob = await response.blob();
        console.log("Blob received:", blob.size, "bytes");
        
        if (blob.size === 0) {
          throw new Error("Received empty video file");
        }
        
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setProgress(100);

        saveToHistory({
          url,
          prompt: prompt.trim(),
          duration: duration,
          timestamp: Date.now(),
        });

        toast({
          title: "Success!",
          description: "Your video has been generated",
        });
        return;
      }

      // If we get here, unknown response type
      throw new Error(`Unexpected response type: ${contentType}`);
      
    } catch (error) {
      console.error("Error generating video:", error);
      
      let errorMessage = "Error generating video. Please try again";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection";
        } else if (error.message.includes("API Error: 429")) {
          errorMessage = "Too many requests. Please try again later";
        } else if (error.message.includes("API Error: 500")) {
          errorMessage = "Server error. Please try again";
        } else {
          errorMessage = error.message;
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
          description: "Video shared successfully",
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
      description: "All history deleted",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 bg-[var(--gradient-card)] backdrop-blur-xl border-border shadow-[var(--shadow-card)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Describe your video
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

          {/* Duration Selection */}
          <div className="space-y-3">
            <label className="text-lg font-semibold flex items-center gap-2">
              <Timer className="h-5 w-5 text-accent" />
              Video Duration
            </label>
            <Select value={duration} onValueChange={setDuration} disabled={isGenerating}>
              <SelectTrigger className="w-full bg-background/50 backdrop-blur">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                Generating Video...
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
            <div className="mb-4 space-y-2">
              <p className="text-sm text-muted-foreground p-3 bg-background/30 rounded-lg border border-border/50">
                <strong>Prompt:</strong> {currentPrompt}
              </p>
              <p className="text-sm text-muted-foreground p-3 bg-background/30 rounded-lg border border-border/50">
                <strong>Duration:</strong> {currentDuration}
              </p>
            </div>
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
              onClick={() => {
                const a = document.createElement("a");
                a.href = videoUrl;
                a.download = `niro-video-${Date.now()}.mp4`;
                a.click();
              }}
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
                setDuration(currentDuration);
                handleGenerate();
              }}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Regenerate
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
                  setCurrentDuration(video.duration);
                  setPrompt(video.prompt);
                  setDuration(video.duration);
                }}
              >
                <video
                  src={video.url}
                  className="w-full h-32 object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-3">
                  <div className="space-y-1">
                    <p className="text-xs text-foreground/90 line-clamp-2">{video.prompt}</p>
                    <p className="text-xs text-foreground/70">{video.duration}</p>
                  </div>
                </div>
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs">
                  {new Date(video.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};