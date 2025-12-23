# Email Setup Guide

This project uses **Resend** for sending transactional emails (order confirmations, download codes, etc.).

## Why Resend?

- ✅ **Free tier**: 100 emails per day (perfect for low-volume sales)
- ✅ **Easy setup**: Just add an API key
- ✅ **Great for Next.js**: Simple integration
- ✅ **No credit card required** for free tier
- ✅ **Reliable delivery**: Professional email service

## Setup Instructions

### 1. Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (no credit card required)
3. Verify your email address

### 2. Get Your API Key

1. Log in to Resend
2. Go to **API Keys** in the dashboard
3. Click **Create API Key**
4. Give it a name (e.g., "Glamour Girls Production")
5. Copy the API key (starts with `re_`)

### 3. Add API Key to Your Project

1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add your Resend API key:

```bash
RESEND_API_KEY="re_your_api_key_here"
```

3. Optional: Set a custom "from" email address (default is `web@glamourgirlsofthesilverscreen.com`):

```bash
RESEND_FROM_EMAIL="Glamour Girls <web@glamourgirlsofthesilverscreen.com>"
```

**Important**: You need to verify the domain `glamourgirlsofthesilverscreen.com` in Resend before you can use this email address. Otherwise, Resend will use their default domain.

4. Optional: Set your base URL for download links:

```bash
NEXT_PUBLIC_BASE_URL="https://yourdomain.com"
```

### 4. Verify Your Domain (Optional but Recommended)

If you want to use a custom "from" email address:

1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Add your domain (e.g., `yourdomain.com`)
4. Follow the DNS verification steps
5. Once verified, you can use emails like `noreply@yourdomain.com`

**Note**: Without domain verification, Resend will use their default domain (`onboarding@resend.dev`), which still works but may look less professional.

### 5. Test It

1. Make a test purchase on your site
2. Check the email inbox you used
3. You should receive a confirmation email with:
   - Order details
   - Download code
   - Download link
   - List of purchased images

## Email Limits

- **Free tier**: 100 emails per day
- **Paid plans**: Start at $20/month for 50,000 emails

For your use case (few sales per week), the free tier is perfect!

## Troubleshooting

### Emails not sending?

1. Check that `RESEND_API_KEY` is set in `.env.local`
2. Restart your Next.js server after adding the environment variable
3. Check the server logs for email errors
4. Verify your API key is correct in Resend dashboard

### Emails going to spam?

1. Verify your domain in Resend (recommended)
2. Use a custom "from" email address
3. Make sure your domain has proper SPF/DKIM records (Resend handles this if you verify your domain)

## What Gets Emailed?

After each successful purchase, customers receive an email with:
- Order confirmation
- Download code
- Direct download link
- List of purchased images with sizes
- Instructions on how to download

The email is sent automatically after payment is processed.

