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
        title: "خطا",
        description: "براہ کرم ویڈیو کی تفصیل درج کریں",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setCurrentPrompt(prompt);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const encodedPrompt = encodeURIComponent(prompt.trim());
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
            timestamp: Date.now(),
          });
          
          toast({
            title: "کامیاب!",
            description: "آپ کی ویڈیو تیار ہو گئی ہے",
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
          timestamp: Date.now(),
        });

        toast({
          title: "کامیاب!",
          description: "آپ کی ویڈیو تیار ہو گئی ہے",
        });
        return;
      }

      // If we get here, unknown response type
      throw new Error(`Unexpected response type: ${contentType}`);
      
    } catch (error) {
      console.error("Error generating video:", error);
      
      let errorMessage = "ویڈیو بنانے میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں";
      
      if (error instanceof Error) {
        if (error.message.includes("Failed to fetch")) {
          errorMessage = "نیٹ ورک کی خرابی۔ اپنا انٹرنیٹ چیک کریں";
        } else if (error.message.includes("API Error: 429")) {
          errorMessage = "بہت زیادہ کوششیں۔ کچھ دیر بعد کوشش کریں";
        } else if (error.message.includes("API Error: 500")) {
          errorMessage = "سرور کی خرابی۔ دوبارہ کوشش کریں";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "خطا",
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
          title: "شیئر کی گئی!",
          description: "ویڈیو کامیابی سے شیئر ہوگئی",
        });
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "کاپی ہوگیا!",
          description: "لنک clipboard میں کاپی ہوگیا",
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
      title: "صاف ہوگیا",
      description: "تمام ہسٹری ڈیلیٹ ہوگئی",
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8 bg-[var(--gradient-card)] backdrop-blur-xl border-border shadow-[var(--shadow-card)]">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              اپنی ویڈیو کی تفصیل لکھیں
            </label>
            <Textarea
              id="prompt"
              placeholder="مثال: ایک بلی جو خلا میں سکیٹ بورڈ چلا رہی ہے، ہائی ریزولوشن"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base resize-none bg-background/50 backdrop-blur"
              disabled={isGenerating}
            />
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">جنریٹ ہو رہا ہے...</span>
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
                ویڈیو بنائی جا رہی ہے...
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                ویڈیو بنائیں
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Example Prompts */}
      <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-secondary" />
          مثال کی تفصیلات
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
            آپ کی ویڈیو
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
              onClick={() => {
                const a = document.createElement("a");
                a.href = videoUrl;
                a.download = `ai-video-${Date.now()}.mp4`;
                a.click();
              }}
              variant="secondary"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              ڈاؤن لوڈ
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              شیئر
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
              دوبارہ
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
              نئی ویڈیو
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
              حالیہ ویڈیوز
            </h3>
            <Button
              onClick={clearHistory}
              variant="ghost"
              size="sm"
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              صاف کریں
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
                  {new Date(video.timestamp).toLocaleDateString('ur-PK')}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
