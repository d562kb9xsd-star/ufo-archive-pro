# UFO Archive Pro — Supabase Version

A polished UFO evidence archive website with:
- public home page
- searchable case archive
- case detail modal
- submission form for images, videos, PDFs, and written case studies
- admin login via Supabase Auth
- moderation dashboard
- Supabase database and storage integration
- static front end that can be deployed to Netlify, Vercel, GitHub Pages, or any static host

## 1) Create a Supabase project
Create a new project in Supabase, then note these values:
- Project URL
- anon public key

## 2) Run the SQL setup
Open the SQL editor in Supabase and run:
- `supabase/schema.sql`
- then `supabase/policies.sql`

This creates:
- `cases` table
- `profiles` table
- `ufo-media` storage bucket
- row level security policies
- admin profile helper trigger

## 3) Create your first admin user
In Supabase Auth, create a user with email/password.
Then in the SQL editor run:

```sql
update public.profiles
set role = 'admin'
where email = 'YOUR_ADMIN_EMAIL@example.com';
```

## 4) Add your project keys
Open `public/config.js` and replace:
- `YOUR_SUPABASE_URL`
- `YOUR_SUPABASE_ANON_KEY`

## 5) Run locally
```bash
npm install
npm start
```
Open:
- http://localhost:3000

## 6) Deploy
You can deploy the `public` folder to a static host.

## Notes
- Anonymous visitors can browse approved cases and submit new ones.
- New submissions are marked `pending`.
- Admins can approve, reject, or delete cases.
- Files are stored in the `ufo-media` bucket.

## Suggested branding ideas
- rename the site in `public/config.js`
- replace the hero text in `public/index.html`
- swap the accent glow color in `public/styles.css`
