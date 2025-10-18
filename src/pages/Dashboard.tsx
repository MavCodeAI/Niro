import { useEffect, useState } from "react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Video, Users, Sparkles, Copy, Check, Download, ArrowLeft } from "lucide-react";
import { useClerkAuth } from "@/contexts/ClerkAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface VideoHistory {
  id: string;
  prompt: string;
  video_url: string;
  camera_control: string | null;
  created_at: string;
}

const Dashboard = () => {
  const { user } = useUser();
  const { userStats } = useClerkAuth();
  const navigate = useNavigate();
  const [videoHistory, setVideoHistory] = useState<VideoHistory[]>([]);
  const [copied, setCopied] = useState(false);

  const referralLink = user ? `${window.location.origin}/sign-up?ref=${user.id}` : "";

  useEffect(() => {
    const fetchVideoHistory = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('video_history')
        .select('*')
        .eq('clerk_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching video history:", error);
      } else {
        setVideoHistory(data || []);
      }
    };

    fetchVideoHistory();
  }, [user]);

  const copyReferralLink = async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Copied!", description: "Referral link copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (url: string) => {
    window.open(url, '_blank');
    toast({
      title: "Opening Video",
      description: "Right-click and choose 'Save video as...' to download",
    });
  };

  return (
    <div className="min-h-screen bg-[var(--gradient-hero)]">
      <div className="container mx-auto px-4 py-12">
        <Button 
          variant="ghost" 
          className="mb-6"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Card */}
          <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="text-2xl">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{user?.fullName}</h2>
                <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
          </Card>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary/10">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Daily Credits</p>
                  <p className="text-2xl font-bold">
                    {userStats ? userStats.totalDailyLimit - userStats.dailyVideosUsed : 10}
                    <span className="text-sm text-muted-foreground"> / {userStats?.totalDailyLimit || 10}</span>
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-accent/10">
                  <Users className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Referrals</p>
                  <p className="text-2xl font-bold">{userStats?.totalReferrals || 0}</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary/10">
                  <Sparkles className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Credits</p>
                  <p className="text-2xl font-bold">
                    +{userStats ? userStats.totalDailyLimit - 10 : 0}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Referral Card */}
          <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Invite Friends & Earn Rewards
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Get +2 extra video credits per day for each friend who signs up!
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 rounded-lg bg-background/50 border text-sm"
              />
              <Button onClick={copyReferralLink} size="sm">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </Card>

          {/* Video History */}
          {videoHistory.length > 0 && (
            <Card className="p-6 bg-card/80 backdrop-blur-lg border-border/20">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                Recent Videos
              </h3>
              <div className="space-y-4">
                {videoHistory.map((video) => (
                  <div key={video.id} className="flex items-start gap-4 p-4 rounded-lg bg-background/50 border">
                    <video
                      src={video.video_url}
                      className="w-32 h-20 object-cover rounded-lg bg-black"
                      muted
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium line-clamp-2">{video.prompt}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(video.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(video.video_url)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
