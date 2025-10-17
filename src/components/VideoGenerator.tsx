import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, Video } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const VideoGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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

    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const apiUrl = `https://yabes-api.pages.dev/api/ai/video/v1?prompt=${encodedPrompt}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error("Failed to generate video");
      }

      // The API returns a video file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);

      toast({
        title: "کامیاب!",
        description: "آپ کی ویڈیو تیار ہو گئی ہے",
      });
    } catch (error) {
      console.error("Error generating video:", error);
      toast({
        title: "خطا",
        description: "ویڈیو بنانے میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
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
          <div className="mt-4 flex gap-3">
            <Button
              onClick={() => {
                const a = document.createElement("a");
                a.href = videoUrl;
                a.download = `video-${Date.now()}.mp4`;
                a.click();
              }}
              variant="secondary"
              className="flex-1"
            >
              ڈاؤن لوڈ کریں
            </Button>
            <Button
              onClick={() => {
                setVideoUrl(null);
                setPrompt("");
              }}
              variant="outline"
              className="flex-1"
            >
              نئی ویڈیو بنائیں
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
