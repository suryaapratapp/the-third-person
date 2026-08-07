// The matchmaking pitch, stated once and reused wherever it belongs.
//
// This is the sharpest sentence the product has, so it lives in one file and
// every page renders the same words — a promise that drifts between pages
// reads as marketing rather than as an intention.
//
// The honesty footnote is part of the component on purpose. The pitch is
// written in the future tense and the footnote is what keeps it that way: this
// is not a feature anyone can buy today, and the copy must never be pasted
// somewhere it implies otherwise.
export default function MatchmakingPitch({ className = '' }) {
  return (
    <section className={`accent-panel relative overflow-hidden p-6 sm:p-10 ${className}`} aria-label="Where matching is going">
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-400/18 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-pink-400/14 blur-2xl" />

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="eyebrow">Why we are building this</p>

        {/* The number carries the idea, so it gets the size. */}
        <p className="serif-title mt-5 text-5xl leading-none sm:text-8xl">
          1 <span className="text-smoke">in</span> 7.8<span className="text-smoke">bn</span>
        </p>
        <p className="mt-4 text-base leading-7 text-bone sm:text-xl sm:leading-9">
          Your communication style is one in 7.8 billion.
        </p>
        <p className="mt-3 text-sm leading-7 text-smoke sm:text-lg sm:leading-9">
          There’s someone out there you’d stay up all night talking to — two compatible people who
          would vibe perfectly, if only they knew each other existed.
        </p>
        <p className="mt-4 text-base leading-7 text-violet-100 sm:text-xl sm:leading-9">
          We’re going to help you find them.
        </p>

        <p className="mx-auto mt-6 max-w-xl text-xs leading-6 text-ash">
          Matching is not live yet, and it will always be opt-in — your conversations stay private
          whether you join it or not.
        </p>
      </div>
    </section>
  );
}
