-- Create user_stats table for tracking daily video limits and referrals
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  daily_videos_used integer NOT NULL DEFAULT 0,
  base_daily_limit integer NOT NULL DEFAULT 10,
  bonus_credits integer NOT NULL DEFAULT 0,
  last_reset_at timestamptz NOT NULL DEFAULT now(),
  total_referrals integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create video_history table to store generated videos
CREATE TABLE public.video_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  prompt text NOT NULL,
  camera_control text,
  video_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create referrals table to track who referred whom
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_clerk_id text NOT NULL,
  referred_clerk_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_stats (users can only see/edit their own stats)
CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for video_history (users can only see their own videos)
CREATE POLICY "Users can view their own videos"
  ON public.video_history FOR SELECT
  USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert their own videos"
  ON public.video_history FOR INSERT
  WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- RLS Policies for referrals
CREATE POLICY "Users can view referrals they made"
  ON public.referrals FOR SELECT
  USING (referrer_clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Anyone can insert referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_user_stats_clerk_id ON public.user_stats(clerk_user_id);
CREATE INDEX idx_video_history_clerk_id ON public.video_history(clerk_user_id);
CREATE INDEX idx_video_history_created_at ON public.video_history(created_at DESC);
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_clerk_id);
CREATE INDEX idx_referrals_referred ON public.referrals(referred_clerk_id);