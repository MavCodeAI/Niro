import { Sparkles, Zap } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

export const Hero = () => {
  return (
    <div className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="AI Video Generation"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 py-12 space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm mb-4">
          <Zap className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-primary">AI-Powered Video Generation</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent leading-tight">
          Niro
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Transform your ideas into stunning videos with AI-powered generation
        </p>

        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-4">
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4" />
            <span>Fast Generation</span>
          </div>
          <div className="w-1 h-1 bg-muted-foreground rounded-full" />
          <span>High Quality</span>
          <div className="w-1 h-1 bg-muted-foreground rounded-full" />
          <span>Multiple Formats</span>
        </div>
      </div>
    </div>
  );
};