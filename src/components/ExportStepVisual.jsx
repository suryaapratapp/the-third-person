import {
  PiArrowLeft, PiCaretRight, PiCheck, PiCheckCircle, PiDotsThreeVertical,
  PiDownloadSimple, PiExport, PiHourglassMedium,
} from 'react-icons/pi';

// Illustrated export steps, replacing the dashed "screenshot placeholder" boxes.
//
// These are deliberately DRAWINGS, not screenshots. We cannot ship real
// captures of WhatsApp, Instagram, Messenger or Snapchat: their interfaces are
// copyrighted and their marks are trademarked, and redistributing them on a
// commercial page is a risk that a help article does not justify.
//
// Drawings also age better. These apps redesign their settings trees every few
// months, and a stale screenshot is worse than a diagram — it looks
// authoritative while sending someone down a menu that no longer exists. A
// schematic shows the *path* ("Settings → Accounts Centre → Your information"),
// which is the part that actually survives a redesign, and it is one edit to
// fix when it doesn't.
//
// Every primitive is generic on purpose: no app logos, no brand colours, no
// imitation of a specific vendor's visual design.

function Frame({ kind = 'phone', children, label }) {
  if (kind === 'desktop') {
    return (
      <div className="mx-auto w-full max-w-sm overflow-hidden rounded-sm border border-line bg-well shadow-glow">
        <div className="flex items-center gap-1.5 border-b border-line bg-paper px-3 py-2">
          {['#fb7ba6', '#fbc89a', '#a78bfa'].map((c) => (
            <span key={c} className="h-2 w-2 rounded-full" style={{ background: c, opacity: 0.7 }} />
          ))}
          <span className="ml-2 text-xs text-ash">{label}</span>
        </div>
        <div className="p-3">{children}</div>
      </div>
    );
  }
  return (
    <div className="mx-auto w-full max-w-[218px] overflow-hidden rounded-sm border border-line bg-well p-1.5 shadow-glow">
      <div className="relative overflow-hidden rounded-sm bg-well">
        <div className="mx-auto mt-1.5 h-1 w-10 rounded-full bg-well" aria-hidden="true" />
        <div className="p-2.5">{children}</div>
      </div>
    </div>
  );
}

const HL = 'border-signal/35 bg-signal/10 text-bone';
const PLAIN = 'border-line bg-paper text-smoke';

function Row({ text, highlight, trailing }) {
  return (
    <div className={`flex items-center justify-between gap-2 rounded-lg border px-2 py-1.5 ${highlight ? HL : PLAIN}`}>
      <span className="truncate text-[0.6rem] leading-4">{text}</span>
      {trailing ?? <PiCaretRight className={`shrink-0 text-[0.6rem] ${highlight ? 'text-signal' : 'text-ash'}`} aria-hidden="true" />}
    </div>
  );
}

function ScreenTitle({ children, back }) {
  return (
    <div className="mb-2 flex items-center gap-1.5">
      {back && <PiArrowLeft className="text-[0.65rem] text-ash" aria-hidden="true" />}
      <p className="truncate text-xs text-ash">{children}</p>
    </div>
  );
}

