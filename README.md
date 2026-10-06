# NomadCare OS

Private back office for NomadCare GmbH and UK NOMADCARE LTD: clients, policies, insurers, and a task tracker built around quotes, client follow-ups and insurer chasing.

## Stack

- Next.js 16 (App Router, server actions), Tailwind CSS 4
- Supabase (Postgres + Auth), project `nomadcare-os`, region Frankfurt (eu-central-1)
- Hosted on Railway

## Security model

- Only `duncan@nomadcare.org` can register (database trigger on `auth.users`) or sign in (checked in the app).
- Every table has row-level security: rows are visible only to their owner.
- No health data is stored. No email is ever sent automatically.

## Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API keys (publishable) |

## Develop

```bash
npm install
npm run dev
```

## Roadmap

- Phase 1 (now): clients, policies, insurers, tasks with waiting-on and chase dates, dashboard, DE/EN
- Next: DEMV and Odoo imports, Google Calendar time-blocking, Gmail linking
- Later: quote comparisons, Courtage tracking, renewal workflows, Claude assistant
