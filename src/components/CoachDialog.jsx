import { useEffect, useMemo, useRef, useState } from 'react';
import { PiPaperPlaneRight, PiX } from 'react-icons/pi';
import CoachBot from './CoachBot.jsx';
import UsageWarningModal from './UsageWarningModal.jsx';
import { askBestieViaSupabase } from '../lib/backendAiService.js';
import { loadCoachThread, saveCoachThread } from '../lib/coachThreadStore.js';
import { fetchCreditBalances } from '../lib/creditsService.js';
import { COACH_PERSONAS, DEFAULT_PERSONA_ID, getPersonaById } from '../lib/personas.js';
import { getUserProfile } from '../lib/profileStore.js';
import { getZodiacSign } from '../lib/zodiac.js';
import { useRouter } from '../state/RouterContext.jsx';

// The AI Relationship Coach, as a dialog on the report.
//
// It used to be its own route. That was wrong for what it is: every question
// anyone asks the coach is about the report they are currently reading, and
// sending them to a separate page meant losing the thing they wanted to ask
// about. Worse, the conversation lived in React state, so navigating back to
// re-read a section threw the whole thread away.
//
// Now it opens over the report and the thread is saved against that report
// (see lib/coachThreadStore.js), so it is still there tomorrow.
//
// Full-screen sheet on a phone, centred panel from `sm` up. On a phone a
// chat that is not full-screen is a chat you cannot type in: the keyboard
// takes half the viewport and a floating panel ends up 120px tall.

// Keep in sync with MAX_QUESTION_CHARS in supabase/functions/ai-bestie-chat.
// The server rejects longer questions; this stops the user hitting that error.
const MAX_QUESTION_CHARS = 600;

const STARTERS = [
  'Is this person into me?',
  'What went wrong here?',
  'Am I overthinking this?',
  'What should I reply?',
  'Is this one-sided?',
];

function userProfileWithZodiac() {
  const profile = getUserProfile();
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    genderIdentity: profile.genderIdentity,
    preferredLanguageTone: profile.preferredLanguageTone,
    preferredAnalysisLanguages: profile.preferredAnalysisLanguages || [],
    zodiacSign: getZodiacSign(profile.dateOfBirth),
  };
}

