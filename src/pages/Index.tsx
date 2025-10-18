import { useNavigate } from "react-router-dom";
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Hero } from "@/components/Hero";
import { VideoGenerator } from "@/components/VideoGenerator";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--gradient-hero)]">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Nero AI
          </h1>
          <div className="flex items-center gap-4">
            <SignedIn>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Button>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/sign-in")}
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/sign-up")}
              >
                Sign Up
              </Button>
            </SignedOut>
          </div>
        </div>
      </header>

      <Hero />
      <main className="container mx-auto px-4 py-12 pb-24">
        <VideoGenerator />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by NeroAI • Made with ❤️</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
