# Jelly Bean Artwork

This repository currently contains a static artwork storefront. This guide describes how to continue it into a secure owner-managed painting catalogue using Supabase for authentication, database records, and image storage.

## Current State

- `index.html`, `styles.css`, and `script.js` implement the storefront and its existing visual design.
- `styles.min.css` is generated from `styles.css` with Tailwind CSS. Rebuild it with `npm run build:css` after changing styles or Tailwind classes.
- `script.js` currently defines the six gallery paintings in a hardcoded `galleryItems` array. The gallery is rendered in the browser from that array.
- The cart and order confirmation currently run only in the browser. Customer information and orders are not submitted to a server, and there is no payment processing.
- No Supabase project, admin page, database, or upload flow is configured yet.

The recommended design is to leave the public storefront visual design in place, replace the hardcoded gallery data with a Supabase read, and add a separate owner-only admin page for catalogue changes.

## Recommended Architecture

- **Storefront:** Existing static site, still deployable to GitHub Pages or another static host.
- **Admin:** A separate `admin.html` page and `admin.js` module. Require Supabase Auth before showing management controls.
- **Database:** Supabase Postgres `paintings` table is the source of truth for artwork descriptions, category, dimensions, rand price, image path, and visibility status.
- **Images:** Supabase Storage bucket named `artwork`. Store the image path in the database, not a temporary browser URL.
- **Authorization:** PostgreSQL row-level security (RLS) and Storage policies must enforce owner-only writes. Hiding the admin page or checking a role only in JavaScript is not security.
- **Public catalogue:** Storefront queries only rows whose status is `available`; the returned rows become the gallery cards.

A public Supabase URL and publishable/anon key can be used by the browser only after RLS is enabled and tested. Never place a service-role key, database password, or other privileged secret in `index.html`, `script.js`, a `VITE_*` variable, or any other browser-delivered file.

## Phase 1: Create Supabase Project

1. Create a Supabase project in the region appropriate for the owner and customers. Save the project URL and publishable/anon key for local configuration.
2. In Supabase Auth, create the owner account directly. Do not add public sign-up to the admin interface. Enable multi-factor authentication where available and secure the owner's email account.
3. Record the owner's Supabase Auth user UUID. Use that UUID in the owner-only policies below. Do not use an email address supplied by the browser as the authorization check.
4. Create a private repository/local `.env` file for local configuration. Add `.env` to `.gitignore` before entering credentials. The browser client may receive only the project URL and publishable/anon key; privileged keys stay server-side.

## Phase 2: Create the Catalogue Table and Policies

Create a Supabase SQL migration (for example, `supabase/migrations/001_paintings.sql`) and apply it using the Supabase SQL editor or Supabase CLI. Replace `OWNER_AUTH_USER_UUID` with the real owner UUID before running it.

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

Add an `updated_at` trigger before production so edits reliably update that field. Consider adding an audit table and a trigger recording owner, timestamp, and operation for changes to catalogue records. Keep audit data private to the owner.

### Storage Setup

1. Create an `artwork` bucket in Supabase Storage. It may be public for reading product images, but uploads and deletions must remain owner-only.
2. Configure the bucket's maximum file size and allowed image content types (at least JPEG, PNG, and WebP; include AVIF only if the image tools and browsers you support are tested for it).
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

## Phase 3: Add the Admin Interface

Add an `admin.html` and `admin.js`, plus a small admin stylesheet only if needed. Reuse the current fonts, colors, and form patterns, but keep admin controls out of the public storefront.

The admin page should include:

- Sign-in and sign-out using Supabase Auth. No hardcoded password, client-side password comparison, public registration, or admin secret in source code.
- Session loading and expiry handling. Show the management screen only after Auth has restored a valid session and the database confirms the owner can manage catalogue rows.
- A catalogue table/list showing thumbnail, title, category, status, rand price, and actions to edit, archive/restore, or remove.
- A create/edit form for title, category, dimensions, medium, description, price in whole ZAR, image, alt text, status, and sort order.
- Clear loading, empty, success, and failure messages. Disable submit buttons while a request is in progress and prevent double submission.
- Confirmation before archive or permanent deletion. Prefer `archived` for routine removal so mistakes are reversible. Permanent removal should delete the associated Storage image too.
- Basic accessibility: associated labels, keyboard operation, visible focus, useful error text, and image previews with alt text.

