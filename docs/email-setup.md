# Email confirmation with Brevo

Supabase's built-in email sender is rate limited to a handful of messages per
hour and is explicitly not for production. Confirmation email therefore needs a
real SMTP provider. Brevo's free tier is 300 emails/day with no expiry, which is
far more signups than this product will see for a long time.

Everything below is done in a browser. There is no code change required — the
app already handles the confirmed and unconfirmed cases (see `AuthPage.jsx`).

---

## 0. What is already on this domain

Checked live, and both of these change what you must do:

```
NS      ns09/ns10.domaincontrol.com          → DNS is at GoDaddy
TXT @   v=spf1 include:secureserver.net -all → SPF ALREADY EXISTS, hard-fail
TXT     _dmarc → v=DMARC1; p=quarantine       → DMARC is already ENFORCING
MX      secureserver.net                      → you receive mail here; do not touch MX
```

**The existing SPF ends in `-all`.** That is a hard fail: any server not on
that list is told to reject outright. Add Brevo as a second SPF record and
nothing improves — two SPF records is an invalid config that behaves like
none. The record has to be *edited*, not added.

**DMARC is already `p=quarantine`, not `p=none`.** Mail that fails alignment
goes to spam today, not after some future tightening. So DKIM has to be right
before you enable confirmation, not after. The upside: `aspf=r` and `adkim=r`
are relaxed alignment, which is the forgiving setting.

---

## 1. Add the domain in Brevo

**Senders, Domains & Dedicated IPs → Domains → Add a domain:**
`thethirdperson.ai`

Brevo will show you a DKIM record and a verification record. Keep that tab
open — you need the exact values.

## 2. Edit DNS at GoDaddy

GoDaddy: **My Products → Domains → thethirdperson.ai → DNS → Manage Zones.**

**a. EDIT the existing SPF record.** Find the TXT record on `@` whose value
starts `v=spf1`. Change it to:

```
v=spf1 include:secureserver.net include:spf.brevo.com -all
```

Keep `include:secureserver.net` — removing it breaks the mail you already
receive and send through GoDaddy. Keep `-all`. Do **not** create a second
`v=spf1` record.

**b. ADD the DKIM record** exactly as Brevo shows it. It will be a TXT record
on a host like `mail._domainkey` or `brevo._domainkey`. Copy the value
verbatim — DKIM keys are long and a truncated one fails silently.

**c. ADD Brevo's verification TXT** if it gives you one.

**d. Leave MX alone.** Brevo sends only; your inbound mail stays at GoDaddy.

GoDaddy TTL defaults to 1 hour, so allow that before expecting verification.

## 3. Confirm it actually resolves

Before touching Supabase:

```bash
dig +short TXT thethirdperson.ai | grep spf1
dig +short TXT mail._domainkey.thethirdperson.ai
```

The first must show **one** record containing both `secureserver.net` and
`spf.brevo.com`. The second must return the DKIM key. If either is wrong, stop
here — every step after this depends on them.

## 4. SMTP credentials

**Brevo → SMTP & API → SMTP tab.** You need:

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Login: the SMTP login Brevo shows (an email-shaped string, **not** your
  account email)
- Password: the SMTP key — generate one, and treat it as a secret

## 5. Point Supabase at it

**Supabase Dashboard → Project Settings → Authentication → SMTP Settings.**

- Enable custom SMTP
- Sender email: `noreply@thethirdperson.ai`
- Sender name: `ThirdPerson AI`
- Host / Port / Username / Password: from step 2

The sender address must be on the domain verified in step 1, or Brevo rejects
the message.

## 6. Turn confirmation on

**Authentication → Providers → Email → Confirm email: ON.**

Then **Authentication → URL Configuration**:

- Site URL: `https://www.thethirdperson.ai`
- Redirect URLs: add `https://www.thethirdperson.ai/**`

The app passes `emailRedirectTo` on sign-up, but Supabase only honours a
redirect that matches this allowlist. Miss this and every confirmation link
bounces the user to the Site URL root instead of back where they were.

## 7. Templates

**Authentication → Emails → Templates.** Paste the files in `docs/email/` into
the matching template. They are plain HTML with inline styles, because every
email client strips `<style>` blocks and none of them support CSS variables.

Supabase substitutes `{{ .ConfirmationURL }}` — leave it exactly as written.

## 8. Verify before announcing

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
