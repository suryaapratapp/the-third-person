# ThirdPerson AI Supabase Backend Plan

This is a review-only plan. Nothing has been applied to the Supabase project yet.

## Current Codebase Findings

- React + Vite frontend.
- Custom lightweight router in `src/state/RouterContext.jsx`.
- Browser-only state in `src/state/AnalysisContext.jsx`.
- Local-only report storage in `src/lib/reportsStore.js`.
- Puter-based AI services currently in:
  - `src/lib/puterAnalysisService.js`
  - `src/lib/puterBestieBotService.js`
  - `src/lib/puterUsageService.js`
- No Supabase client package is installed yet.
- No existing `supabase/` project structure existed before this planning pass.

## Supabase Project Inspection Status

- MCP server is configured for project `tinxrnxnxygyljmsklhf`.
- Supabase MCP tools were used on 2026-05-13.
- Current `public` schema has no application tables.
- Current project has no applied migrations.
- Current project has no Edge Functions.
- Current Storage has no user-created buckets.
- `pgcrypto` is already installed in the `extensions` schema.

## Live Database Tables Found Through Supabase MCP

### `public` schema

No tables found.

### `auth` schema

Supabase-managed auth tables found:

- `auth.users`
- `auth.refresh_tokens`
- `auth.instances`
- `auth.audit_log_entries`
- `auth.schema_migrations`
- `auth.identities`
- `auth.sessions`
- `auth.mfa_factors`
- `auth.mfa_challenges`
- `auth.mfa_amr_claims`
- `auth.sso_providers`
- `auth.sso_domains`
- `auth.saml_providers`
- `auth.saml_relay_states`
- `auth.flow_state`
- `auth.oauth_clients`
- `auth.oauth_authorizations`
- `auth.oauth_consents`
- `auth.oauth_client_states`
- `auth.custom_oauth_providers`
- `auth.webauthn_credentials`
- `auth.webauthn_challenges`

Notes:

- `auth.users` currently has `0` rows.
- These are Supabase-managed system tables. The app migration should not modify them directly, except for creating an `after insert` trigger on `auth.users` to create a matching `public.profiles` row.

### `storage` schema

Supabase-managed storage tables found:

- `storage.migrations`
- `storage.buckets`
- `storage.objects`
- `storage.s3_multipart_uploads`
- `storage.s3_multipart_uploads_parts`
- `storage.buckets_analytics`
- `storage.buckets_vectors`
- `storage.vector_indexes`

Notes:

- `storage.buckets` currently has `0` rows.
- The planned migration creates one private bucket: `chat-uploads`.

## Live Edge Functions Found Through Supabase MCP

No Edge Functions found.

## Live Migrations Found Through Supabase MCP

No migrations found.

## Tables To Create

1. `profiles`
   - One row per `auth.users` user.
   - Stores safe profile data, zodiac fields, avatar URL, language/tone preference.

2. `relationship_reports`
   - Stores generated relationship intelligence summaries.
   - Grouped by `chain_id` for same person/relation/platform.

3. `bestie_messages`
   - Stores Bestie Bot messages per user and chain.

4. `user_personality`
   - Stores generated personality card/report data for the signed-in user.

5. `plans`
   - Stores public plan metadata.

6. `subscriptions`
   - Stores user subscription state.
   - Intended to be written by service-role Edge Functions only.

7. `analysis_credits`
   - Stores weekly/monthly report and Bestie message allowance.

8. `daily_message_usage`
   - Tracks daily usage counts for reports and Bestie messages.

9. `ai_usage_logs`
   - Logs AI action usage outcomes and rough usage units.

10. `payment_events`
   - Stores payment provider webhook events.
   - No direct user read policies in v1.

## RLS Policy Model

All public tables have RLS enabled.

