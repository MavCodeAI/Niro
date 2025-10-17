import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, Sparkles, Video, Download, Share2, Clock, Trash2, RefreshCw, 
  Settings, Zap, Monitor, Smartphone, Square, Film, Palette, Cpu,
  CloudQueue, Timer, BarChart3, Database, Globe
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { VideoQueueManager } from "@/lib/video-queue";
import { CacheManager } from "@/lib/cache-manager";
import { PerformanceOptimizer } from "@/lib/performance-optimizer";

// Enhanced interfaces
interface VideoOptions {
  duration: number; // Custom duration in seconds
  quality: '720p' | '1080p' | '4K';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  style: 'realistic' | 'cinematic' | 'cartoon' | 'abstract';
  format: 'mp4' | 'webm' | 'avi' | 'mov';
  fps: 24 | 30 | 60;
  bitrate: 'low' | 'medium' | 'high' | 'ultra';
  codec: 'h264' | 'h265' | 'vp9' | 'av1';
}

interface VideoRequest {
  id: string;
  prompt: string;
  options: VideoOptions;
  priority: 'low' | 'normal' | 'high';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  estimatedTime: number;
  createdAt: Date;
}

interface GeneratedVideo extends VideoRequest {
  url: string;
  thumbnail: string;
  fileSize: number;
  processingTime: number;
}

const DURATION_PRESETS = [
  { label: "4 seconds", value: 4, tier: 'free' },
  { label: "8 seconds", value: 8, tier: 'free' },
  { label: "15 seconds", value: 15, tier: 'premium' },
  { label: "30 seconds", value: 30, tier: 'premium' },
  { label: "60 seconds", value: 60, tier: 'professional' },
  { label: "Custom", value: 0, tier: 'professional' }
];

const QUALITY_OPTIONS = [
  { label: "HD (720p)", value: '720p', tier: 'free', bitrate: '2-5 Mbps' },
  { label: "Full HD (1080p)", value: '1080p', tier: 'premium', bitrate: '5-10 Mbps' },
  { label: "4K (2160p)", value: '4K', tier: 'professional', bitrate: '15-25 Mbps' }
];

const ASPECT_RATIOS = [
  { label: "Landscape (16:9)", value: '16:9', icon: Monitor, description: "Perfect for YouTube, websites" },
  { label: "Portrait (9:16)", value: '9:16', icon: Smartphone, description: "TikTok, Instagram Stories" },
  { label: "Square (1:1)", value: '1:1', icon: Square, description: "Instagram posts, LinkedIn" },
  { label: "Classic (4:3)", value: '4:3', icon: Film, description: "Traditional TV format" }
];

const STYLE_OPTIONS = [
  { 
    label: "Realistic", 
    value: 'realistic', 
    description: "Photorealistic, natural lighting",
    examples: ["Real world scenes", "Documentary style", "Lifelike characters"]
  },
  { 
    label: "Cinematic", 
    value: 'cinematic', 
    description: "Movie-like quality, dramatic",
    examples: ["Film noir", "Epic scenes", "Professional grade"]
  },
  { 
    label: "Cartoon", 
    value: 'cartoon', 
    description: "Animated, colorful, fun",
    examples: ["Disney style", "Anime", "Children's content"]
  },
  { 
    label: "Abstract", 
    value: 'abstract', 
    description: "Artistic, creative, surreal",
    examples: ["Digital art", "Experimental", "Artistic expression"]
  }
];

