# Jelly Bean Artwork

This repository contains the Jelly Bean Artwork storefront and an owner-only catalogue admin page. Supabase provides admin authentication, catalogue records, and image storage; Vercel builds and hosts both pages.

## Current State

- `index.html`, `styles.css`, and `script.js` implement the storefront. The gallery reads available paintings from Supabase when configured; hardcoded sample paintings are no longer used.
- `styles.min.css` is generated from `styles.css` with Tailwind CSS. Rebuild it with `npm run build:css` after changing styles or Tailwind classes.
- `admin.html`, `admin.js`, and `admin.css` provide owner sign-in, catalogue listing, create/edit, archive/restore, permanent delete, and image upload/replacement.
- `supabase/migrations/001_paintings.sql` defines the catalogue table, timestamp trigger, and owner-only database/Storage write policies. Replace its owner UUID placeholder before applying it.
- `vite.config.js` builds both pages into `dist/`; `npm run build` also regenerates the Tailwind CSS.
- The cart and order confirmation currently run only in the browser. Customer information and orders are not submitted to a server, and there is no payment processing.
- The Supabase project and Vercel deployment are not created/configured by this repository. Complete the setup below before using the admin page.

The design keeps the storefront visual style, adds a separate owner-only admin page, and uses the same Supabase catalogue for admin management and public available paintings.

## Recommended Architecture

- **Storefront:** Static Vite-built site that reads available paintings from Supabase.
- **Admin:** The separate `/admin.html` page requires Supabase Auth before showing management controls. Its owner UUID check only controls the interface; RLS policies are the security boundary.
- **Database:** Supabase Postgres `paintings` table is the source of truth for artwork descriptions, category, dimensions, rand price, image path, and visibility status.
- **Images:** Supabase Storage bucket named `artwork`. Store the image path in the database, not a temporary browser URL.
- **Authorization:** PostgreSQL row-level security (RLS) and Storage policies must enforce owner-only writes. Hiding the admin page or checking a role only in JavaScript is not security.
- **Public catalogue:** Storefront queries only rows whose status is `available`; the returned rows become the gallery cards.

A public Supabase URL and publishable/anon key can be used by the browser only after RLS is enabled and tested. Never place a service-role key, database password, or other privileged secret in `index.html`, `script.js`, a `VITE_*` variable, or any other browser-delivered file.

## Phase 1: Create Supabase Project

1. Create a Supabase project in the region appropriate for the owner and customers. Copy its project URL and publishable/anon key for local configuration and Vercel.
2. In Supabase Auth, create the owner account directly and disable public sign-ups in project settings. The admin has no sign-up flow. Enable multi-factor authentication where available and secure the owner's email account.
3. Record the owner's Supabase Auth user UUID. Use it for `VITE_OWNER_ID` and replace every `OWNER_AUTH_USER_UUID` in the checked-in migration before running it. Do not use an email address supplied by the browser as the authorization check.
4. Copy `.env.example` to `.env`. The project URL and publishable/anon key are intentionally browser-visible; privileged keys stay server-side and must never be added to a `VITE_*` variable.

## Phase 2: Create the Catalogue Table and Policies

The source of truth is `supabase/migrations/001_paintings.sql`. Replace every `OWNER_AUTH_USER_UUID` with the real owner UUID, then apply that migration once using the Supabase SQL Editor. The SQL below is a reference for the main table and RLS policies; do not run both the reference and migration. The migration also installs the `updated_at` trigger.

```sql
create table public.paintings (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  slug text unique not null,
  category text not null check (category in ('anime', 'nature', 'fantasy')),
  dimensions text not null check (char_length(dimensions) <= 80),
  medium text not null check (char_length(medium) <= 120),
  description text not null check (char_length(description) <= 2000),
  price_zar integer not null check (price_zar >= 0),
  image_path text not null,
  image_alt text not null check (char_length(image_alt) between 1 and 250),
  status text not null default 'draft'
    check (status in ('draft', 'available', 'sold', 'archived')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.paintings enable row level security;

grant select on public.paintings to anon, authenticated;
grant insert, update, delete on public.paintings to authenticated;

create policy "Public can read available paintings"
on public.paintings for select
to anon, authenticated
using (status = 'available');

create policy "Owner can read all paintings"
on public.paintings for select
to authenticated
using (auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid);

create policy "Owner can insert paintings"
on public.paintings for insert
to authenticated
with check (auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid);

create policy "Owner can update paintings"
on public.paintings for update
to authenticated
using (auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid)
with check (auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid);

create policy "Owner can delete paintings"
on public.paintings for delete
to authenticated
using (auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid);
```

