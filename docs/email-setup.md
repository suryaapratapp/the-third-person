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

## 2. DNS at GoDaddy — one edit, three additions

GoDaddy: **My Products → Domains → thethirdperson.ai → DNS → Manage Zones.**

GoDaddy appends the domain to whatever you type in Name, so enter the short
form (`brevo1._domainkey`), never the full hostname.

### EDIT — the existing SPF record

Find the TXT record on `@` whose value starts `v=spf1` and change it to:

```
v=spf1 include:secureserver.net include:spf.brevo.com -all
```

Keep `include:secureserver.net` or the mail you already send and receive
through GoDaddy starts failing. Keep `-all`. Do **not** add a second `v=spf1`
record.

### ADD — three new records

| Type | Name | Value |
|---|---|---|
| TXT | `@` | `brevo-code:84b17c410cd73dfbb149b72705edffdf` |
| CNAME | `brevo1._domainkey` | `b1.thethirdperson-ai.dkim.brevo.com` |
| CNAME | `brevo2._domainkey` | `b2.thethirdperson-ai.dkim.brevo.com` |

Two things worth being precise about:

- **The DKIM records are CNAME, not TXT.** Brevo hosts the keys and rotates
  them; a CNAME follows that automatically. Entering them as TXT silently
  fails verification.
- **A second TXT on `@` is fine.** The "never two records" rule applies only
  to SPF — `@` already holds a google-site-verification TXT and the Brevo code
  sits happily beside it.

### DO NOT TOUCH — DMARC

Brevo suggests `v=DMARC1; p=none; rua=mailto:rua@dmarc.brevo.com`.

**Ignore it.** The domain already has:

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net;
```

`p=quarantine` is *stronger* than the `p=none` Brevo proposes, and Brevo
already reports this record as matching — it only checks that a valid DMARC
record exists, not that it matches its suggestion. Replacing it would weaken
the domain's protection for no gain.

Optional, and the only DMARC change worth making: append Brevo's reporting
address so failures show up in the Brevo dashboard, without changing policy.

```
v=DMARC1; p=quarantine; adkim=r; aspf=r; rua=mailto:dmarc_rua@onsecureserver.net,mailto:rua@dmarc.brevo.com;
```

### Leave MX alone

Brevo sends only. Inbound mail stays at `secureserver.net`.

GoDaddy's default TTL is 1 hour, so allow that before expecting Brevo to
verify.

## 3. Confirm it actually resolves

Before touching Supabase:

```bash
dig +short TXT thethirdperson.ai | grep spf1
dig +short TXT thethirdperson.ai | grep brevo-code
dig +short CNAME brevo1._domainkey.thethirdperson.ai
dig +short CNAME brevo2._domainkey.thethirdperson.ai
```

Expected: **one** SPF line containing both `secureserver.net` and
`spf.brevo.com`, the brevo-code TXT, and both CNAMEs resolving to
`b1./b2.thethirdperson-ai.dkim.brevo.com`.

If any of those is missing or duplicated, stop here — every step after this
depends on them, and a wrong DKIM record fails silently rather than loudly.

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
