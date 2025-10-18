# Nero AI - Setup Instructions

## 🔐 Clerk Authentication Setup

To enable authentication in your Nero AI app, you need to configure Clerk:

### 1. Create a Clerk Account
1. Go to [Clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application in the Clerk dashboard
3. Choose "Email" as your authentication method

### 2. Get Your Publishable Key
1. In your Clerk dashboard, go to **API Keys**
2. Copy your **Publishable Key** (starts with `pk_`)

### 3. Configure Your App
1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your Clerk key:
```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

### 4. Deploy
When deploying to production:
1. Add the `VITE_CLERK_PUBLISHABLE_KEY` environment variable in your hosting platform
2. Update your Clerk dashboard with your production domain

## ✨ Features Implemented

### Authentication
- ✅ Sign In / Sign Up with Clerk
- ✅ Protected video generation (requires login)
- ✅ User profile with avatar
- ✅ Automatic session management

### Video Generation
- ✅ 10 free video credits per day
- ✅ Camera control options
- ✅ Video preview with download
- ✅ Generation history

### Referral System
- ✅ Unique referral link for each user
- ✅ +2 bonus credits per successful referral
- ✅ Referral tracking in dashboard

### Dashboard
- ✅ Daily credits counter
- ✅ Referral statistics
- ✅ Video generation history
- ✅ One-click video downloads

### Database (Lovable Cloud)
- ✅ User statistics tracking
- ✅ Video history storage
- ✅ Referral tracking
- ✅ Automatic daily reset (24 hours)

## 🎯 User Flow

1. **New User**:
   - Visits site → Signs up → Gets 10 daily credits
   - Can generate videos immediately
   - Receives unique referral link

2. **Referral Signup**:
   - New user signs up via referral link
   - Referrer gets +2 bonus credits per day permanently
   - Tracked in dashboard

3. **Daily Usage**:
   - Credits reset every 24 hours
   - Base 10 credits + bonus from referrals
   - Clear feedback when limit reached

## 📱 Responsive Design
- ✅ Mobile-optimized layouts
- ✅ Tablet-friendly interface
- ✅ Desktop enhanced experience
- ✅ Touch-friendly controls

## 🚀 Next Steps

To make your app production-ready:

1. **Add Clerk Domain**: Add your production domain to Clerk's allowed domains
2. **Test Thoroughly**: Test signup, video generation, and referrals
3. **Monitor Usage**: Check Lovable Cloud dashboard for database usage
4. **Customize Branding**: Update colors, logo, and content as needed

## 🆘 Troubleshooting

**"Missing Clerk Publishable Key" Error**:
- Make sure `.env.local` file exists
- Verify the key is correct and starts with `pk_`
- Restart your development server

**Video Generation Not Working**:
- Check if user is signed in
- Verify daily credits are available
- Check browser console for errors

**Referral Not Working**:
- Ensure referral link includes `?ref=` parameter
- Check Lovable Cloud dashboard for referral records
- Verify user is signed in before checking stats
