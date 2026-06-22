# HarborBridge Shipping Brokerage MVP

A client-facing MVP for shipping documentation, shipment tracking, Bill of Lading status, carrier sharing, and client feedback.

## Tech Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, Postgres, Row Level Security, and private Storage
- Vercel deployment target

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and add Supabase credentials when available.

```bash
SUPABASE_URL=
SUPABASE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The app currently runs in demo-data mode without Supabase keys. File upload controls call a server-side Next.js API route and require `SUPABASE_URL` plus `SUPABASE_SECRET_KEY` to write to Supabase Storage.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor or through the Supabase CLI.
3. Run `supabase/seed.sql` for demo shipment data.
4. Confirm the private `shipment-documents` bucket exists.
5. Create demo auth users and matching `profiles` rows:
   - `admin@harborbridge.demo`
   - `shipper@harborbridge.demo`

## Supabase Storage

Document uploads target the private `shipment-documents` bucket created by the migration. Users never upload directly to Supabase. The browser sends files to:

```text
POST /api/storage/upload
```

The Next.js server then uses `SUPABASE_SECRET_KEY` to upload to private Supabase Storage.

Storage paths follow this structure:

```text
company/{company_id}/shipment/{shipment_id}/{document_id}/{timestamp}-{filename}
```

The upload controls do not expose Supabase keys in the browser. `SUPABASE_SECRET_KEY` must only be configured in `.env.local` and Vercel environment variables. Do not commit it.

For demo company uploads, paths use:

```text
11111111-1111-4111-8111-111111111111
```

## Demo Credentials

These are the intended demo accounts once Supabase Auth is connected.

| Role | Email | Password |
| --- | --- | --- |
| Broker Admin | `admin@harborbridge.demo` | `DemoAdmin123!` |
| Shipper | `shipper@harborbridge.demo` | `DemoShipper123!` |
| Shipping Line Guest | Share-link access | No password required |

Carrier demo links:

- `/line/share/demo-share-electronics`
- `/line/share/demo-share-furniture`

## Key Routes

- `/login`
- `/dashboard`
- `/shipments`
- `/shipments/new`
- `/shipments/[id]`
- `/shipments/[id]/documents`
- `/shipments/[id]/timeline`
- `/shipments/[id]/comments`
- `/shipments/[id]/share`
- `/line/share/[token]`
- `/admin`
- `/feedback`

## Deployment to Vercel

1. Push this repo to GitHub.
2. Import the GitHub repo into Vercel.
3. Add the Supabase environment variables in Vercel Project Settings.
4. Deploy.
5. Confirm these smoke tests:
   - Dashboard loads.
   - Shipment detail tabs render.
   - Guest share link only shows one shipment.
   - Feedback page renders and accepts reviewer input visually.

## MVP Limitations

- UI uses typed demo data until Supabase data access is connected.
- Buttons and forms are staged for integration but do not persist records yet.
- Carrier tracking is manual.
- Storage upload controls are present, but signed URL upload/download wiring is a next step.
- Email notifications are deferred; in-app notification UI is included.

## Roadmap

- Supabase-backed CRUD actions.
- Protected file uploads and signed download URLs.
- OCR document extraction.
- AI document mismatch detection.
- DCSA Track & Trace API.
- Carrier API integrations.
- Email parsing.
- Bill of Lading automation.
- HS code validation.
- Sanctions and compliance screening.
