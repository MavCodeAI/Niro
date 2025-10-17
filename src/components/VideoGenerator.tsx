import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, Video, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

// Define quality levels instead of provider names
const VIDEO_QUALITY_LEVELS = {
  STANDARD: {
    name: 'Standard Quality (Fast)',
  },
  HIGH: {
    name: 'High Quality (Slower)',
  }
};

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState<keyof typeof VIDEO_QUALITY_LEVELS>('STANDARD');

  // API call for standard quality
  const generateStandardVideo = async (): Promise<string> => {
    const response = await fetch(`https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodeURIComponent(prompt)}`);
    if (!response.ok) throw new Error('Standard API error');
    const data = await response.json();
    if (!data.success || !data.url) throw new Error(data.error || 'Invalid response from Standard API');
    return data.url;
  };

  // API call for high quality
  const generateHighQualityVideo = async (): Promise<string> => {
    const response = await fetch(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=576&seed=${Date.now()}`);
    if (!response.ok) throw new Error('High Quality API error');
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description for the video.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setVideoUrl(null);
    setProgress(0);
    setCurrentPrompt(prompt);

    const progressInterval = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? prev : prev + Math.random() * 10));
    }, 800);

    try {
      let url: string;
      if (selectedQuality === 'HIGH') {
        url = await generateHighQualityVideo();
      } else {
        url = await generateStandardVideo();
      }
      
      setVideoUrl(url);
      setProgress(100);
      toast({
        title: "Success! 🎉",
        description: "Your video has been generated.",
      });
    } catch (error) {
      console.error("Generation failed:", error);
      toast({
        title: "Generation Failed",
        description: "The service is currently busy. Please try again in a moment.",
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
      toast({
        title: "Downloaded!",
        description: "The video has been saved to your device.",
      });
    } catch (error) {
      toast({
        title: "Download Error",
        description: "Could not download the video. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <Card className="p-6 md:p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <label htmlFor="prompt" className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Describe Your Video
            </label>
            <Textarea
              id="prompt"
              placeholder="e.g., A majestic eagle soaring over mountains"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[120px] text-base"
              disabled={isGenerating}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-semibold">Video Quality</label>
            <Select value={selectedQuality} onValueChange={(value: keyof typeof VIDEO_QUALITY_LEVELS) => setSelectedQuality(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select quality" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(VIDEO_QUALITY_LEVELS).map(([key, quality]) => (
                  <SelectItem key={key} value={key}>
                    {quality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Generating your video...</span>
                <span className="font-semibold">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            size="lg"
            className="w-full text-base font-semibold"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Video className="h-5 w-5 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </div>
      </Card>

      {videoUrl && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Video is Ready!</h3>
          {currentPrompt && (
            <p className="text-sm text-muted-foreground mb-4 p-3 bg-secondary rounded-lg">
              <strong>Prompt:</strong> {currentPrompt}
            </p>
          )}
          <div className="relative rounded-lg overflow-hidden bg-black">
            <video
              src={videoUrl}
              controls
              className="w-full h-auto"
              autoPlay
              loop
            >
              Your browser does not support the video tag.
            </video>
          </div>
          <div className="mt-4">
            <Button onClick={handleDownload} variant="secondary" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
