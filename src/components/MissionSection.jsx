// The north star, stated plainly on the landing page.
//
// This is the strongest thing the product has to say: most personality tests
// ask you to describe yourself, and people answer with who they believe they
// are. ThirdPerson AI reads how you actually communicate — and because people
// are different with a partner than with a parent or a friend, the interesting
// answer is the shape that stays constant across all of them.
//
// Matchmaking is explicitly labelled as coming, never as available, so nobody
// pays today expecting a feature that does not exist yet.

const STEPS = [
  {
    step: '01',
    title: 'You analyse a real conversation',
    body: 'Not a quiz. An actual chat with a partner, an ex, a friend, or your family — the way you really talk when nobody is assessing you.',
  },
  {
    step: '02',
    title: 'We learn how you show up there',
    body: 'How you open, repair, argue, reassure, go quiet. Every analysis adds to your profile instead of replacing it.',
  },
  {
    step: '03',
    title: 'Your core self appears across relationships',
    body: 'You are not the same person with your mother as with your best friend. What repeats in every one of those rooms is the part that is actually you.',
  },
  {
    step: '04',
    title: 'Then we match people on that',
    body: 'A friendship and dating layer where compatibility comes from how two people actually communicate — not from a bio they wrote about themselves.',
    upcoming: true,
  },
];

export default function MissionSection() {
  return (
    <section className="accent-panel relative overflow-hidden p-5 sm:p-9">

      <div className="relative">
        <p className="tech-label text-signal">Where this is going</p>
        <h2 className="serif-title mt-4 max-w-3xl text-4xl leading-tight sm:text-6xl">
          Most people don’t know who they really are.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-smoke sm:text-base sm:leading-8">
          Not because they are lying — everyone becomes a slightly different person depending on who
          they are with. Softer with one, sharper with another, quieter at home. A personality quiz
          only ever hears the version you can describe.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-bone sm:text-base sm:leading-8">
          We read the versions you actually live — and find the person underneath all of them.
        </p>

        {/* Numbered rows on a phone, four cards from md up. Four tall cards
            stacked was most of a screen each for one sentence of payload. */}
        <ol className="mt-6 grid gap-2.5 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className={`relative rounded-sm border p-4 sm:rounded-sm sm:p-5 ${
                item.upcoming
                  ? 'border-you/35 bg-you/10'
                  : 'border-line bg-paper'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className=" text-xs text-ash">{item.step}</span>
                <h3 className="flex-1 text-base leading-5 text-bone sm:text-lg sm:leading-6">{item.title}</h3>
                {item.upcoming && (
                  <span className="shrink-0 rounded-sm border border-you/35 bg-you/10 px-2 py-0.5 text-xs text-you">
                    Coming
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-smoke">{item.body}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 rounded-sm border border-signal/35 bg-signal/10 p-4 sm:p-6">
          <p className="text-sm leading-7 text-bone sm:text-base sm:leading-8">
            The goal: a friendship and dating platform where you are matched on{' '}
            <span className="text-signal">who you really are — not who you say you are.</span>
          </p>
          <p className="mt-2.5 text-sm leading-6 text-smoke sm:leading-7">
            Every report you run makes that profile sharper.
          </p>
        </div>
      </div>
    </section>
  );
}