For file uploads, validate size and declared MIME type in the UI for immediate feedback, but do not rely on browser validation as the security boundary. Enforce bucket restrictions too. Consider decoding and re-encoding images server-side or with a trusted image processor to strip metadata and normalize dimensions before storing.

### Safe Create/Update Flow

1. Authenticate and confirm the owner session.
2. Validate required fields, category, status, price, text lengths, and image constraints.
3. Upload the image to a new unique Storage path.
4. Insert or update the painting row with that path.
5. If saving the row fails after upload, delete the new image to avoid an orphaned file and show a retryable error.
6. After a successful save, refresh the admin list and show confirmation. Do not change a painting to `available` until its image and required fields are saved.

For replacing an image, upload the replacement first, update the row, and only then remove the old image. If the row update fails, retain the old image and remove the unused replacement. For permanent deletion, delete the row and image carefully; if multi-step consistency is important, implement the operation in a trusted Edge Function with rollback/cleanup behavior.

## Phase 4: Connect the Public Gallery

1. Add the Supabase browser client using a build tool such as Vite and `@supabase/supabase-js`, or a documented module import. Keep Tailwind's existing production CSS build working.
2. Read public configuration from environment values at build time. The publishable/anon key is not a secret; RLS is the protection. Never add a service-role key to frontend configuration.
3. Replace the hardcoded `galleryItems` array in `script.js` with an async catalogue request selecting only public fields from `paintings`, filtering `status = 'available'`, and ordering by `sort_order` and creation time.
4. Map database columns to the UI's existing card shape or update the renderer to use the database names. Preserve the existing grid, filters, product modal, rand formatting, and responsive layout.
5. Build the image URL from the saved `image_path` and the `artwork` bucket. Do not save short-lived signed URLs for public artwork in the table.
6. Add loading, empty-catalogue, and fetch-error states that fit the current design. If live database loading fails, display a clear error rather than silently claiming a stale hardcoded catalogue is current.
7. Ensure the query returns only available paintings. Draft, sold, and archived work must not appear as orderable gallery items.
8. After an admin save changes status to `available`, a gallery refresh or page reload should fetch and display the new painting without editing `script.js` or HTML. An optional realtime subscription can update an already-open storefront, but it is not required for the first release.

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

## Phase 7: Deploy and Operate

1. Add `.env` and any local secrets to `.gitignore` before setting them. Never commit credentials. The public Supabase URL and publishable key can be exposed to the browser only with the policies above enabled.
2. Add build scripts that produce the site from `index.html`, `admin.html`, and JavaScript modules. Keep `npm run build:css` and verify generated files are reproducible.
3. Deploy the static storefront and admin page over HTTPS. GitHub Pages can host static files while Supabase provides Auth, database, and Storage; alternatively use a host with preview deployments and security-header configuration.
4. Configure the production domain and Supabase Auth redirect URLs precisely. Remove development origins from production Auth settings.
5. Add security headers at the host/CDN where supported, including a carefully tested Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, and frame protections. Test any policy against required Supabase, font, image, and icon hosts before enforcing it.
6. Enable database backups and document recovery for both database rows and artwork files. Restrict Supabase project-owner access and review access logs periodically.
7. Add a privacy notice before collecting or transmitting customer information. Set a retention period and deletion process appropriate to the applicable laws, including POPIA if serving South African customers.

## Separate Work Still Needed for Real Orders

The admin catalogue does not make checkout commercial-ready by itself. The current cart and invoice are client-side demonstrations. Before accepting real orders, add a server-side order endpoint or commerce platform, validate product IDs, availability, and prices server-side, store orders securely, send owner/customer notifications, define shipping/tax/returns rules, and integrate a reputable payment provider if online payment is required. Never process or store raw card details in this static site.

## Suggested Implementation Order

1. Create Supabase project, owner Auth account, SQL migration, and restrictive RLS/Storage policies.
2. Test public/owner/non-owner permissions before building the admin UI.
3. Add the Supabase client and a read-only public gallery query; verify the existing storefront design and filters.
4. Build owner sign-in and painting create/edit/archive flows.
5. Add secure image upload, replacement, and deletion with cleanup behavior.
6. Add validation, error/loading states, audit trail, and accessibility.
7. Run the security and responsive test checklist in staging.
8. Deploy, verify production Auth redirects and policies, configure backups, and only then use the panel for real catalogue updates.