export default function CoachDialog({ open, onClose, chainId, context }) {
  const { navigate } = useRouter();
  const userProfile = useMemo(() => userProfileWithZodiac(), []);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [creditBlock, setCreditBlock] = useState(null);
  const [personaId, setPersonaId] = useState(DEFAULT_PERSONA_ID);
  const [balances, setBalances] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);

  // Load the saved thread when the dialog opens, not on mount: the report page
  // renders this closed, and reading localStorage for every report view is
  // work nobody asked for.
  useEffect(() => {
    if (!open) return;
    setMessages(loadCoachThread(chainId));
  }, [open, chainId]);

  useEffect(() => {
    if (!open || !messages.length) return;
    saveCoachThread(chainId, messages);
  }, [open, chainId, messages]);

  useEffect(() => {
    if (!open) return undefined;
    fetchCreditBalances().then(setBalances).catch(() => {});
    // Escape closes. A dialog you can only leave by finding the X is a trap on
    // a phone, where the X is a 28px target in a corner.
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    // Body scroll lock, so flicking the chat does not scroll the report behind
    // it and leave the reader somewhere else when they close the dialog.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [open, messages, isThinking]);

  if (!open) return null;

  const remaining = balances?.paidBestieChatsLeft ?? balances?.bestieChatsLeft ?? null;

  async function send(text = input) {
    const trimmed = text.trim().slice(0, MAX_QUESTION_CHARS);
    if (!trimmed || !context || isThinking) return;
    const sendingPersonaId = personaId;
    setInput('');
    setMessages((current) => [...current, { role: 'user', text: trimmed, at: Date.now() }]);
    setIsThinking(true);
    setStatusText(`${getPersonaById(sendingPersonaId).name} is thinking…`);

    const response = await askBestieViaSupabase({
      chainId,
      userMessage: trimmed,
      analysisChainContext: context,
      userProfile,
      personaId: sendingPersonaId,
      detectedLanguageStyle: context.languageStyle,
      languageProfile: context.languageProfile,
      relationshipType: context.relationshipType,
      otherPersonName: context.personName,
    }).catch((error) => {
      if (error.code === 'OUT_OF_CREDITS') setCreditBlock('bestie');
      return { error: error.message };
    });

    setStatusText('');
    setIsThinking(false);

    const text_ = response?.error
      || response?.text
      || 'Your AI Relationship Coach is temporarily unavailable. Please try again in a moment.';
    setMessages((current) => [...current, { role: 'bot', personaId: sendingPersonaId, text: text_, at: Date.now() }]);

    if (!response?.error && response?.text) {
      setBalances((current) => (current ? {
        ...current,
        bestieChatsLeft: Math.max(current.bestieChatsLeft - 1, 0),
        paidBestieChatsLeft: Math.max(current.paidBestieChatsLeft - 1, 0),
      } : current));
    }
  }

  return (
    <div
      className="theme-deep fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="AI Relationship Coach"
    >
      {/* Scrim. Tap-to-close is the gesture people try first. */}
      <button
        type="button"
        aria-label="Close coach"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        ref={panelRef}
        className="relative flex h-full w-full flex-col bg-canvas shadow-raised sm:h-[min(90vh,720px)] sm:max-w-lg sm:rounded-lg sm:border sm:border-line"
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <CoachBot size={38} mood={isThinking ? 'thinking' : 'happy'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink">Relationship Coach</p>
            <p className="truncate text-xs text-ash">
              {context ? `About ${context.personName}` : 'Run an analysis first'}
              {remaining !== null && ` · ${remaining} chats left`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close coach"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-ash transition hover:bg-well hover:text-ink"
          >
            <PiX className="text-lg" aria-hidden="true" />
          </button>
        </header>

        {/* Persona picker. Horizontally scrollable rather than wrapped: on a
            phone a wrapped row of five chips is two lines of chrome above a
            conversation. */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-line px-4 py-2">
          {COACH_PERSONAS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPersonaId(item.id)}
              aria-pressed={item.id === personaId}
              className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                item.id === personaId
                  ? 'border-signal bg-accentWash text-signalStrong'
                  : 'border-line text-ash hover:text-ink'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {!messages.length && (
            <div className="rounded-lg border border-line bg-paper p-4">
              <p className="text-sm leading-6 text-smoke">
                {context
                  ? `I have the full picture for ${context.personName}. Ask what you actually want to know — I answer from this report, not from generic advice.`
                  : 'Run an analysis first so your coach can read the relationship properly.'}
              </p>
              {context && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => send(starter)}
                      className="rounded-md border border-line px-2.5 py-1.5 text-xs text-smoke transition hover:border-signal hover:text-ink"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-3">
            {messages.map((message, index) => (
              <div
                key={`${message.at || index}-${index}`}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-signal text-[color:var(--on-solid)]'
                      : 'border border-line bg-paper text-smoke'
                  }`}
                >
                  {message.role === 'bot' && (
                    <p className="mb-1 text-xs font-semibold text-signalStrong">
                      {getPersonaById(message.personaId).name}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{message.text}</p>
                </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex items-center gap-2 text-xs text-ash">
                <CoachBot size={26} mood="thinking" float={false} />
                {statusText}
              </div>
            )}
          </div>
          <div ref={bottomRef} />
        </div>

        <footer className="border-t border-line px-3 py-3">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
            className="flex items-end gap-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value.slice(0, MAX_QUESTION_CHARS))}
              onKeyDown={(event) => {
                // Enter sends, Shift+Enter breaks the line — the convention
                // every messaging app this product reads already uses.
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={context ? 'Ask about this report…' : 'Run an analysis first'}
              disabled={!context || isThinking}
              className="field max-h-32 min-h-[44px] flex-1 resize-y py-2.5 text-sm disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!input.trim() || !context || isThinking}
              aria-label="Send"
              className="btn btn-primary !min-h-[44px] !w-[44px] shrink-0 !px-0"
            >
              <PiPaperPlaneRight className="text-base" aria-hidden="true" />
            </button>
          </form>
          <p className="mt-2 text-xs leading-5 text-ash">
            Saved to this report on your device. Reflection, not therapy.
          </p>
        </footer>
      </div>

      {creditBlock && (
        <UsageWarningModal
          feature="bestie"
          status="exhausted"
          onPlans={() => navigate('/pricing?reason=usage-limit')}
          onBack={onClose}
          onContinue={() => setCreditBlock(null)}
        />
      )}
    </div>
  );
}
