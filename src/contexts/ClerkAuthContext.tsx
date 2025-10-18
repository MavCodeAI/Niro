import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

interface UserStats {
  dailyVideosUsed: number;
  totalDailyLimit: number;
  totalReferrals: number;
  referralCode: string;
}

interface ClerkAuthContextType {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  userStats: UserStats | null;
  refreshUserStats: () => Promise<void>;
}

const ClerkAuthContext = createContext<ClerkAuthContextType | undefined>(undefined);

export const ClerkAuthProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded, isSignedIn, user } = useUser();
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  const fetchUserStats = async () => {
    if (!user?.id) return;

    try {
      // Check if user stats exist, if not create them
      const { data: existingStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('clerk_user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!existingStats) {
        // Create new user stats
        const { data: newStats, error: insertError } = await supabase
          .from('user_stats')
          .insert({
            clerk_user_id: user.id,
            daily_videos_used: 0,
            base_daily_limit: 10,
            bonus_credits: 0,
            total_referrals: 0,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        setUserStats({
          dailyVideosUsed: 0,
          totalDailyLimit: 10,
          totalReferrals: 0,
          referralCode: user.id,
        });
      } else {
        // Check if we need to reset daily limit (24 hours passed)
        const lastReset = new Date(existingStats.last_reset_at);
        const now = new Date();
        const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

        if (hoursSinceReset >= 24) {
          // Reset daily usage
          const { error: resetError } = await supabase
            .from('user_stats')
            .update({
              daily_videos_used: 0,
              last_reset_at: now.toISOString(),
            })
            .eq('clerk_user_id', user.id);

          if (resetError) throw resetError;

          setUserStats({
            dailyVideosUsed: 0,
            totalDailyLimit: existingStats.base_daily_limit + existingStats.bonus_credits,
            totalReferrals: existingStats.total_referrals,
            referralCode: user.id,
          });
        } else {
          setUserStats({
            dailyVideosUsed: existingStats.daily_videos_used,
            totalDailyLimit: existingStats.base_daily_limit + existingStats.bonus_credits,
            totalReferrals: existingStats.total_referrals,
            referralCode: user.id,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  useEffect(() => {
    if (isSignedIn && user) {
      fetchUserStats();
    }
  }, [isSignedIn, user]);

  return (
    <ClerkAuthContext.Provider
      value={{
        isLoaded,
        isSignedIn: isSignedIn || false,
        userId: user?.id || null,
        userStats,
        refreshUserStats: fetchUserStats,
      }}
    >
      {children}
    </ClerkAuthContext.Provider>
  );
};

export const useClerkAuth = () => {
  const context = useContext(ClerkAuthContext);
  if (!context) {
    throw new Error("useClerkAuth must be used within ClerkAuthProvider");
  }
  return context;
};