Postgres policies for the same operation are permissive by default and combine with OR. In this example the public policy exposes only available records, while the authenticated-owner policy also permits the owner to see drafts. Confirm the generated policies in Supabase and test as both an anonymous visitor and a non-owner authenticated user.

Consider adding an audit table and a trigger recording owner, timestamp, and operation for changes to catalogue records. Keep audit data private to the owner.

### Storage Setup

1. Create an `artwork` bucket in Supabase Storage and set it to public so product images can be displayed. Uploads and deletions must remain owner-only.
2. Configure the maximum file size to 5 MB and allowed types to `image/jpeg`, `image/png`, and `image/webp` to match the admin form.
3. Add Storage policies on `storage.objects` that allow only the owner UUID to insert, update, or delete objects in `artwork`. Do not grant anonymous uploads.
4. Use generated unique paths such as `paintings/<uuid>/<random-file-name>.webp`; do not trust an uploaded filename as a path. Save that path in `paintings.image_path`.
5. Public reads should be limited to artwork images. Do not put customer uploads, private files, or credentials in this bucket.

Example owner-only Storage policies (replace the UUID):

```sql
create policy "Owner can upload artwork"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'artwork'
  and auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid
);

create policy "Owner can update artwork"
on storage.objects for update to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid
)
with check (
  bucket_id = 'artwork'
  and auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid
);

create policy "Owner can remove artwork"
on storage.objects for delete to authenticated
using (
  bucket_id = 'artwork'
  and auth.uid() = 'OWNER_AUTH_USER_UUID'::uuid
);
```

Do not add a public insert, update, or delete policy. If the bucket is public, public image reads are expected; the public cannot gain write access from that setting. Confirm the exact bucket access behavior in the Supabase project before release.

## Phase 3: Use the Admin Interface

The admin interface is implemented in `admin.html`, `admin.js`, and `admin.css`. Run it locally with `npm run dev` and open `/admin.html`. Configure the environment values below first. Create the owner account in Supabase Dashboard; the page intentionally has no sign-up flow.

The admin page includes:

- Supabase Auth password sign-in/sign-out and session restoration. There is no hardcoded password, public registration, or privileged key in the client.
- A configured owner UUID check plus an RLS-backed database access check before management controls are shown. RLS is authoritative.
- Catalogue listing and create/edit/archive/restore/delete actions, including ZAR price, status, sort order, and artwork image.
- JPEG, PNG, and WebP uploads up to 5 MB, with generated unique Storage paths. Configure Storage restrictions too; browser validation is not the security boundary.
- Cleanup of a new upload if saving its database row fails. Image replacement updates the row before removing the previous image.
- Confirmation before archiving or permanent deletion. Restore returns archived items to `draft`. If Storage cleanup after deletion fails, the page reports that the image needs manual removal.
- Associated labels, keyboard focus, useful status/error messages, and image preview.

### Local Environment

Copy `.env.example` to `.env` and fill in the project values. `.env` is ignored by Git.

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
VITE_OWNER_ID=the-owner-auth-user-uuid
```

Use the Supabase project URL and publishable key (or legacy anon key). `VITE_OWNER_ID` is browser-visible and is only a UI check, never a secret or a substitute for RLS. Do not use a service-role key here.

Run `npm install`, then `npm run dev` and visit `http://localhost:5173/admin.html`. To verify the production output locally, run `npm run build` followed by `npm run preview`.

For file uploads, validate size and declared MIME type in the UI for immediate feedback, but do not rely on browser validation as the security boundary. Enforce bucket restrictions too. Consider decoding and re-encoding images server-side or with a trusted image processor to strip metadata and normalize dimensions before storing.

### Safe Create/Update Flow

1. Authenticate and confirm the owner session.
2. Validate required fields, category, status, price, text lengths, and image constraints.
3. Upload the image to a new unique Storage path.
4. Insert or update the painting row with that path.
5. If saving the row fails after upload, delete the new image to avoid an orphaned file and show a retryable error.
6. After a successful save, refresh the admin list and show confirmation. Do not change a painting to `available` until its image and required fields are saved.

For replacing an image, upload the replacement first, update the row, and only then remove the old image. If the row update fails, retain the old image and remove the unused replacement. For permanent deletion, delete the row and image carefully; if multi-step consistency is important, implement the operation in a trusted Edge Function with rollback/cleanup behavior.

## Phase 4: Public Gallery Integration

The storefront now uses the shared Supabase browser client and queries only public fields from rows with `status = 'available'`, ordered by `sort_order` and creation time. It builds artwork URLs from `image_path`, preserves category filters and quick view, and displays loading, empty, and failure states. Database-controlled titles, descriptions, alt text, and image URLs are escaped before rendering. Newly available admin entries appear after a storefront reload; realtime updates are not configured.

