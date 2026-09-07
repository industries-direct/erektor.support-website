# Cloudflare Pages Setup Guide

This site is now configured to be hosted on **Cloudflare Pages** at the custom domain **erektor.support**.

## Changes Made

### 1. Updated Jekyll Configuration (`_config.yml`)
- Changed `url` from `https://support.erektor-return.systems` to `https://erektor.support`
- Changed `domain` from `support.erektor-return.systems` to `erektor.support`
- Updated comment from "GitHub Pages Settings" to "Cloudflare Pages Settings"

### 2. Added CNAME File
- Created `CNAME` file containing `erektor.support` for DNS configuration
- This file will be included in the built site for proper domain routing

### 3. Created Cloudflare Deployment Workflow
- Created `.github/workflows/cloudflare-deploy.yml`
- Workflow triggers on pushes to `main` or `master` branches (or manual trigger)
- Uses `helaili/jekyll-action@v2` to build the Jekyll site
- Deploys built site to Cloudflare Pages using `cloudflare/wrangler-action@v3`

## Next Steps to Deploy

### 1. Create Cloudflare Account & Project
- Go to [Cloudflare Pages](https://pages.cloudflare.com/)
- Create a new project or use existing one
- Name: `support-portal` (or update the workflow accordingly)

### 2. Set Repository Secrets
Add these secrets to your GitHub repository (Settings > Secrets > Actions):
- `CLOUDFLARE_API_TOKEN`: Your Cloudflare API token with Pages deploy permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID

To create these:
1. Log in to Cloudflare dashboard
2. Go to Account > API Tokens
3. Create a token with "Cloudflare Pages" permissions
4. Get your Account ID from the dashboard

### 3. Configure DNS
- In Cloudflare dashboard, add `erektor.support` as a custom domain
- Update your domain registrar's nameservers to point to Cloudflare:
  - `abby.ns.cloudflare.com`
  - `bragg.ns.cloudflare.com`
  - (Cloudflare will provide specific nameservers for your account)

### 4. Enable Automatic Deployment
- Connect your GitHub repository to Cloudflare Pages via the Cloudflare dashboard
- Select `main` branch for deployments
- Configure build settings:
  - Build command: `jekyll build`
  - Build output directory: `_site`
  - Root directory: `/`

### 5. Verify Deployment
- Push changes to `main` branch
- GitHub Actions workflow will trigger and deploy to Cloudflare
- Site will be accessible at `https://erektor.support`

## DNS Configuration Example

Update your domain registrar with Cloudflare nameservers:
```
nameserver1: abby.ns.cloudflare.com
nameserver2: bragg.ns.cloudflare.com
```

(Replace with actual nameservers provided by Cloudflare)

## Rollback to GitHub Pages

If you need to revert to GitHub Pages hosting:
1. Restore the original `_config.yml` with `support.erektor-return.systems` domain
2. Remove the `CNAME` file
3. Remove `.github/workflows/cloudflare-deploy.yml`
4. Re-enable GitHub Pages in repository settings

## Support

For issues with:
- **Cloudflare**: Visit [Cloudflare Support](https://support.cloudflare.com/)
- **Jekyll**: Refer to [Jekyll Documentation](https://jekyllrb.com/docs/)
- **GitHub Actions**: Check [GitHub Actions Docs](https://docs.github.com/en/actions)
