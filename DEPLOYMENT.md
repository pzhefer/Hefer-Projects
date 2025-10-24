# Deploying to Vercel

This guide will help you deploy your construction management application to Vercel for mobile access.

## Prerequisites

- A GitHub, GitLab, or Bitbucket account
- A Vercel account (sign up at https://vercel.com)

## Step 1: Push Your Code to Git Repository

If you haven't already, push your code to a Git repository:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repository-url>
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com and sign in
2. Click "Add New..." → "Project"
3. Import your Git repository
4. Configure your project:
   - **Framework Preset**: Vite (should be auto-detected)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. Add Environment Variables:
   - Click "Environment Variables"
   - Add the following variables:
     - `VITE_SUPABASE_URL` = `https://rcycktljpzbapvymwgls.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjeWNrdGxqcHpiYXB2eW13Z2xzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NDA3MDUsImV4cCI6MjA3NTQxNjcwNX0.DjT0WJQ_U8ojVOWtpamY3vs_5IZ01GSn0PaouCLe-ro`

6. Click "Deploy"

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts and add environment variables when asked

## Step 3: Access on Mobile

Once deployed, Vercel will provide you with a URL like:
- `https://your-project-name.vercel.app`

Simply open this URL in any web browser on your mobile device (Safari, Chrome, Firefox, etc.).

## Step 4: Custom Domain (Optional)

If you want to use a custom domain:

1. Go to your project settings in Vercel
2. Click "Domains"
3. Add your custom domain
4. Follow the DNS configuration instructions

## Automatic Deployments

Vercel automatically deploys your app whenever you push changes to your Git repository:
- **Main branch**: Deploys to production
- **Other branches**: Creates preview deployments

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Verify your build works locally: `npm run build`

### App Not Loading
- Check browser console for errors
- Verify Supabase environment variables are correct
- Check Vercel deployment logs

### Mobile Issues
- Ensure you're accessing via HTTPS (Vercel provides this automatically)
- Clear browser cache on mobile device
- Try different mobile browsers

## Support

For Vercel-specific issues, visit: https://vercel.com/docs
