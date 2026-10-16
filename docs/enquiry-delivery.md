# Public audit enquiry delivery

Flow: optional report form → POST /api/leads → Supabase leads table → existing Google Sheets webhook → acknowledgement.

- Website enquiries require an explicit `consent: true` and retain `Website Audit` attribution. Legacy clients without a source keep the previous `Social Media` default.
- A confirmed database write must return a row. Replaying the same submission ID for the same phone returns its existing receipt without overwriting the row or repeating the backup.
- If the database is unreachable, the existing backup is attempted. Only an HTTP-success response with JSON `status: "success"` counts as acceptance. An HTML sign-in page or an error response never counts.
- A backup acknowledgement is a backup receipt, not evidence that Supabase is repaired or that a human has contacted the lead. There is no new callback, WhatsApp, booking or reconciliation worker in this change.
- Database work shares an 8-second deadline; the backup has its own 8-second deadline. The browser stops waiting after 25 seconds. Neither destination confirming a save produces HTTP 503 with a reference and no callback claim.
- A network interruption after a write can leave an ambiguous result. Check the reference and phone before resubmitting. The existing external webhook's deduplication contract is outside this repository.
- The browser stores a successful receipt alongside the current tab's audit, without caching contact fields. Clearing the audit clears that receipt cache; it does not delete server records.

## Focused checks

With Node 24 and dependencies installed:

```
node --test tests/enquiry-delivery.test.mjs
pnpm exec tsc --noEmit
pnpm exec eslint app/api/leads/route.ts app/report/page.tsx lib/enquiry-delivery.ts tests/enquiry-delivery.test.mjs
pnpm build
```

The storage tests use injected doubles and send no external requests. A local build needs database configuration because legacy routes initialize the existing client at module load; use local placeholders for build-only checks rather than production secrets.

## Current incident and recovery

A controlled production test on 2026-10-17 returned HTTP 500 with `Database error: TypeError: fetch failed` at the first Supabase phone lookup. No insertion path was reached in that request. Vercel configuration and runtime-log access through the connected account returned 403.

An authorised owner must inspect the intended Supabase project's status and the Vercel project's environment configuration. Verify the project is running, its endpoint is current and reachable, and the configured server-side key belongs to that project. Do not disable RLS or expose privileged keys to fix connectivity. Do not print credentials in logs, source or tickets. Redeploy after environment changes.

After restoring connectivity, submit the authorised labelled test using the public form, verify its receipt, check the matching database row and source, and inspect the Sheets/admin destination used for follow-up. Confirm the intended human handling process separately; saving an enquiry does not prove a notification was delivered.
