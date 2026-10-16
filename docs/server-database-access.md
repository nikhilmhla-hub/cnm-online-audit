# Audit database security rollout

The shared Supabase project serves online, kiosk and library audits. On 17 October 2026 it was resumed from INACTIVE to ACTIVE_HEALTHY. A live online enquiry was confirmed in primary storage and read back with source Website Audit, queue CNM160 and reference 1792182670784-.

Existing leads and bookings tables have RLS disabled and broad anon/authenticated grants. Do not enable RLS until all connected backend deployments have a working server credential.

## Staged rollout

1. Deploy the server-only Supabase client to all three audit apps. It prefers the private SUPABASE_SERVER_KEY environment variable; the existing anonymous key remains a temporary rollout fallback.
2. Configure an existing Supabase backend secret as a Vercel Secret named SUPABASE_SERVER_KEY in Production and Preview for each connected audit project. Never use NEXT_PUBLIC_, source files, logs or PR bodies for its value. The secret bypasses RLS and must remain on trusted servers.
3. Redeploy each app after its environment change. Confirm primary persistence with the authorised business QA contact. Do not exercise booking or notification routes with unapproved recipients.
4. Enable RLS on public.leads and public.bookings and revoke all table privileges from anon and authenticated. No browser client in the reviewed audits accesses these tables directly. Server credentials retain the existing service_role access. This changes no rows.
5. Check the security advisor, prove anon/authenticated cannot read or write either table, and repeat the live online enquiry and direct database readback. Verify the Sheets/admin follow-up destination separately.

The two public diagnostic GET routes now return 404 without contacting external systems. They previously created contacts, wrote test leads or exposed diagnostic responses.

## Database change to apply after the deployment checks

```sql
begin;
alter table public.leads enable row level security;
alter table public.bookings enable row level security;
revoke all privileges on table public.leads from anon, authenticated;
revoke all privileges on table public.bookings from anon, authenticated;
commit;
```

If verification fails, retain the table protections and correct the server configuration or roll back to a working server-credential deployment. Do not restore anonymous public access as a routine rollback.

Supabase Free projects remain eligible for pausing during low activity. Resuming this project did not change its billing plan. Operational uptime and paid-plan decisions are separate from this security change.
