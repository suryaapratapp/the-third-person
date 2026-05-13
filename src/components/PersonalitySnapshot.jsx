export default function PersonalitySnapshot({ snapshot = {} }) {
  const rows = [
    ['Communication style', snapshot.communicationStyle],
    ['Emotional pattern', snapshot.emotionalPattern],
    ['What hooks people', snapshot.whatHooksPeople],
    ['Emotional triggers', snapshot.emotionalTriggers],
    ['Curiosity loops', snapshot.curiosityLoops],
    ['Engagement psychology', snapshot.engagementPsychology],
    ['Strengths', snapshot.strengths?.join(', ')],
    ['Growth areas', snapshot.growthAreas?.join(', ')],
  ];

  return (
    <div className="accent-panel p-5">
      <h2 className="serif-title text-4xl">Personality Snapshot 🪞</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-smoke">
        A relationship-focused view of how your communication appears in this conversation, written as reflection rather than certainty.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-black/35 p-4">
            <p className="tech-label text-ash">{label}</p>
            <p className="mt-3 text-sm leading-6 text-bone">{value || 'Run an analysis to generate this insight.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
