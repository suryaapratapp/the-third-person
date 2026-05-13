export default function WordCloudChips({ title, words }) {
  return (
    <div className="thin-panel p-5">
      <p className="tech-label mb-5 text-smoke">{title}</p>
      <div className="flex flex-wrap items-center gap-3">
        {words.map((item) => (
          <span
            key={item.word}
            className="border border-white/12 bg-white/[0.025] px-3 py-2 font-mono uppercase tracking-[0.12em] text-bone"
            style={{ fontSize: `${Math.min(1.1, 0.68 + item.count / 18)}rem` }}
          >
            {item.word}
          </span>
        ))}
      </div>
    </div>
  );
}
