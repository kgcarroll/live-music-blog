# Live Music Blog (Sanity + Next.js)

Editorial site with **Visual Editing**: interviews, photos, and reviews at `/interviews/[slug]`, `/photos/[slug]`, `/reviews/[slug]`. Embedded Studio at **`/studio`**.

## Setup

1. Create a Sanity project at [sanity.io/manage](https://sanity.io/manage) and copy the **Project ID**.
2. Copy `.env.example` to `.env.local` and fill in variables (see below).
3. Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the site and [http://localhost:3000/studio](http://localhost:3000/studio) for Sanity Studio.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | Sanity project id |
| `NEXT_PUBLIC_SANITY_DATASET` | Usually `production` |
| `SANITY_API_READ_TOKEN` | Viewer token — drafts + `SanityLive` / Presentation |
| `NEXT_PUBLIC_SITE_URL` | e.g. `http://localhost:3000` — used for Presentation + stega |
| `RESEND_API_KEY`, `CONTACT_TO_EMAIL` | Contact form (optional until you test `/contact`) |
| `RESEND_FROM` | Optional; defaults to Resend onboarding sender |

### CORS (required for Visual Editing)

In Sanity project **API ? CORS origins**, add:

- `http://localhost:3000` with **Allow credentials** checked  
- Your production URL the same way after deploy.

CLI (optional): `npx sanity cors add http://localhost:3000 --credentials`

## Deploy on Vercel

1. Push this repo and import the project in Vercel.
2. Set the same env vars in **Project ? Settings ? Environment Variables** (Production + Preview as needed).
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://www.example.com`).
4. Deploy. Revalidate is **60s** on the `(site)` segment. For faster updates, set **`SANITY_REVALIDATE_SECRET`** in Vercel and add a Sanity **GROQ webhook** (or API route) that `POST`s to `https://your-domain.com/api/revalidate` with JSON `{ "secret": "<same value>", "paths": ["/", "/interviews"] }` (or `?secret=...&path=/,/interviews`).

## Scripts

- `npm run dev` — Next dev server (Turbopack)
- `npm run build` — Production build
- `npm run lint` — ESLint
