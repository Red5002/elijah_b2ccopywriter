# Code To Conversion Copy

You are editing my existing B2C SaaS Copywriter portfolio website. Use my uploaded index.html as base. Do NOT rebuild from scratch. Keep my structure but apply all these changes:

BRANDING:

- Name: Elijah, B2C SaaS Copywriter (Ex Full-Stack Dev)

- Positioning: I write copy that makes users click, not just read. Dev background: React / Django / Supabase.

- Color: Dark background #0a0a0f, neon green accent #00ff88, white text.

HERO SECTION (Above the fold):

- Headline: "Your users don't need another feature. They need a reason to click."

- Sub: "I'm Elijah — full-stack dev turned B2C copywriter. I turn AI tools and apps into products people actually use and pay for."

- CTA buttons: [View My Work] [Book a 15-min Teardown]

- Add small trust bar: "Built with: React • Django • Supabase • Copy that converts"

PORTFOLIO SECTION:

Keep 2 projects only:

PROJECT 1: SubZero - Subscription Killer (B2C Fintech SaaS)

- Tagline: "Stop paying for apps you forgot about"

- Problem: Users lose $348/year on forgotten subs

- My Rewrite:

  Email: "Alex, you're paying for 3 apps you don't use — $564/year. DesignApp Pro hasn't been opened in 64 days. Still charging $29/mo. Want me to kill them for you? [Yes, cancel my zombie subs]"

  Modal: Title "Cancel DesignApp Pro and save $29/mo?" Body "We'll handle the annoying email + cancellation flow. You keep access until Oct 14th, but won't be billed again." Buttons: Primary green "Yes, save me $29/mo" Secondary grey "No, keep charging me"

  Success: "You just saved $348 this year 🎉 Total saved with SubZero so far: $348.00"

- Images to embed: I will upload 3 images: subzero-email.png (Gmail mockup), subzero-modal.png (cancellation modal), subzero-success.png (savings card). Display them in a 3-column grid, rounded corners, soft shadow.

- Result: Made cancellation feel like winning, not losing.

PROJECT 2: ClipForge - AI Clip Generator (B2C Creator Tool)

- Tagline: "Your YouTube video is 10 TikToks you haven't posted yet"

- Problem: Creators spend 3 hours editing 1 video into clips

- My Rewrite:

  BEFORE: "AI-powered clips in 10 seconds"

  AFTER: "Turn 1 long video into 10 viral-ready clips. Auto-captions, hooks, and cuts — done."

- Images: clipforge-grid.png showing 3 vertical 9:16 thumbnails with captions like "THE MISTAKE THAT COST ME $10K"

- Display as Before/After split: messy Premiere timeline vs clean ClipForge grid.

ABOUT SECTION:

- Text: "I used to ship features nobody used. Now I write the words that make them use it. As an ex full-stack dev, I don't just write copy — I think in flows, states, and edge cases. Empty state, error state, success state = all copy opportunities."

- Add 3 bullet points: "I code what I write", "I write for activation, not just acquisition", "I A/B test words like features"

CTA FOOTER:

- Headline: "Got a B2C product that feels like a feature factory?"

- Sub: "I'll do a free 15-min teardown loom of your onboarding."

- Button: "Get My Free Teardown"

DESIGN RULES:

- Make it look like Linear / Stripe — clean, dark, minimal

- Use Inter font

- All project images have 16px border radius and hover scale 1.02

- Mobile responsive, keep sections tight (no huge gaps)

- Keep it one-page scroll.

Now apply all these changes to the index.html file I uploaded and give me the updated file ready to push to Render.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2fb7dc07-1c5c-4cc8-8f56-7d664de0a71b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Supabase Order Submissions

Order creation uses a TanStack Start server function. Keep the existing `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` values for public service reads. The server insert requires
`SUPABASE_SERVICE_ROLE_KEY`; never use a `VITE_` prefix for this secret.

For `npm run dev`, set `SUPABASE_SERVICE_ROLE_KEY` in the ignored `.env.local` file. For local
Cloudflare preview with `npm run preview`, set it in the ignored `.dev.vars` file. In Cloudflare,
configure it as a Worker secret in the dashboard or run
`npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY`. The `VITE_` values must also be available to
the production build.
