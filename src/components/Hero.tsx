import { Sparkles, Zap, ArrowRight } from "lucide-react";
import Image from "next/image"; // <-- Import Next.js Image component
import heroImage from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button"; // Assuming you have a Button component

export const Hero = () => {
  return (
    <div className="relative isolate overflow-hidden pt-14">
      {/* Background Image with Overlay */}
      <Image
        src={heroImage}
        alt="Abstract background of colorful light trails representing AI generation"
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
        priority // <-- Load this image first for better performance
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/50 via-background/80 to-background" />

      {/* Content */}
      <div className="mx-auto max-w-4xl py-24 sm:py-32 px-6 lg:px-8 text-center">
        <div className="animate-fade-in space-y-6">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-sm">
            <Zap className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">AI-Powered Video Generation</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl animate-slide-in-from-top [animation-delay:0.2s]">
            NeroAI
          </h1>
          
          {/* Subheading */}
          <p className="mt-6 text-lg leading-8 text-muted-foreground max-w-2xl mx-auto animate-slide-in-from-top [animation-delay:0.4s]">
            Transform your ideas into stunning, high-quality videos in seconds. Describe your vision, and let our AI bring it to life.
          </p>

          {/* Call to Action Button */}
          <div className="mt-10 flex items-center justify-center gap-x-6 animate-slide-in-from-top [animation-delay:0.6s]">
            <Button size="lg" className="group text-lg">
              Start Creating for Free
              <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Social Proof / Features */}
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground pt-8 animate-slide-in-from-top [animation-delay:0.8s]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>No credit card required</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" />
              <span>Join thousands of creators</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