function Visual({ spec }) {
  const { kind } = spec;

  if (kind === 'chat') {
    return (
      <>
        <div className={`mb-2 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${spec.highlight === 'header' ? HL : 'border-line bg-paper'}`}>
          <span className="h-4 w-4 shrink-0 rounded-full bg-signal" />
          <span className="flex-1 truncate text-[0.6rem] text-bone">{spec.name || 'Riya'}</span>
          <PiDotsThreeVertical
            className={`shrink-0 rounded text-[0.7rem] ${spec.highlight === 'menu' ? 'bg-signal/10 text-bone ring-1 ring-signal/35' : 'text-ash'}`}
            aria-hidden="true"
          />
        </div>
        <div className="grid gap-1">
          {(spec.bubbles || [['in', 'good morning'], ['out', 'just reached'], ['in', 'ok call me later']]).map(([side, text], i) => (
            <div key={i} className={`flex ${side === 'out' ? 'justify-end' : 'justify-start'}`}>
              <span className={`max-w-[80%] truncate rounded-lg px-1.5 py-1 text-[0.55rem] ${side === 'out' ? 'bg-signal/10 text-bone' : 'bg-paper text-smoke'}`}>
                {text}
              </span>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (kind === 'menu') {
    return (
      <>
        <ScreenTitle>{spec.title || 'Menu'}</ScreenTitle>
        <div className="ml-auto w-[86%] rounded-lg border border-line bg-paper p-1 shadow-lg">
          <div className="grid gap-1">
            {spec.items.map((item, i) => (
              <div key={item} className={`truncate rounded px-1.5 py-1 text-[0.58rem] ${i === spec.highlight ? 'bg-signal/10 text-bone ring-1 ring-signal/35' : 'text-smoke'}`}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (kind === 'list') {
    return (
      <>
        <ScreenTitle back={spec.back !== false}>{spec.title}</ScreenTitle>
        <div className="grid gap-1">
          {spec.items.map((item, i) => <Row key={item} text={item} highlight={i === spec.highlight} />)}
        </div>
      </>
    );
  }

  if (kind === 'checks') {
    return (
      <>
        <ScreenTitle back={spec.back !== false}>{spec.title}</ScreenTitle>
        <div className="grid gap-1">
          {spec.items.map(([label, on], i) => (
            <Row
              key={label}
              text={label}
              highlight={i === spec.highlight}
              trailing={
                <span className={`grid h-3 w-3 shrink-0 place-items-center rounded-sm border ${on ? 'border-transparent bg-signal/10 text-ink' : 'border-line'}`}>
                  {on && <PiCheck className="text-[0.45rem]" aria-hidden="true" />}
                </span>
              }
            />
          ))}
        </div>
        {spec.note && <p className="mt-2 text-[0.52rem] leading-3 text-ash">{spec.note}</p>}
      </>
    );
  }

  if (kind === 'dialog') {
    return (
      <>
        <div className="grid gap-1 opacity-30">
          {[0, 1, 2].map((i) => <div key={i} className="h-3 rounded bg-well" />)}
        </div>
        <div className="mt-2 rounded-xl border border-line bg-paper p-2 shadow-lg">
          <p className="text-[0.6rem] leading-4 text-bone">{spec.title}</p>
          {spec.body && <p className="mt-1 text-[0.52rem] leading-3 text-ash">{spec.body}</p>}
          <div className="mt-2 grid gap-1">
            {spec.actions.map((a, i) => (
              <div key={a} className={`truncate rounded px-1.5 py-1 text-center text-[0.55rem] ${i === spec.highlight ? 'bg-signal/10 text-bone ring-1 ring-signal/35' : 'bg-paper text-smoke'}`}>
                {a}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (kind === 'share') {
    return (
      <>
        <div className="grid gap-1 opacity-30">
          {[0, 1].map((i) => <div key={i} className="h-3 rounded bg-well" />)}
        </div>
        <div className="mt-2 rounded-t-xl border border-line bg-paper p-2">
          <div className="mx-auto mb-2 h-0.5 w-6 rounded-full bg-well" />
          <div className="grid grid-cols-3 gap-1">
            {spec.options.map((o, i) => (
              <div key={o} className={`rounded-lg border px-1 py-1.5 text-center ${i === spec.highlight ? HL : PLAIN}`}>
                <span className="block truncate text-[0.5rem] leading-3">{o}</span>
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (kind === 'status') {
    const Icon = spec.icon === 'wait' ? PiHourglassMedium : spec.icon === 'download' ? PiDownloadSimple : PiCheckCircle;
    return (
      <div className="grid place-items-center py-5 text-center">
        <Icon className="text-2xl text-signal" aria-hidden="true" />
        <p className="mt-2 px-2 text-[0.6rem] leading-4 text-bone">{spec.title}</p>
        {spec.body && <p className="mt-1 px-2 text-[0.52rem] leading-3 text-ash">{spec.body}</p>}
      </div>
    );
  }

  if (kind === 'app') {
    // Our own product — the one screen we can depict accurately.
    return (
      <>
        <p className="mb-2 text-center text-xs text-ash">ThirdPerson AI</p>
        {spec.mode === 'paste' ? (
          <>
            <div className="rounded-lg border border-line bg-well p-1.5">
              <p className="font-mono text-[0.5rem] leading-3 text-smoke">
                9:21 PM You: I just want<br />to understand what<br />changed…
              </p>
            </div>
            <p className="mt-1.5 font-mono text-[0.5rem] text-ash">1,204 characters</p>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-signal/35 bg-signal/10 py-3 text-center">
            <PiExport className="mx-auto text-base text-signal" aria-hidden="true" />
            <p className="mt-1 text-[0.55rem] text-bone">{spec.file || 'chat.txt'}</p>
            <p className="text-[0.5rem] text-ash">ready to analyse</p>
          </div>
        )}
        <div className="mt-2 rounded-lg bg-signal py-1 text-center">
          <span className=" text-xs text-ink">Start analysis</span>
        </div>
      </>
    );
  }

  if (kind === 'desktopChat') {
    return (
      <div className="grid grid-cols-[34%_1fr] gap-1.5">
        <div className="grid gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-4 rounded ${i === 0 ? 'bg-signal/10' : 'bg-paper'}`} />
          ))}
        </div>
        <div>
          <div className={`mb-1 flex items-center justify-between rounded border px-1.5 py-1 ${spec.highlight === 'menu' ? HL : 'border-line bg-paper'}`}>
            <span className="truncate text-[0.55rem] text-bone">{spec.name || 'Riya'}</span>
            <PiDotsThreeVertical className={`text-[0.65rem] ${spec.highlight === 'menu' ? 'text-bone' : 'text-ash'}`} aria-hidden="true" />
          </div>
          <div className="grid gap-1">
            {['good morning', 'just reached', 'call me later'].map((t, i) => (
              <div key={t} className={`flex ${i === 1 ? 'justify-end' : ''}`}>
                <span className={`truncate rounded px-1 py-0.5 text-[0.5rem] ${i === 1 ? 'bg-signal/10 text-bone' : 'bg-paper text-smoke'}`}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export default function ExportStepVisual({ spec, alt }) {
  if (!spec) return null;
  return (
    <figure className="my-4 overflow-hidden rounded-sm border border-line bg-paper p-4">
      <Frame kind={spec.frame || 'phone'} label={spec.frameLabel || 'Telegram Desktop'}>
        <Visual spec={spec} />
      </Frame>
      <figcaption className="mt-3 text-center text-xs leading-5 text-ash">
        {alt} <span className="text-ash/70">· illustration</span>
      </figcaption>
    </figure>
  );
}
