# Panwar SmartCare Hub

Hindi-first multi-clinic Next.js PWA for:

- Dr. Satta Ram Panwar Clinic
- Dhandev Dental Clinic
- Associated Pharmacy

It includes:

- appointment booking
- QR walk-in token generation
- patient queue status by mobile number
- staff dashboard with next / hold / skip / reschedule
- live waiting-room screen
- offline-safe provisional entries with local sync retry

## Tech Stack

- Next.js 16 App Router
- Tailwind CSS 4
- Supabase Postgres
- Supabase Storage
- server-signed PIN session auth
- IndexedDB/localStorage fallback for offline-safe patient flows

## Routes

- `/` home portal
- `/book?clinic=surgery|dental|pharmacy`
- `/walkin?clinic=surgery|dental|pharmacy`
- `/status?clinic=surgery|dental|pharmacy`
- `/staff?clinic=surgery|dental|pharmacy`
- `/live?clinic=surgery|dental|pharmacy`
- `/offline`

## Local Run

```bash
npm install
npm run dev
```

## Required Environment Variables

Copy `.env.example` to `.env.local` for local testing.

Public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_APP_BASE_URL`

Server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DATABASE_URL`
- `SUPABASE_STORAGE_BUCKET`
- `STAFF_ALLOWED_EMAILS`
- `STAFF_SESSION_SECRET`
- `DOCTOR_PIN_SURGERY`
- `DOCTOR_PIN_DENTAL`
- `PHARMACY_PIN`

## Manual Supabase Setup

Follow these steps in order. Yehi woh manual work hai jo aapko karna padega:

1. Supabase project create karo.
2. `SQL Editor` kholo aur [supabase/schema.sql](/D:/my%20app/Dr.%20Sr%20panwar/clinic-pwa/supabase/schema.sql) ka poora SQL run karo.
3. `Storage` mein private bucket banao:
   `prescriptions`
4. `Project Settings > API` se ye values copy karo:
   `Project URL`
   `service_role key`
5. `Project Settings > Database` se pooled connection string copy karo.
   Recommended: Supabase transaction/session pooler URL with `sslmode=require`
6. Staff records do tareeqon se add kar sakte ho:
   doctor aur pharmacy ke liye env PINs use honge
   receptionist/staff ke liye app ke `/staff/manage` page se members create honge after first deploy

## Manual Vercel Setup

Vercel project mein ye env vars add karo:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_APP_BASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DATABASE_URL`
- `SUPABASE_STORAGE_BUCKET`
- `STAFF_ALLOWED_EMAILS`
- `STAFF_SESSION_SECRET`
- `DOCTOR_PIN_SURGERY`
- `DOCTOR_PIN_DENTAL`
- `PHARMACY_PIN`
- `DOCTOR_NAME_SURGERY`
- `DOCTOR_NAME_DENTAL`
- `PHARMACY_NAME`

Notes:

- `NEXT_PUBLIC_APP_BASE_URL` mein final deployed URL dalo, for example `https://dr-srpanwar.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL` format usually `https://<project-ref>.supabase.co` hota hai
- `SUPABASE_SERVICE_ROLE_KEY` ko sirf server env mein rakho
- `SUPABASE_DATABASE_URL` mein direct/pooled Postgres connection string paste karo
- `SUPABASE_STORAGE_BUCKET` by default `prescriptions` rakho
- `STAFF_ALLOWED_EMAILS` comma-separated list honi chahiye
- `STAFF_SESSION_SECRET` random long secret rakho
- doctor/pharmacy PINs strong 4-6 digit ya longer numeric PIN rakho

## First Live Test Checklist

1. Home page open karo.
2. `?clinic=surgery`, `?clinic=dental`, `?clinic=pharmacy` teenon flows check karo.
3. Booking create karo aur status page se mobile number search karo.
4. Walk-in token generate karo.
5. Staff login karo.
6. `Next Token Call करें` click karke `/live` screen verify karo.
7. Internet off karke provisional booking / walk-in test karo.
8. Internet on karke sync verify karo.

## Current Architecture

1. `src/app`
   Routes and route handlers
2. `src/features/clinic/state`
   Client provider for clinic state, refresh, and offline/online transitions
3. `src/features/clinic/services`
   Queue engine and client orchestration
4. `src/lib/firebase`
   legacy path name, but now backed by Supabase Postgres + Storage store modules
5. `src/lib/supabase`
   Supabase database and storage helpers
5. `src/services/api.ts`
   Axios client with bearer-token forwarding for staff actions

## Notes

- Public patient actions use same-origin API routes.
- Staff actions use signed server session cookies plus bearer token fallback.
- If Supabase env vars are missing, patient-side local fallback still works for prototype-style testing.
