# Email confirmation with Brevo

Supabase's built-in email sender is rate limited to a handful of messages per
hour and is explicitly not for production. Confirmation email therefore needs a
real SMTP provider. Brevo's free tier is 300 emails/day with no expiry, which is
far more signups than this product will see for a long time.

Everything below is done in a browser. There is no code change required — the
app already handles the confirmed and unconfirmed cases (see `AuthPage.jsx`).

---

## 1. Brevo account and sender domain

1. Create the account at brevo.com.
2. **Senders, Domains & Dedicated IPs → Domains → Add a domain**:
   `thethirdperson.ai`
3. Brevo shows three DNS records. Add all three at your DNS host:

   | Type | Host | Value |
   |---|---|---|
   | TXT | `brevo-code` (or as shown) | the verification string Brevo gives you |
   | TXT | `mail._domainkey` | the DKIM key Brevo gives you |
   | TXT | `@` | `v=spf1 include:spf.brevo.com mx ~all` |

   If an SPF record already exists on `@`, **merge** it — do not add a second
   one. Two SPF records is the same as none, and it is the most common reason
   mail starts landing in spam after a provider change.

4. Add a DMARC record. Brevo does not require it; inbox providers increasingly
   do, and without it a new sending domain is treated with suspicion:

   | Type | Host | Value |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:dmarc@thethirdperson.ai;` |

   `p=none` is monitor-only, which is the correct place to start. Tighten to
   `quarantine` after a couple of weeks of clean reports.

5. Wait for Brevo to show the domain as verified. DNS can take up to an hour.

## 2. SMTP credentials

**Brevo → SMTP & API → SMTP tab.** You need:

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Login: the SMTP login Brevo shows (an email-shaped string, **not** your
  account email)
- Password: the SMTP key — generate one, and treat it as a secret

## 3. Point Supabase at it

**Supabase Dashboard → Project Settings → Authentication → SMTP Settings.**

- Enable custom SMTP
- Sender email: `noreply@thethirdperson.ai`
- Sender name: `ThirdPerson AI`
- Host / Port / Username / Password: from step 2

The sender address must be on the domain verified in step 1, or Brevo rejects
the message.

## 4. Turn confirmation on

**Authentication → Providers → Email → Confirm email: ON.**

Then **Authentication → URL Configuration**:

- Site URL: `https://www.thethirdperson.ai`
- Redirect URLs: add `https://www.thethirdperson.ai/**`

The app passes `emailRedirectTo` on sign-up, but Supabase only honours a
redirect that matches this allowlist. Miss this and every confirmation link
bounces the user to the Site URL root instead of back where they were.

## 5. Templates

**Authentication → Emails → Templates.** Paste the files in `docs/email/` into
the matching template. They are plain HTML with inline styles, because every
email client strips `<style>` blocks and none of them support CSS variables.

Supabase substitutes `{{ .ConfirmationURL }}` — leave it exactly as written.

## 6. Verify before announcing

1. Sign up with a real address on a domain you do not control (Gmail, Outlook).
2. Confirm it arrives **in the inbox, not spam**.
3. Open the link and check it lands you signed in, on the page you started from.
4. Check the "Send it again" button on the waiting screen works.
5. In Gmail: **Show original** → confirm `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`.

Step 5 is the one people skip. A confirmation email that silently goes to spam
is worse than no confirmation at all, because the account exists and the user
cannot get into it.

## Limits worth knowing

- 300/day is a hard stop on the free plan. At that ceiling, signups fail
  silently from the user's point of view — worth an alert well before it.
- Brevo free adds its own footer to messages. Removing it is a paid plan.
- Password reset and email-change also start flowing through this SMTP once it
  is configured. Their templates are in the same place.
