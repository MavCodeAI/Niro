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

  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) {
      setVideoHistory(JSON.parse(savedHistory));
    }
  }, []);

  const saveToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...videoHistory].slice(0, 5);
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
        description: "Please enter a prompt to generate a video.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setCurrentPrompt(prompt);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? prev : prev + Math.random() * 15));
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

      const generatedVideoUrl = jsonData.url;
      setVideoUrl(generatedVideoUrl);
      setProgress(100);
      
      saveToHistory({
        url: generatedVideoUrl,
        prompt: prompt.trim(),
        timestamp: Date.now(),
      });
      
      toast({
        title: "Success!",
        description: "Your video has been generated.",
      });
      
    } catch (error) {
      console.error("Error generating video:", error);
      
      let errorMessage = "Failed to generate video. Please try again.";
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "Network error. Please check your internet connection.";
        } else if (error.message.includes("429")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.message.includes("500")) {
          errorMessage = "Server error. Please try again later.";
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

    setIsDownloading(true);
    setDownloadProgress(0);

    toast({
      title: "Preparing Download...",
      description: "Fetching video data...",
    });

    try {
      const response = await fetch(videoUrl);
      if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to read video stream");

      const contentLength = +response.headers.get("Content-Length")!;
      let receivedLength = 0;
      const chunks = [];

      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          receivedLength += value.length;
          setDownloadProgress(Math.round((receivedLength / contentLength) * 100));
        }
      }

      const blob = new Blob(chunks, { type: "video/mp4" });
      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = `ai-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();

      URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      toast({
        title: "Download Completed!",
        description: "Your video has been saved.",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "Could not download the video.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleShare = async () => {
    if (!videoUrl) return;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "AI Generated Video",
          text: `Check out this AI video I generated for the prompt: "${currentPrompt}"`,
          url: window.location.href,
        });
        toast({
          title: "Shared!",
          description: "The video was shared successfully.",
        });
      } else {
        await navigator.clipboard.writeText(videoUrl);
        toast({
          title: "Link Copied!",
          description: "Video link copied to clipboard.",
        });
      }
    } catch (error) {
      console.error("Share error:", error);
      toast({
        title: "Share Error",
        description: "Could not share the video.",
        variant: "destructive",
      });
    }
  };

  const clearHistory = () => {
    setVideoHistory([]);
    localStorage.removeItem("videoHistory");
    toast({
      title: "History Cleared",
      description: "Your video history has been deleted.",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 bg-[var(--gradient-card)] backdrop-blur-xl border-border shadow-[var(--shadow-card)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              Describe Your Video
            </label>
            <Textarea
              id="prompt"
              placeholder="e.g., A cat riding a skateboard in space, high resolution"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base resize-none bg-background/50 backdrop-blur"
              disabled={isGenerating || isDownloading}
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
            disabled={isGenerating || isDownloading}
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
              disabled={isGenerating || isDownloading}
            >
              {example}
            </button>
          ))}
        </div>
      </Card>

      {videoUrl && (
        <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Your Generated Video
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

          {isDownloading && (
            <div className="mt-2">
              <span className="text-sm text-muted-foreground">Downloading... {downloadProgress}%</span>
              <Progress value={downloadProgress} className="h-2 mt-1" />
            </div>
          )}
          
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={handleDownload}
              variant="secondary"
              className="gap-2"
              disabled={isDownloading}
            >
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="gap-2"
              disabled={isDownloading}
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
              disabled={isDownloading}
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
              disabled={isDownloading}
            >
              <Video className="h-4 w-4" />
              New Video
            </Button>
          </div>
        </Card>
      )}

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
              Clear All
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
                  playsInline
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-3">
                  <p className="text-xs text-foreground/90 line-clamp-2">{video.prompt}</p>
                </div>
                <div className="absolute top-2 right-2 bg-background/80 backdrop-blur px-2 py-1 rounded text-xs">
                  {new Date(video.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}; 
