import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface GeneratedVideo {
  url: string;
  prompt: string;
  timestamp: number;
  duration: number;
  model: string;
}

// HuggingFace Free Models Collection
const HUGGINGFACE_MODELS = {
  ALIBABA_1_7B: {
    name: 'Ali-Vilab 1.7B (Best Quality)',
    endpoint: 'https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b',
    maxDuration: 16,
    description: 'Highest quality, best for detailed scenes',
    icon: '🌟'
  },
  DAMO_1_7B: {
    name: 'Damo-Vilab 1.7B (Fast)',
    endpoint: 'https://api-inference.huggingface.co/models/damo-vilab/text-to-video-ms-1.7b',
    maxDuration: 16,
    description: 'Fast generation, good quality',
    icon: '⚡'
  },
  VIDEOCRAFTER: {
    name: 'VideoCrafter2 (Creative)',
    endpoint: 'https://api-inference.huggingface.co/models/VideoCrafter/VideoCrafter2',
    maxDuration: 12,
    description: 'Creative and artistic videos',
    icon: '🎨'
  },
  ANIMATEDIFF: {
    name: 'AnimateDiff (Smooth)',
    endpoint: 'https://api-inference.huggingface.co/models/ByteDance/AnimateDiff-Lightning',
    maxDuration: 8,
    description: 'Very smooth animations',
    icon: '🎬'
  },
  WAN2_LIGHTNING: {
    name: 'Wan2 Lightning (Ultra Fast)',
    endpoint: 'https://api-inference.huggingface.co/models/lightx2v/Wan2.2-Lightning',
    maxDuration: 12,
    description: 'Ultra fast generation',
    icon: '⚡'
  }
} as const;

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [duration, setDuration] = useState<number>(8);
  const [selectedModel, setSelectedModel] = useState<keyof typeof HUGGINGFACE_MODELS>('ALIBABA_1_7B');

  // Load history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem("videoHistory");
    if (savedHistory) {
      setVideoHistory(JSON.parse(savedHistory));
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = (video: GeneratedVideo) => {
    const newHistory = [video, ...videoHistory].slice(0, 10);
    setVideoHistory(newHistory);
    localStorage.setItem("videoHistory", JSON.stringify(newHistory));
  };

  const generateVideoWithModel = async (modelKey: keyof typeof HUGGINGFACE_MODELS): Promise<string> => {
    const model = HUGGINGFACE_MODELS[modelKey];
    
    const response = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_frames: Math.min(duration * 8, 128), // 8 fps
          num_inference_steps: 25, // Good balance of speed and quality
          guidance_scale: 12, // Good prompt following
          width: 1024,
          height: 576,
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`${model.name} API Error: ${response.status}`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const generateVideo = async (): Promise<{url: string, modelUsed: string}> => {
    // Try models in order of preference with smart fallback
    const modelOrder: (keyof typeof HUGGINGFACE_MODELS)[] = [
      selectedModel, // User's choice first
      'ALIBABA_1_7B', // Best quality fallback
      'WAN2_LIGHTNING', // Fast fallback
      'DAMO_1_7B', // Reliable fallback
      'VIDEOCRAFTER', // Creative fallback
      'ANIMATEDIFF' // Final fallback
    ];

    // Remove duplicates
    const uniqueModels = modelOrder.filter((model, index, arr) => arr.indexOf(model) === index);

    let lastError: Error | null = null;

    for (const modelKey of uniqueModels) {
      try {
        const model = HUGGINGFACE_MODELS[modelKey];
        console.log(`🔄 Trying ${model.name}...`);
        
        const videoUrl = await generateVideoWithModel(modelKey);
        return { url: videoUrl, modelUsed: model.name };
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${HUGGINGFACE_MODELS[modelKey].name} failed:`, error);
        continue;
      }
    }

    throw lastError || new Error('All models failed');
  };

  const examplePrompts = [
    "A majestic eagle soaring over snow-capped mountains at sunset",
    "Ocean waves crashing against coastal cliffs during a storm",
    "Cherry blossoms falling in a peaceful Japanese garden",
    "Lightning illuminating a dark forest during thunderstorm",
    "Astronaut floating in space with Earth in the background",
    "Cyberpunk city with neon lights and flying cars in the rain",
    "Time-lapse of a flower blooming in spring garden",
    "Fireflies dancing in a magical forest at night"
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
      const result = await generateVideo();
      
      setVideoUrl(result.url);
      setProgress(100);
      
      saveToHistory({
        url: result.url,
        prompt: prompt.trim(),
        timestamp: Date.now(),
        duration,
        model: result.modelUsed
      });
      
      toast({
        title: "Success! 🎉",
        description: `Video generated with ${result.modelUsed}`,
      });
      
    } catch (error) {
      console.error("All models failed:", error);
      
      let errorMessage = "All video generation models are currently busy. Please try again in a few minutes.";
      
      if (error instanceof Error) {
        if (error.message.includes("429")) {
          errorMessage = "Rate limit reached. Please wait a moment and try again.";
        } else if (error.message.includes("503")) {
          errorMessage = "Models are loading. Please try again in 1-2 minutes.";
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      setProgress(0);
    }

    clearInterval(progressInterval);
    setIsGenerating(false);
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
        title: "Download successful! 🎉",
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
          title: "Shared! 🎉",
          description: "The video was shared successfully",
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Copied! 📋",
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
              Describe your video
            </label>
            <Textarea
              id="prompt"
              placeholder="Example: A majestic eagle soaring over snow-capped mountains at sunset"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base resize-none bg-background/50 backdrop-blur"
              disabled={isGenerating}
            />
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">AI Model (HuggingFace Free)</label>
            <Select value={selectedModel} onValueChange={(value: keyof typeof HUGGINGFACE_MODELS) => setSelectedModel(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HUGGINGFACE_MODELS).map(([key, model]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <span>{model.icon}</span>
                      <span>{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {HUGGINGFACE_MODELS[selectedModel].description}
            </p>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Video Duration</label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 seconds</SelectItem>
                <SelectItem value="8">8 seconds (Recommended)</SelectItem>
                <SelectItem value="12">12 seconds</SelectItem>
                {HUGGINGFACE_MODELS[selectedModel].maxDuration > 12 && (
                  <SelectItem value="16">16 seconds</SelectItem>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Max duration for this model: {HUGGINGFACE_MODELS[selectedModel].maxDuration}s
            </p>
          </div>

          {/* Info Banner */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Smart Fallback:</strong> If your selected model is busy, we'll automatically try other models to ensure your video gets generated.
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating with {HUGGINGFACE_MODELS[selectedModel].name}...</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            size="lg"
            className="w-full text-base font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating video...
              </>
            ) : (
              <>
                <Video className="h-5 w-5" />
                🤗 Generate Free Video
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  if (video.duration) setDuration(video.duration);
                }}
              >
                <video
                  src={video.url}
                  className="w-full h-32 object-cover"
                  muted
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent flex items-end p-3">
                  <div className="w-full">
                    <p className="text-xs text-foreground/90 line-clamp-2 mb-1">{video.prompt}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {video.duration && <span>{video.duration}s</span>}
                      {video.model && <span>• {video.model}</span>}
                    </div>
                  </div>
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