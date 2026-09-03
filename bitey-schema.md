# Bitey Database Schema — What's Here and Why

Three SQL files, run in this order in the Supabase SQL editor:

1. `001_schema.sql` — all the tables
2. `002_functions_and_triggers.sql` — the logic that enforces the rules
3. `003_rls_policies.sql` — who's allowed to see and touch what

## The tables

Most map directly to your existing types (`clinics`, `staff`, `dentists`,
`patients`, `appointments`, `visit_notes`, `inventory_items`, `billing`,
`payments`). Two are new:

- **`clinic_status`** — holds verification status, trial dates, and
  subscription status, split out of `clinics` on purpose. If these lived on
  the `clinics` table itself, a clinic's own admin would be able to edit
  their own trial end date through the normal "edit clinic settings" screen.
  Splitting them means only a platform admin (or your backend, using the
  service role) can ever change them.
- **`platform_admins`** — a real table listing who counts as a platform
  admin, replacing the `NEXT_PUBLIC_ADMIN_EMAIL` check. That old check ran
  in the browser and put the admin's email in your public JS bundle —
  anyone could read it. This table lets the database itself know who you
  are, so real security rules can reference it.

## How your three decisions were implemented

**Platform admin sees business data, not patient records** — platform
admins get read/write access to `clinics`, `clinic_status`, `staff`, and
`dentists`. They have **no access at all** — not even read — to `patients`,
`appointments`, `visit_notes`, `billing`, `payments`, or `inventory_items`.
If you'd like inventory or dentist info excluded too, that's a one-line
change per table.

**Front desk can archive, not delete** — every clinical table lets both
roles select/insert/update (which covers setting `patients.archived =
true` or an appointment's `status` to `Cancelled`), but only `admin`
staff can actually `DELETE` a row.

**Trial expiry hard-blocks writes** — implemented two ways for safety:
a trigger that blocks new inserts/updates with a clear
`TRIAL_EXPIRED: ...` message your app can catch and show nicely (instead
of a generic database error), plus the same check baked into the RLS
policies as a backstop. Only inserts and updates are blocked — **reading
existing data and deleting/archiving records still work** even after
trial expiry, so a clinic never loses access to what they already
entered. Let me know if you'd rather lock reads too.

## Two bugs this schema exposes in your current code

1. **`staffActions.ts` won't link staff to their login.** It inserts
   `id: authId` into the `staff` table, but `useClinicId.ts` and the
   onboarding route both look up staff by `auth_user_id`. Any staff member
   invited through `createStaffMember` would never resolve a clinic and
   would effectively be locked out. Fix: insert `auth_user_id: authId`
   instead (leave `id` to its default).

2. **`createStaffMember` / `deleteStaffMember` have no permission check.**
   They run on the service role key, which bypasses RLS entirely, but
   nothing in the function verifies the caller is actually an admin of
   that clinic. As written, anyone who can trigger the server action could
   create or remove staff for any clinic. Fix: look up the caller's own
   staff row and role (via the normal cookie-based server client) before
   doing anything with the service-role client.

Also worth doing separately: move the `/admin` authorization check
server-side (e.g. into `middleware.ts`, checking `is_platform_admin()`)
instead of the client-side email comparison in `AdminLayout` — happy to
help with that whenever you're ready.

## One thing the onboarding route will need updated for

`api/onboarding/route.ts` currently writes `trial_started_at` and
`trial_ends_at` straight onto the `clinics` insert. With this schema,
those fields live in `clinic_status` instead, so that route needs a
second insert (using the same service-role client) to create the
matching `clinic_status` row right after the `clinics` row is created.

## Assumptions I made — flag anything you want changed

- Archiving is just a column (`patients.archived`), not something RLS
  hides — so an "Archived Patients" view is still possible.
- No one — not even platform admins — can `DELETE` a clinic through the
  app. That's deliberate; it's the one truly irreversible action.
- A staff member can't update their own row (not even their name) through
  RLS, so a front-desk account can never quietly set its own role to
  admin. Self-service profile edits should go through a controlled server
  action instead.

  All privileged server actions must verify the authenticated user's identity and authorization before using the service-role client. RLS is not considered a substitute for authorization checks when the service role is involved.