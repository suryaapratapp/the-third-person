export default function PersonalityCard({ title, profile }) {
  return (
    <div className="thin-panel p-5">
      <p className="tech-label text-smoke">{title}</p>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="serif-title text-4xl">{profile.type}</h3>
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-ash">MBTI-like</span>
      </div>
      <p className="mt-2 text-lg text-bone">{profile.name}</p>
      <p className="mt-5 text-sm leading-7 text-smoke">{profile.profile}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="tech-label text-ash">Strengths</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.strengths.map((item) => <span key={item} className="border border-white/12 px-3 py-2 text-xs text-smoke">{item}</span>)}
          </div>
        </div>
        <div>
          <p className="tech-label text-ash">Weaknesses</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.weaknesses.map((item) => <span key={item} className="border border-white/12 px-3 py-2 text-xs text-smoke">{item}</span>)}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <p className="tech-label text-ash">Communication traits</p>
        <ul className="mt-3 space-y-2 text-sm text-smoke">
          {profile.traits.map((item) => <li key={item}>▪ {item}</li>)}
        </ul>
      </div>
    </div>
  );
}
