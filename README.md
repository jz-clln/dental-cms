# 🦷 Dental CMS

A complete clinic management system for dental practices in the Philippines. Built with Next.js 14, Supabase, and Tailwind CSS.

---

## Features

- **Multi-tenant** — each clinic has isolated data via Supabase RLS
- **Dashboard** — today's appointments, stats, activity feed
- **Patients** — records, visit history, billing balance
- **Appointments** — weekly calendar, status tracking
- **Inventory** — stock management with low-stock alerts
- **Billing** — charges, payments, balance tracking (GCash, Maya, Cash, Card)
- **Reports** — revenue charts, appointment stats via Recharts
- **Settings** — clinic info, dentist management, staff accounts

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/dental-cms.git
cd dental-cms
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. In your Supabase dashboard, go to **SQL Editor**
3. Run `supabase/schema.sql` — this creates all tables and RLS policies
4. Run `supabase/seed.sql` — this loads the "Bright Smile Dental Clinic" demo data

### 3. Create the admin user

1. In Supabase dashboard → **Authentication → Users → Add User**
2. Email: `admin@brightsmile.ph`
3. Password: `BrightSmile2024!` (change this after first login)
4. Copy the UUID shown for this new user
5. In **SQL Editor**, run:
   ```sql
   UPDATE staff
   SET auth_user_id = 'paste-uuid-here'
   WHERE email = 'admin@brightsmile.ph';
   ```

### 4. Add environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from: Supabase Dashboard → **Project Settings → API**

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and log in with:
- Email: `admin@brightsmile.ph`
- Password: `BrightSmile2024!`

---

## Deploy to Vercel

1. Push your code to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repository
4. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Click **Deploy**

Vercel will detect Next.js automatically — zero configuration needed.

---

## Adding a New Clinic (Production)

For each new paying client:

1. Create a new row in the `clinics` table with their clinic info
2. Create their admin user in Supabase Auth
3. Create a row in `staff` linking the `auth_user_id` to their `clinic_id`
4. All data they create will automatically be isolated to their clinic via RLS

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Charts | Recharts |
| Icons | Lucide React |
| Deployment | Vercel |
