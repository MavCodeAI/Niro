import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Hero } from "@/components/Hero";
import { VideoGenerator } from "@/components/VideoGenerator";
import { Button } from "@/components/ui/button";
import { LogIn, LayoutDashboard } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--gradient-hero)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--gradient-hero)]">
      {/* Top Navigation */}
      <nav className="border-b border-border/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Nero AI
          </h1>
          <Button onClick={() => navigate("/dashboard")} variant="outline" size="sm">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </nav>

      <Hero />
      <main className="container mx-auto px-4 py-12 pb-24">
        <VideoGenerator />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by Nero AI • Made with ❤️</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
