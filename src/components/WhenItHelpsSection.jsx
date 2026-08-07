// The five relationship families this product actually analyses.
//
// This list used to include "Workplace Communication", which became a false
// promise the moment the work relationship types were removed from the flow and
// their lenses deleted from the prompt. These five now map exactly to the
// lenses in supabase/functions/_shared/relationshipLens.ts, so the homepage
// cannot advertise something the analysis will not do.

const useCases = [
  ['💬', 'Crushes & early dating', 'Is the interest mutual, or are you the only one carrying it? Read initiation, response patterns, and whether plans actually get made.'],
  ['💛', 'Partners', 'How effort, affection and conflict-repair have shifted over months — including the arguments that keep coming back in different words.'],
  ['🕯️', 'Exes', 'What changed, what repeated, and what the contact has become since — without turning hindsight into blame.'],
  ['🤝', 'Friendships', 'Who reaches out, who follows through, and whether support is flowing both ways over time.'],
  ['🏠', 'Family', 'Care and pressure often arrive in the same sentence. See recurring friction, and whether the limits you set are being heard.'],
];

export default function WhenItHelpsSection() {
  return (
    <section>
      <div>
        <p className="tech-label text-smoke">What it reads</p>
        <h2 className="serif-title mt-4 max-w-2xl text-4xl leading-tight sm:text-6xl">
          Analysis that changes with the relationship.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke sm:text-base sm:leading-8">
          A daily “where are you?” is care from a parent and something else entirely from a partner.
          You pick who this person is, and the whole analysis is written for that relationship.
        </p>

        <div className="mt-8 grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {useCases.map(([icon, title, text]) => (
            <article key={title} className="accent-panel p-5 sm:p-6">
              <p className="text-2xl leading-none">{icon}</p>
              <h3 className="mt-3 text-lg leading-6 text-bone">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-smoke">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
