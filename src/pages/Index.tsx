import { Hero } from "@/components/Hero";
import { AdvancedVideoGenerator } from "@/components/AdvancedVideoGenerator";

const Index = () => {
  return (
    <div className="min-h-screen bg-[var(--gradient-hero)]">
      <Hero />
      <main className="container mx-auto px-4 py-12 pb-24">
        <AdvancedVideoGenerator />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-border/50 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>Powered by AI • Made with ❤️</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