- `profiles`: authenticated users can select/insert/update only their own `id = auth.uid()`.
- `relationship_reports`: authenticated users can select/insert/update/delete only rows where `user_id = auth.uid()`.
- `bestie_messages`: authenticated users can select/insert/update/delete only rows where `user_id = auth.uid()`.
- `user_personality`: authenticated users can select/insert/update only rows where `user_id = auth.uid()`.
- `plans`: anon and authenticated users can read active plans only.
- `subscriptions`: authenticated users can read only their own rows. Writes reserved for Edge Functions/service role.
- `analysis_credits`: authenticated users can read only their own rows. Writes reserved for Edge Functions/service role.
- `daily_message_usage`: authenticated users can read only their own rows. Writes reserved for Edge Functions/service role.
- `ai_usage_logs`: authenticated users can read only their own rows. Writes reserved for Edge Functions/service role.
- `payment_events`: no anon/auth policies. Service role only.

## Storage Bucket

Bucket: `chat-uploads`

- Private bucket.
- 10MB file limit.
- Allowed MIME types:
  - `text/plain`
  - `application/json`
  - `text/csv`
  - `application/zip`
- Storage object policies restrict users to paths starting with their own auth UID:
  - `${auth.uid()}/...`

## Edge Functions To Create Later

1. `generate-relationship-report`
   - Requires authenticated user JWT.
   - Checks credits/subscription before AI call.
   - Reads uploaded/pasted conversation payload.
   - Calls AI provider using server-side secret key.
   - Inserts `relationship_reports`.
   - Updates `analysis_credits`, `daily_message_usage`, and `ai_usage_logs`.
   - Returns clear errors:
     - `NO_CREDITS`
     - `SUBSCRIPTION_EXPIRED`
     - `AI_PROVIDER_UNAVAILABLE`

2. `ai-bestie-chat`
   - Requires authenticated user JWT.
   - Checks credits/subscription before AI call.
   - Builds compressed context from the user’s `relationship_reports` chain.
   - Calls AI provider using server-side secret key.
   - Inserts user and assistant rows into `bestie_messages`.
   - Updates usage tables/logs.
   - Returns clear errors:
     - `NO_CREDITS`
     - `SUBSCRIPTION_EXPIRED`
     - `CHAIN_NOT_FOUND`
     - `AI_PROVIDER_UNAVAILABLE`

## Environment Variables Required

Frontend Vite:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Supabase Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` or `GEMINI_API_KEY`
- `AI_PROVIDER`
- `PAYMENT_WEBHOOK_SECRET`
- `PAYMENT_SECRET_KEY`

Important:

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in the React frontend.
- Payment secrets stay server-side only.

## React Files To Edit Later

1. Install dependency:
   - `@supabase/supabase-js`

2. Create:
   - `src/lib/supabaseClient.js`
   - `src/state/AuthContext.jsx`
   - `src/components/ProtectedRoute.jsx`
   - `src/pages/AuthPage.jsx`

3. Update:
   - `src/main.jsx` to wrap app in `AuthProvider`.
   - `src/App.jsx` to add `/auth` route and protect:
     - `/analysis/new`
     - `/analysis/loading`
     - `/analysis/result`
     - `/reports`
     - `/reports/:chainId/bestie`
     - `/personality-card`
     - `/profile`
   - `src/components/TopNav.jsx` for login/logout state.
   - `src/lib/reportsStore.js` to replace localStorage with Supabase queries.
   - `src/lib/puterAnalysisService.js` or new service to call `generate-relationship-report`.
   - `src/lib/puterBestieBotService.js` or new service to call `ai-bestie-chat`.
   - `src/lib/puterUsageService.js` or new service to read `analysis_credits` / `daily_message_usage`.

## Auth Setup

Supabase Auth providers to configure:

- Email login.
- Google login.

Google provider usually requires dashboard/API configuration with:

- Google OAuth Client ID.
- Google OAuth Client Secret.
- Redirect URLs for local and production domains.

## Migration File

Draft migration:

- `supabase/migrations/20260512154000_initial_backend_auth.sql`

This file is not applied yet.
