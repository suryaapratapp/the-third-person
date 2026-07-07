import CardActions from './CardActions.jsx';
import { buildZodiacCompatibility, getZodiacElement, getZodiacGlyph } from '../lib/zodiac.js';

function SignBlock({ label, sign, fallback }) {
  return (
    <div className="border border-white/10 bg-black/30 p-4">
      <p className="tech-label text-ash">{label}</p>
      {sign ? (
        <>
          <p className="mt-3 text-3xl text-bone">{getZodiacGlyph(sign)} {sign}</p>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.13em] text-purple-100">{getZodiacElement(sign)}</p>
        </>
      ) : (
        <p className="mt-3 text-sm leading-7 text-smoke">{fallback}</p>
      )}
    </div>
  );
}

export default function ZodiacCompatibilityCard({ analysis, prepared, personName = 'Their' }) {
  const meta = prepared?.metadata || {};
  const built = buildZodiacCompatibility({
    userSign: meta.userProfile?.zodiacSign || analysis?.zodiacCompatibility?.userSign,
    otherSign: meta.otherPersonZodiac?.sign || analysis?.zodiacCompatibility?.otherSign,
    conversationPattern: analysis?.summary?.mainEmotionalPattern,
  });
  const zodiac = analysis?.zodiacCompatibility || built;
  if (!zodiac) return null;

  return (
    <section id="card-zodiac-compatibility" className="thin-panel relative overflow-hidden p-5">
      <CardActions targetId="card-zodiac-compatibility" name="zodiac-compatibility" summary={zodiac.interpretation} />
      <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-orange-300/10 blur-3xl" />
      <p className="tech-label text-orange-200">Zodiac Compatibility Layer ✦</p>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-smoke">
        A light, reflective layer combining zodiac signs with the actual conversation patterns.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SignBlock label="You" sign={zodiac.userSign} fallback="Add your date of birth in Profile to unlock zodiac reflection." />
        <SignBlock label={`${personName}’s Zodiac`} sign={zodiac.otherSign} fallback="Add date of birth during analysis setup to unlock zodiac reflection." />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="border border-orange-300/15 bg-orange-300/[0.04] p-4">
          <p className="tech-label text-orange-100">Compatibility read</p>
          <p className="mt-3 text-sm leading-7 text-smoke">{zodiac.interpretation}</p>
        </div>
        <div className="border border-violet-300/15 bg-violet-300/[0.04] p-4">
          <p className="tech-label text-violet-100">Conversation reality check</p>
          <p className="mt-3 text-sm leading-7 text-smoke">{zodiac.conversationLayer}</p>
        </div>
      </div>
      <p className="mt-5 text-xs leading-6 text-ash">{zodiac.disclaimer}</p>
    </section>
  );
}