Use `textContent` or DOM element creation for database/customer-controlled text. If a template string is used for HTML, escape every dynamic text and attribute value. Validate image URL/path construction and never accept arbitrary executable URLs from the admin form.

## Phase 5: Price and Catalogue Rules

- Store price as an integer `price_zar` to avoid floating-point currency rounding. Format it for display with `Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' })` or the existing `R 185` style consistently.
- Keep the custom commission estimate logic distinct from product prices; commission quotes should be clearly estimates, not authoritative payment totals.
- Decide what `sold` means for browsing and ordering. Usually sold paintings can be hidden from the buyable gallery or shown in a separate sold/portfolio view.
- Confirm whether archiving hides an item immediately and whether restoring it makes it available again.
- Keep a record of product IDs in cart entries. Before accepting a real order, re-fetch current price and availability on the server; never trust price values stored in a browser cart.

## Phase 6: Tests and Security Review

Test these cases before deploying:

- Anonymous visitors can read only paintings with `status = 'available'`.
- Anonymous visitors cannot insert, update, or delete database rows or upload/delete Storage objects.
- A second authenticated account that is not the owner cannot manage catalogue data or files.
- The owner can create, edit price/details/image, set status, archive, restore, and delete.
- New available paintings appear in the existing gallery and match category filters, quick view, and rand price display.
- Draft, sold, and archived paintings do not appear as available.
- Invalid price, missing fields, oversized file, unsupported MIME type, failed upload, failed database save, and network interruption show safe and useful errors.
- Image replacement and deletion do not leave stale references or unintended orphan files.
- HTML/script-looking titles and descriptions render as text and do not execute.
- Admin routes reject signed-out users, sign-out invalidates the visible session, and expired sessions require re-authentication.
- Test the storefront and admin at desktop and mobile sizes, with keyboard-only navigation and screen-reader labels.

Use Supabase's local development tooling or a separate staging project for policy tests. Do not run destructive deletion tests against production catalogue data.

## Phase 7: Deploy to Vercel and Operate

1. Commit and push the project to a GitHub repository. Confirm `.env` is not tracked; only `.env.example` belongs in Git.
2. In Vercel, choose **Add New Project**, import the repository, and keep the project root at the repository root. Vercel detects Vite; set build command to `npm run build` and output directory to `dist` if they are not detected automatically.
3. In Vercel **Project Settings → Environment Variables**, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_OWNER_ID` for Production. Add them to Preview/Development only if those deployments should use the same Supabase project. Redeploy after changing values because Vite embeds them during the build.
4. Deploy, then open both the storefront URL and `/admin.html`. Sign in with the owner account. Test creating a draft and an available painting, then verify the uploaded image in Supabase Storage.
5. In Supabase **Authentication → URL Configuration**, set the Site URL to the production Vercel/custom domain and add the exact local and production redirect URLs in use. Add preview URLs only if previews require Auth, and remove obsolete origins.
6. Keep database RLS and Storage restrictions enabled. Never add a service-role key to Vercel frontend variables. The project URL and publishable/anon key may be sent to the browser only with RLS correctly configured.
7. Enable database backups and document recovery for rows and artwork files. Restrict Supabase project-owner access and review access logs periodically. Add a privacy notice before collecting/transmitting customer information, with retention and deletion practices appropriate to applicable laws, including POPIA if serving South African customers.

Vercel deployment requires connecting a Git provider or using the Vercel CLI while signed in. Supabase project creation, owner account setup, domain settings, and credential entry must happen in your provider accounts; this repository is prepared for those steps but cannot create cloud resources on your behalf.

## Separate Work Still Needed for Real Orders

The admin catalogue does not make checkout commercial-ready by itself. The current cart and invoice are client-side demonstrations. Before accepting real orders, add a server-side order endpoint or commerce platform, validate product IDs, availability, and prices server-side, store orders securely, send owner/customer notifications, define shipping/tax/returns rules, and integrate a reputable payment provider if online payment is required. Never process or store raw card details in this static site.

## Suggested Implementation Order

1. Create the Supabase project and owner Auth account, replace the migration UUID placeholder, apply the migration, and create/restrict the `artwork` bucket.
2. Configure local `.env`; test owner sign-in and catalogue actions, including a non-owner account that must be rejected by RLS.
3. Connect the Git repository to Vercel, enter the three Vite environment values, deploy, and verify `/admin.html` and the live storefront gallery.
4. Run the security and responsive checklist in staging, configure backups, and only then use the panel for real catalogue updates.
