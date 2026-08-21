import { useEffect, useMemo, useRef, useState } from 'react';
import { PiCheck, PiPencilSimple } from 'react-icons/pi';
import { filterSensitiveData } from '../lib/sensitiveDataFilter.js';
import { parseConversationText } from '../lib/conversationPreprocessor.js';
import { getUserProfile } from '../lib/profileStore.js';

// "Which one of these is you?"
//
// Asked AFTER the chat is uploaded, which is the only point at which it can be
// answered well. Before the upload we had to ask people to type a name from
// memory and hope it matched the export's display name — and when it did not,
// every downstream "who is who" decision (per-person colours, effort split,
// the coach's framing) silently attached to the wrong person.
//
// Now the two names come from the file itself. We guess which is the account
// holder from their saved profile, show both, and let them correct it in one
// tap. The name stays editable because export display names are frequently
// awful ("Manhar Solan UOL", "Amma ❤️ new number").

function guessMainUser(participants, profile) {
  const first = String(profile.firstName || '').trim().toLowerCase();
  const last = String(profile.lastName || '').trim().toLowerCase();
  if (!first && !last) return null;
  return participants.find((name) => {
    const value = String(name).toLowerCase();
    return (first && value.includes(first)) || (last && value.includes(last));
  }) || null;
}

export default function WhoIsWhoStep({ flow, updateFlow }) {
  const profile = useMemo(() => getUserProfile(), []);

  // Re-parse rather than threading participants through the flow: the upload
  // step already does this work for its own preview, it is memoised, and a
  // duplicated field would be one more thing that can go stale.
  const participants = useMemo(() => {
    if (!flow.chatText?.trim()) return [];
    const safe = filterSensitiveData(flow.chatText);
    const parsed = parseConversationText(safe.protectedText, flow.platform || 'Chat');
    return (parsed.participants || []).filter(Boolean).slice(0, 8);
  }, [flow.chatText, flow.platform]);

  const [editing, setEditing] = useState(false);

  const mine = flow.mainUserSender || '';
  const theirs = flow.otherPersonSender || '';

  // Re-detect whenever the PAIR changes, not just the first time.
  //
  // Two bugs lived here. The old guard was `if (mine && theirs) return`, so a
  // second analysis in the same session kept the previous chat's people — and
  // the name line read `flow.personName || them`, which preserved a stale name
  // from an earlier report. Together they meant uploading a chat with Bittuuu
  // in it still suggested "Kaushal" from the run before.
  //
  // Keyed on the participant signature so a fresh pair always re-suggests,
  // while a manual edit inside the SAME chat is never clobbered.
  const signature = participants.slice(0, 2).join('\u0000');
  const filledFor = useRef('');

  useEffect(() => {
    if (participants.length < 2 || filledFor.current === signature) return;
    filledFor.current = signature;
    const guessed = guessMainUser(participants, profile);
    const me = guessed || participants[0];
    const them = participants.find((name) => name !== me) || participants[1];
    // Always the detected name. It is a SUGGESTION from this chat, and the
    // field below stays editable — carrying over a name from a different
    // relationship is never the more helpful default.
    updateFlow({ mainUserSender: me, otherPersonSender: them, personName: them });
  }, [participants, signature, profile, updateFlow]);

  if (!participants.length) {
    return (
      <div className="rounded-lg border border-line bg-paper p-5">
        <p className="text-sm leading-6 text-smoke">
          Add the conversation in the previous step and we will read both names
          straight out of it.
        </p>
      </div>
    );
  }

  const choose = (me) => {
    const them = participants.find((name) => name !== me) || '';
    updateFlow({ mainUserSender: me, otherPersonSender: them, personName: them });
    setEditing(false);
  };

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg font-semibold text-ink">We found two people in this chat</h3>
        <p className="mt-1 text-sm leading-6 text-smoke">
          Tap whichever one is you. Everything in the report is written from that
          side.
        </p>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {participants.slice(0, 2).map((name, index) => {
          const isMe = name === mine;
          // Colour matches the report: you are always rose, they are always
          // blue, decided here and never re-explained.
          const color = isMe ? 'var(--you)' : 'var(--them)';
          return (
            <button
              key={name}
              type="button"
              onClick={() => choose(name)}
              aria-pressed={isMe}
              className={`relative overflow-hidden rounded-xl border p-4 text-left transition duration-150 ${
                isMe
                  ? 'border-signal shadow-raised'
                  : 'border-line hover:border-lineStrong'
              }`}
              style={isMe ? { background: 'var(--accent-wash)' } : undefined}
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-full text-base font-semibold"
                style={{ background: color, color: 'var(--on-solid)' }}
                aria-hidden="true"
              >
                {String(name).trim().charAt(0).toUpperCase()}
              </span>
              <span className="mt-3 block truncate text-base font-semibold text-ink">{name}</span>
              <span className="mt-0.5 block text-xs text-ash">
                {isMe ? 'This is me' : index === 0 ? 'Tap if this is you' : 'Tap if this is you'}
              </span>
              {isMe && (
                <PiCheck className="absolute right-3 top-3 text-lg text-signal" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {participants.length > 2 && (
        <p className="text-xs leading-5 text-warn">
          This export has {participants.length} names in it, so it may be a group
          chat. Reports are built for one-to-one conversations — the two above
          are the most active.
        </p>
      )}

      <div className="rounded-lg border border-line bg-paper p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ash">Their name in your report</p>
            {editing ? (
              <input
                autoFocus
                value={flow.personName}
                onChange={(event) => updateFlow({ personName: event.target.value })}
                onKeyDown={(event) => { if (event.key === 'Enter') setEditing(false); }}
                placeholder={theirs || 'Their name'}
                className="field mt-1.5 w-full text-base"
                aria-label="Their name in your report"
              />
            ) : (
              <p className="mt-1 truncate text-lg font-semibold text-ink">
                {flow.personName?.trim() || theirs || '—'}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="btn btn-secondary shrink-0 !min-h-[38px] !px-3 !py-1.5 !text-xs"
          >
            {editing ? 'Done' : <><PiPencilSimple aria-hidden="true" /> Edit</>}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-ash">
          Export names are often not what you call someone. Change it to whatever
          you would actually say.
        </p>
      </div>
    </div>
  );
}
