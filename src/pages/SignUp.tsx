import { SignUp as ClerkSignUp } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";

const SignUp = () => {
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");

  useEffect(() => {
    const handleReferral = async () => {
      if (isSignedIn && user && referralCode && referralCode !== user.id) {
        try {
          // Check if referral already exists
          const { data: existingReferral } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_clerk_id', user.id)
            .maybeSingle();

          if (!existingReferral) {
            // Create referral record
            await supabase.from('referrals').insert({
              referrer_clerk_id: referralCode,
              referred_clerk_id: user.id,
            });

            // Update referrer's bonus credits
            const { data: referrerStats } = await supabase
              .from('user_stats')
              .select('*')
              .eq('clerk_user_id', referralCode)
              .single();

            if (referrerStats) {
              await supabase
                .from('user_stats')
                .update({
                  bonus_credits: referrerStats.bonus_credits + 2,
                  total_referrals: referrerStats.total_referrals + 1,
                })
                .eq('clerk_user_id', referralCode);
            }
          }
        } catch (error) {
          console.error("Error handling referral:", error);
        }
      }

      if (isSignedIn) {
        navigate("/");
      }
    };

    handleReferral();
  }, [isSignedIn, user, referralCode, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gradient-hero)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            Join Nero AI
          </h1>
          <p className="text-muted-foreground">Create stunning AI videos in seconds</p>
          {referralCode && (
            <p className="text-sm text-accent mt-2">🎉 You've been referred! Get started now!</p>
          )}
        </div>
        <div className="flex justify-center">
          <ClerkSignUp 
            routing="path" 
            path="/sign-up"
            signInUrl="/sign-in"
            afterSignUpUrl="/"
          />
        </div>
      </div>
    </div>
  );
};

export default SignUp;
