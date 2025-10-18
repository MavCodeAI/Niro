import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Video, LogOut, Home, Copy, Check, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserStats {
  daily_videos_used: number;
  base_daily_limit: number;
  bonus_credits: number;
  total_referrals: number;
  last_reset_at: string;
}

interface VideoHistory {
  id: string;
  prompt: string;
  video_url: string;
  camera_control: string | null;
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [videos, setVideos] = useState<VideoHistory[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStats();
      fetchVideos();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!error && data) {
      // Check if we need to reset daily usage
      const lastReset = new Date(data.last_reset_at);
      const now = new Date();
      const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

      if (hoursSinceReset >= 24) {
        // Reset daily usage
        await supabase
          .from("user_stats")
          .update({
            daily_videos_used: 0,
            last_reset_at: now.toISOString()
          })
          .eq("user_id", user.id);

        setStats({ ...data, daily_videos_used: 0, last_reset_at: now.toISOString() });
      } else {
        setStats(data);
      }
    }
  };

  const fetchVideos = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("video_history")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setVideos(data);
    }
  };

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/auth?ref=${user?.id}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadVideo = (url: string, prompt: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `nero-ai-${prompt.substring(0, 30)}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: "Download Started", description: "Your video is being saved." });
  };

  if (loading || !user || !stats) {
    return (
      <div className="min-h-screen bg-[var(--gradient-hero)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const totalDailyLimit = stats.base_daily_limit + stats.bonus_credits;
  const remainingVideos = totalDailyLimit - stats.daily_videos_used;

  return (
    <div className="min-h-screen bg-[var(--gradient-hero)]">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/")} variant="outline" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Home
            </Button>
            <Button onClick={signOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* User Profile */}
        <Card className="p-6 mb-6 bg-card/80 backdrop-blur-xl border-border/20">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/20 text-primary text-xl">
                {user.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">{user.email}</h2>
              <p className="text-sm text-muted-foreground">Nero AI Member</p>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-card/80 backdrop-blur-xl border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Daily Videos</span>
              <Video className="h-5 w-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">{remainingVideos}/{totalDailyLimit}</p>
            <p className="text-xs text-muted-foreground mt-1">Remaining today</p>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-xl border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Bonus Credits</span>
              <Video className="h-5 w-5 text-accent" />
            </div>
            <p className="text-3xl font-bold">+{stats.bonus_credits}</p>
            <p className="text-xs text-muted-foreground mt-1">From referrals</p>
          </Card>

          <Card className="p-6 bg-card/80 backdrop-blur-xl border-border/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Total Referrals</span>
              <Video className="h-5 w-5 text-secondary" />
            </div>
            <p className="text-3xl font-bold">{stats.total_referrals}</p>
            <p className="text-xs text-muted-foreground mt-1">Friends invited</p>
          </Card>
        </div>

        {/* Referral Card */}
        <Card className="p-6 mb-8 bg-card/80 backdrop-blur-xl border-border/20">
          <h3 className="text-lg font-semibold mb-3">Invite Friends & Earn Credits</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Share your referral link and earn +2 daily video credits for each friend who signs up!
          </p>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-background/70 rounded-lg border text-sm truncate">
              {window.location.origin}/auth?ref={user.id}
            </div>
            <Button onClick={copyReferralLink} variant="secondary">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </Card>

        {/* Video History */}
        <Card className="p-6 bg-card/80 backdrop-blur-xl border-border/20">
          <h3 className="text-lg font-semibold mb-4">Recent Videos</h3>
          {videos.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No videos yet. Create your first video!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {videos.map((video) => (
                <div key={video.id} className="group relative rounded-lg overflow-hidden border bg-background/50">
                  <video 
                    src={video.video_url} 
                    className="w-full h-40 object-cover bg-black" 
                    muted
                  />
                  <div className="p-3">
                    <p className="text-sm line-clamp-2 mb-2">{video.prompt}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(video.created_at).toLocaleDateString()}</span>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => downloadVideo(video.video_url, video.prompt)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}