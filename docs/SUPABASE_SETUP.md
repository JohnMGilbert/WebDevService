# Supabase Setup

This repo now has the starter files needed to move the client portal from browser `localStorage` toward Supabase.

## Files Added

- `supabase/schema.sql` creates the database tables, RLS policies, admin role helper, and private screenshot bucket.
- `/config/supabase-config.example.js` is the browser config template.
- `/config/supabase-client.js` contains reusable auth, profile, ticket, screenshot, and admin helper functions.
- `utils/supabase/server.ts`, `utils/supabase/client.ts`, `utils/supabase/middleware.ts`, `middleware.ts`, and `app/page.tsx` are the Supabase-provided Next helper setup.
- `.env.local.example` documents the required Next environment variables.
- `.gitignore` ignores `.env.local` and private/local secret variants. The browser-safe `/config/supabase-config.js` can stay committed when it only contains the public project URL and publishable key.

## Manual Steps

1. Open your Supabase project.
2. Go to **SQL Editor**.
3. Paste and run `supabase/schema.sql`.
4. Go to **Project Settings > API**.
5. Copy your project URL.
6. Copy your anon/publishable key. Do not use the `service_role` key in browser code.
7. Confirm `.env.local` contains your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
8. Confirm `/config/supabase-config.js` contains the same project URL and publishable key for the current static HTML portal.

```js
window.truePageSupabaseConfig = {
  url: "https://YOUR_PROJECT_ID.supabase.co",
  anonKey: "YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY",
  screenshotBucket: "ticket-screenshots",
};
```

9. In Supabase Auth, create your owner/admin account.
10. In the `profiles` table, set your owner account role to `admin`.

For fast local prototyping, you can temporarily turn off email confirmation in **Authentication > Providers > Email**. If email confirmation stays on, account creation will not create the profile/plan until the client confirms their email and signs in.

Use this SQL after replacing `YOUR_OWNER_AUTH_USER_ID`:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_OWNER_AUTH_USER_ID';
```

## Script Tags To Add When Ready

These have been added before the existing portal scripts on the client and admin portal pages:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/config/supabase-config.js"></script>
<script src="/config/supabase-client.js"></script>
```

The current static HTML portal uses these browser scripts. The `utils/supabase/*.ts` files are for a Next.js version of the site.

## Current Integration

The client and admin portal scripts now use Supabase when `/config/supabase-config.js` is present and configured. The old `localStorage` path remains as a fallback if Supabase is not configured.

Currently wired to Supabase:

- client login and account creation
- client profile loading and updates
- current plan loading
- ticket submission with private screenshot upload
- plan change requests
- client plan cancellation through the `cancel_current_plan()` RPC
- admin login with `profiles.role = 'admin'`
- admin client, ticket, payment, and plan request loading
- admin ticket status updates
- admin paid/current updates
- admin ticket detail screenshot preview/download through signed URLs

## Security Notes

- Keep Row Level Security enabled.
- Never expose the Supabase `service_role` key in HTML or frontend JavaScript.
- Screenshot files are private by default. The helper creates short-lived signed URLs for viewing/downloading.
- A real production admin dashboard is safest behind server-side admin checks. The included RLS role setup is good enough to start prototyping.