export const AdvancedVideoGenerator = () => {
  // Core state
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoHistory, setVideoHistory] = useState<GeneratedVideo[]>([]);
  const [videoQueue, setVideoQueue] = useState<VideoRequest[]>([]);
  
  // Advanced options
  const [videoOptions, setVideoOptions] = useState<VideoOptions>({
    duration: 4,
    quality: '720p',
    aspectRatio: '16:9',
    style: 'realistic',
    format: 'mp4',
    fps: 30,
    bitrate: 'medium',
    codec: 'h264'
  });
  
  // User settings
  const [userTier, setUserTier] = useState<'free' | 'premium' | 'professional'>('free');
  const [creditsRemaining, setCreditsRemaining] = useState(50);
  const [customDuration, setCustomDuration] = useState(4);
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [autoOptimize, setAutoOptimize] = useState(true);
  
  // Performance tracking
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, size: 0 });
  const [processingStats, setProcessingStats] = useState({ avgTime: 0, totalProcessed: 0 });
  
  // Initialize managers
  const queueManager = new VideoQueueManager();
  const cacheManager = new CacheManager();
  const performanceOptimizer = new PerformanceOptimizer();

  // Load data on component mount
  useEffect(() => {
    loadStoredData();
    initializePerformanceTracking();
  }, []);

  const loadStoredData = useCallback(() => {
    const savedHistory = localStorage.getItem("niro_video_history");
    const savedQueue = localStorage.getItem("niro_video_queue");
    const savedOptions = localStorage.getItem("niro_video_options");
    
    if (savedHistory) setVideoHistory(JSON.parse(savedHistory));
    if (savedQueue) setVideoQueue(JSON.parse(savedQueue));
    if (savedOptions) setVideoOptions(JSON.parse(savedOptions));
  }, []);

  const initializePerformanceTracking = useCallback(() => {
    // Initialize cache statistics
    const stats = cacheManager.getStats();
    setCacheStats(stats);
    
    // Initialize performance metrics
    const perfStats = performanceOptimizer.getMetrics();
    setProcessingStats(perfStats);
  }, []);

  // Save data to localStorage
  const saveToStorage = useCallback((key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
  }, []);

  // Calculate credits required
  const calculateCredits = useCallback((options: VideoOptions): number => {
    const baseCost = 1;
    const duration = useCustomDuration ? customDuration : options.duration;
    const durationMultiplier = duration / 4;
    const qualityMultiplier = options.quality === '720p' ? 1 : options.quality === '1080p' ? 2.5 : 6;
    const styleMultiplier = options.style === 'realistic' ? 1 : options.style === 'cinematic' ? 1.5 : 1.2;
    
    return Math.ceil(baseCost * durationMultiplier * qualityMultiplier * styleMultiplier);
  }, [customDuration, useCustomDuration]);

  // Estimate processing time
  const estimateProcessingTime = useCallback((options: VideoOptions): number => {
    const duration = useCustomDuration ? customDuration : options.duration;
    const baseTimePerSecond = 15; // seconds of processing per second of video
    const qualityMultiplier = options.quality === '720p' ? 1 : options.quality === '1080p' ? 2 : 4;
    
    return duration * baseTimePerSecond * qualityMultiplier;
  }, [customDuration, useCustomDuration]);

  // Handle video generation with queue management
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a video description",
        variant: "destructive",
      });
      return;
    }

    const finalOptions = {
      ...videoOptions,
      duration: useCustomDuration ? customDuration : videoOptions.duration
    };

    const requiredCredits = calculateCredits(finalOptions);
    if (creditsRemaining < requiredCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${requiredCredits} credits but only have ${creditsRemaining}. Please upgrade your plan.`,
        variant: "destructive",
      });
      return;
    }

    // Create video request
    const request: VideoRequest = {
      id: `video_${Date.now()}`,
      prompt: prompt.trim(),
      options: finalOptions,
      priority: userTier === 'professional' ? 'high' : userTier === 'premium' ? 'normal' : 'low',
      status: 'queued',
      progress: 0,
      estimatedTime: estimateProcessingTime(finalOptions),
      createdAt: new Date()
    };

    // Add to queue
    const updatedQueue = [...videoQueue, request];
    setVideoQueue(updatedQueue);
    saveToStorage("niro_video_queue", updatedQueue);

    // Start processing
    await processVideoRequest(request);
  };

  // Process video request with advanced features
  const processVideoRequest = async (request: VideoRequest) => {
    setIsGenerating(true);
    setProgress(0);
    
    // Check cache first
    const cacheKey = cacheManager.generateKey(request.prompt, request.options);
    const cachedResult = await cacheManager.get(cacheKey);
    
    if (cachedResult) {
      toast({
        title: "Cache Hit!",
        description: "Found similar video in cache, delivering instantly",
      });
      
      setVideoUrl(cachedResult.url);
      setProgress(100);
      setIsGenerating(false);
      setCacheStats(cacheManager.getStats());
      return;
    }

    // Progressive loading simulation with realistic timing
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const increment = Math.random() * 8 + 2; // 2-10% increments
        const newProgress = Math.min(prev + increment, 95);
        
        // Update request status
        const updatedQueue = videoQueue.map(r => 
          r.id === request.id ? { ...r, progress: newProgress, status: 'processing' as const } : r
        );
        setVideoQueue(updatedQueue);
        
        return newProgress;
      });
    }, 800); // Slower, more realistic progress

    try {
      // Enhanced API call with all options
      const apiPayload = {
        prompt: request.prompt,
        duration: request.options.duration,
        quality: request.options.quality,
        aspectRatio: request.options.aspectRatio,
        style: request.options.style,
        format: request.options.format,
        fps: request.options.fps,
        bitrate: request.options.bitrate,
        codec: request.options.codec,
        priority: request.priority,
        optimization: autoOptimize
      };

      // Simulate API call (replace with actual API)
      const response = await simulateAdvancedVideoGeneration(apiPayload);
      
      if (!response.success || !response.url) {
        throw new Error(response.error || "Generation failed");
      }

      clearInterval(progressInterval);
      setProgress(100);
      setVideoUrl(response.url);
      
      // Create completed video record
      const completedVideo: GeneratedVideo = {
        ...request,
        url: response.url,
        thumbnail: response.thumbnail,
        fileSize: response.fileSize,
        processingTime: response.processingTime,
        status: 'completed'
      };
      
      // Update history and cache
      const updatedHistory = [completedVideo, ...videoHistory].slice(0, 20);
      setVideoHistory(updatedHistory);
      saveToStorage("niro_video_history", updatedHistory);
      
      // Cache the result
      await cacheManager.set(cacheKey, completedVideo);
      setCacheStats(cacheManager.getStats());
      
      // Update credits
      setCreditsRemaining(prev => prev - calculateCredits(request.options));
      
      // Remove from queue
      const updatedQueue = videoQueue.filter(r => r.id !== request.id);
      setVideoQueue(updatedQueue);
      saveToStorage("niro_video_queue", updatedQueue);
      
      toast({
        title: "Success!",
        description: `Your ${request.options.duration}s ${request.options.quality} video is ready!`,
      });
      
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Generation error:", error);
      
      const updatedQueue = videoQueue.map(r => 
        r.id === request.id ? { ...r, status: 'failed' as const } : r
      );
      setVideoQueue(updatedQueue);
      
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      
      setProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  // Simulate advanced video generation API
  const simulateAdvancedVideoGeneration = async (payload: any): Promise<any> => {
    // Simulate processing time based on complexity
    const processingTime = payload.duration * 2000 + (payload.quality === '4K' ? 5000 : 2000);
    
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // Simulate successful response
    return {
      success: true,
      url: `https://example.com/videos/niro_${Date.now()}.${payload.format}`,
      thumbnail: `https://example.com/thumbnails/niro_${Date.now()}.jpg`,
      fileSize: payload.duration * (payload.quality === '4K' ? 50 : payload.quality === '1080p' ? 20 : 8) * 1024 * 1024,
      processingTime: processingTime / 1000
    };
  };

  // Batch processing handler
  const handleBatchGenerate = async (prompts: string[]) => {
    if (prompts.length === 0) return;
    
    const batchRequests = prompts.map((prompt, index) => ({
      id: `batch_${Date.now()}_${index}`,
      prompt: prompt.trim(),
      options: videoOptions,
      priority: 'normal' as const,
      status: 'queued' as const,
      progress: 0,
      estimatedTime: estimateProcessingTime(videoOptions),
      createdAt: new Date()
    }));
    
    // Add all to queue
    const updatedQueue = [...videoQueue, ...batchRequests];
    setVideoQueue(updatedQueue);
    saveToStorage("niro_video_queue", updatedQueue);
    
    // Process sequentially
    for (const request of batchRequests) {
      await processVideoRequest(request);
    }
  };

  // Clear cache handler
  const handleClearCache = async () => {
    await cacheManager.clear();
    setCacheStats(cacheManager.getStats());
    toast({
      title: "Cache Cleared",
      description: "All cached videos have been removed",
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Performance Dashboard */}
      <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="font-semibold">{creditsRemaining} Credits</p>
              <p className="text-sm text-muted-foreground">{userTier} Plan</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <CloudQueue className="h-5 w-5 text-secondary" />
            <div>
              <p className="font-semibold">{videoQueue.length} Queued</p>
              <p className="text-sm text-muted-foreground">In Processing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-accent" />
            <div>
              <p className="font-semibold">{Math.round(cacheStats.size / 1024 / 1024)}MB Cache</p>
              <p className="text-sm text-muted-foreground">{cacheStats.hits}% Hit Rate</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold">{processingStats.avgTime}s Avg</p>
              <p className="text-sm text-muted-foreground">Processing Time</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Generation Interface */}
      <Card className="p-6 md:p-8 bg-[var(--gradient-card)] backdrop-blur-xl border-border shadow-[var(--shadow-card)]">
        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="generate">Generate</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="batch">Batch</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Generate Tab */}
          <TabsContent value="generate" className="space-y-6">
            <div className="space-y-4">
              <label className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                Video Description
              </label>
              
              <Textarea
                placeholder="Describe your video in detail... (e.g., A majestic eagle soaring through snow-capped mountains at golden hour, cinematic quality with dramatic lighting)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px] text-base resize-none bg-background/50 backdrop-blur"
                disabled={isGenerating}
              />
            </div>

            {/* Quick Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Duration Selection */}
              <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <div className="space-y-2">
                  {!useCustomDuration ? (
                    <Select 
                      value={videoOptions.duration.toString()} 
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setUseCustomDuration(true);
                        } else {
                          setVideoOptions(prev => ({ ...prev, duration: parseInt(value) }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_PRESETS.map((preset) => (
                          <SelectItem 
                            key={preset.value || 'custom'} 
                            value={preset.value.toString() || 'custom'}
                            disabled={userTier === 'free' && preset.tier !== 'free'}
                          >
                            {preset.label} {userTier !== preset.tier && `(${preset.tier})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="space-y-2">
                      <Slider
                        value={[customDuration]}
                        onValueChange={([value]) => setCustomDuration(value)}
                        max={userTier === 'professional' ? 300 : userTier === 'premium' ? 60 : 15}
                        min={1}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{customDuration}s</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setUseCustomDuration(false)}
                        >
                          Use Presets
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Quality Selection */}
              <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">Quality</label>
                <Select 
                  value={videoOptions.quality} 
                  onValueChange={(value: VideoOptions['quality']) => 
                    setVideoOptions(prev => ({ ...prev, quality: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {QUALITY_OPTIONS.map((option) => (
                      <SelectItem 
                        key={option.value} 
                        value={option.value}
                        disabled={userTier === 'free' && option.tier !== 'free'}
                      >
                        <div>
                          <div>{option.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {option.bitrate} {userTier !== option.tier && `• ${option.tier}`}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>

              {/* Aspect Ratio */}
              <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">Aspect Ratio</label>
                <Select 
                  value={videoOptions.aspectRatio} 
                  onValueChange={(value: VideoOptions['aspectRatio']) => 
                    setVideoOptions(prev => ({ ...prev, aspectRatio: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => {
                      const IconComponent = ratio.icon;
                      return (
                        <SelectItem key={ratio.value} value={ratio.value}>
                          <div className="flex items-center gap-2">
                            <IconComponent className="h-4 w-4" />
                            <div>
                              <div>{ratio.label}</div>
                              <div className="text-xs text-muted-foreground">{ratio.description}</div>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </Card>

              {/* Style Selection */}
              <Card className="p-4">
                <label className="text-sm font-medium mb-2 block">Style</label>
                <Select 
                  value={videoOptions.style} 
                  onValueChange={(value: VideoOptions['style']) => 
                    setVideoOptions(prev => ({ ...prev, style: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((style) => (
                      <SelectItem key={style.value} value={style.value}>
                        <div>
                          <div className="font-medium">{style.label}</div>
                          <div className="text-xs text-muted-foreground">{style.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Card>
            </div>

            {/* Generation Summary */}
            <Card className="p-4 bg-background/30 border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration: {useCustomDuration ? customDuration : videoOptions.duration}s</p>
                    <p className="text-xs text-muted-foreground">Estimated: {estimateProcessingTime(videoOptions)}s</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{videoOptions.quality} • {videoOptions.format.toUpperCase()}</p>
                    <p className="text-xs text-muted-foreground">{videoOptions.fps}fps • {videoOptions.codec}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Cost: {calculateCredits(videoOptions)} credits</p>
                    <p className="text-xs text-muted-foreground">Priority: {userTier === 'professional' ? 'High' : 'Normal'}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Progress Display */}
            {isGenerating && (
              <Card className="p-4 bg-primary/10 border-primary/20">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Generating your video...</span>
                    <span className="text-sm font-semibold">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="h-3 w-3" />
                    <span>Using optimized processing pipeline</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || creditsRemaining < calculateCredits(videoOptions) || !prompt.trim()}
              size="lg"
              className="w-full text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating ({Math.round(progress)}%)
                </>
              ) : (
                <>
                  <Video className="h-5 w-5" />
                  Generate Video ({calculateCredits(videoOptions)} credits)
                </>
              )}
            </Button>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Format & Codec Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Format & Codec
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Output Format</label>
                    <Select 
                      value={videoOptions.format} 
                      onValueChange={(value: VideoOptions['format']) => 
                        setVideoOptions(prev => ({ ...prev, format: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mp4">MP4 (Recommended)</SelectItem>
                        <SelectItem value="webm">WebM</SelectItem>
                        <SelectItem value="avi" disabled={userTier === 'free'}>AVI (Premium)</SelectItem>
                        <SelectItem value="mov" disabled={userTier === 'free'}>MOV (Premium)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Codec</label>
                    <Select 
                      value={videoOptions.codec} 
                      onValueChange={(value: VideoOptions['codec']) => 
                        setVideoOptions(prev => ({ ...prev, codec: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="h264">H.264 (Universal)</SelectItem>
                        <SelectItem value="h265" disabled={userTier === 'free'}>H.265 (Efficient)</SelectItem>
                        <SelectItem value="vp9" disabled={userTier === 'free'}>VP9 (Web)</SelectItem>
                        <SelectItem value="av1" disabled={userTier !== 'professional'}>AV1 (Latest)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Frame Rate</label>
                    <Select 
                      value={videoOptions.fps.toString()} 
                      onValueChange={(value) => 
                        setVideoOptions(prev => ({ ...prev, fps: parseInt(value) as VideoOptions['fps'] }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">24 fps (Cinematic)</SelectItem>
                        <SelectItem value="30">30 fps (Standard)</SelectItem>
                        <SelectItem value="60" disabled={userTier === 'free'}>60 fps (Smooth)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Bitrate</label>
                    <Select 
                      value={videoOptions.bitrate} 
                      onValueChange={(value: VideoOptions['bitrate']) => 
                        setVideoOptions(prev => ({ ...prev, bitrate: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low (Faster)</SelectItem>
                        <SelectItem value="medium">Medium (Balanced)</SelectItem>
                        <SelectItem value="high" disabled={userTier === 'free'}>High (Quality)</SelectItem>
                        <SelectItem value="ultra" disabled={userTier !== 'professional'}>Ultra (Max Quality)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
              
              {/* Optimization Settings */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Cpu className="h-4 w-4" />
                  Optimization
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Auto Optimization</label>
                      <p className="text-xs text-muted-foreground">Automatically optimize settings for best quality/speed balance</p>
                    </div>
                    <Switch 
                      checked={autoOptimize} 
                      onCheckedChange={setAutoOptimize}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">Cache Results</label>
                      <p className="text-xs text-muted-foreground">Cache similar requests for faster generation</p>
                    </div>
                    <Switch checked={true} disabled />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium">CDN Delivery</label>
                      <p className="text-xs text-muted-foreground">Use global CDN for faster downloads</p>
                    </div>
                    <Switch checked={userTier !== 'free'} disabled />
                  </div>
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleClearCache}
                      className="w-full"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Clear Cache ({Math.round(cacheStats.size / 1024 / 1024)}MB)
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Batch Tab */}
          <TabsContent value="batch" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Batch Processing</h3>
                <Badge variant={userTier !== 'free' ? 'default' : 'secondary'}>
                  {userTier !== 'free' ? 'Available' : 'Premium Feature'}
                </Badge>
              </div>
              
              {userTier !== 'free' ? (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter multiple prompts, one per line:\n\nA sunset over mountains\nA cat playing with yarn\nA futuristic city at night\nOcean waves on a beach"
                    className="min-h-[200px]"
                    disabled={userTier === 'free'}
                  />
                  
                  <div className="flex items-center gap-4">
                    <Button 
                      disabled={userTier === 'free'}
                      className="flex-1"
                    >
                      <CloudQueue className="h-4 w-4 mr-2" />
                      Queue Batch Generation
                    </Button>
                    
                    <div className="text-sm text-muted-foreground">
                      Max: {userTier === 'premium' ? '5' : '20'} videos per batch
                    </div>
                  </div>
                </div>
              ) : (
                <Card className="p-6 text-center">
                  <CloudQueue className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Upgrade for Batch Processing</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate multiple videos simultaneously with our premium plans
                  </p>
                  <Button>Upgrade Now</Button>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cache Statistics */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Cache Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Cache Size</span>
                    <span className="text-sm font-medium">{Math.round(cacheStats.size / 1024 / 1024)}MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Hit Rate</span>
                    <span className="text-sm font-medium">{cacheStats.hits}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Misses</span>
                    <span className="text-sm font-medium">{cacheStats.misses}</span>
                  </div>
                  <Progress value={cacheStats.hits} className="h-2" />
                </div>
              </Card>
              
              {/* Processing Statistics */}
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Processing Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Average Time</span>
                    <span className="text-sm font-medium">{processingStats.avgTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Processed</span>
                    <span className="text-sm font-medium">{processingStats.totalProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Queue Length</span>
                    <span className="text-sm font-medium">{videoQueue.length}</span>
                  </div>
                </div>
              </Card>
            </div>
            
            {/* Current Queue */}
            {videoQueue.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <CloudQueue className="h-4 w-4" />
                  Processing Queue
                </h3>
                <div className="space-y-3">
                  {videoQueue.map((request, index) => (
                    <div key={request.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium truncate">{request.prompt}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{request.status}</Badge>
                          <span>{request.options.duration}s</span>
                          <span>{request.options.quality}</span>
                          <span>Priority: {request.priority}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{Math.round(request.progress)}%</p>
                        <Progress value={request.progress} className="h-1 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </Card>
      
      {/* Video Preview with Enhanced Info */}
      {videoUrl && (
        <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-primary" />
            Generated Video
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="relative rounded-lg overflow-hidden bg-background/20">
                <video
                  src={videoUrl}
                  controls
                  className="w-full h-auto max-h-[400px] object-contain"
                  autoPlay
                  loop
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
            
            <div className="space-y-4">
              <Card className="p-4 bg-background/30">
                <h4 className="font-semibold mb-2">Video Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{useCustomDuration ? customDuration : videoOptions.duration}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quality:</span>
                    <span>{videoOptions.quality}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Aspect Ratio:</span>
                    <span>{videoOptions.aspectRatio}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Style:</span>
                    <span className="capitalize">{videoOptions.style}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Format:</span>
                    <span>{videoOptions.format.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>FPS:</span>
                    <span>{videoOptions.fps}</span>
                  </div>
                </div>
              </Card>
              
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Enhance
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Enhanced Video History */}
      {videoHistory.length > 0 && (
        <Card className="p-6 bg-[var(--gradient-card)] backdrop-blur-xl border-border">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              Video History ({videoHistory.length})
            </h3>
            <Button variant="ghost" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear All
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {videoHistory.map((video, index) => (
              <div
                key={index}
                className="group relative rounded-lg overflow-hidden bg-background/30 border border-border/50 hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => {
                  setVideoUrl(video.url);
                  setPrompt(video.prompt);
                  setVideoOptions(video.options);
                }}
              >
                <div className="aspect-video relative">
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    muted
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent" />
                  
                  {/* Video info overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {video.options.duration}s
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {video.options.quality}
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground line-clamp-2">{video.prompt}</p>
                  </div>
                  
                  {/* Processing time badge */}
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary" className="text-xs">
                      {video.processingTime}s
                    </Badge>
                  </div>
                  
                  {/* Style indicator */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {video.options.style}
                    </Badge>
                  </div>
                </div>
                
                {/* Quick actions on hover */}
                <div className="absolute inset-0 bg-background/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="sm" variant="secondary">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="secondary">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
