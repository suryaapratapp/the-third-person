export default function TimelineChart({ items, selectedIndex, onSelect }) {
  return (
    <div className="thin-panel overflow-hidden p-5">
      <div className="mb-6 flex items-center justify-between gap-4">
        <p className="tech-label text-smoke">Emotional Timeline</p>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-ash">Click a signal point</p>
      </div>
      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[920px] items-start gap-4">
          {items.map((item, index) => (
            <button
              key={`${item.period}-${index}`}
              onClick={() => onSelect(index)}
              className="group flex w-28 shrink-0 flex-col items-center text-center"
            >
              <span className="mb-4 font-mono text-[0.64rem] uppercase tracking-[0.12em] text-ash">{item.period}</span>
              <span className={`h-5 w-5 rounded-full border ${selectedIndex === index ? 'border-purple-200 bg-purple-200 shadow-[0_0_20px_rgba(216,180,254,0.5)]' : 'border-white/35 bg-black'} transition group-hover:border-purple-200`} />
              <span className="mt-4 min-h-12 text-xs leading-5 text-smoke">{item.title}</span>
              <span className="mt-3 font-mono text-xs text-bone">{item.compatibility}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 border-t border-white/10 pt-5">
        <p className="serif-title text-3xl">{items[selectedIndex]?.title}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <p className="tech-label text-ash">What happened</p>
            <p className="mt-2 text-sm leading-7 text-smoke">{items[selectedIndex]?.happened}</p>
          </div>
          <div>
            <p className="tech-label text-ash">Why it matters</p>
            <p className="mt-2 text-sm leading-7 text-smoke">{items[selectedIndex]?.why}</p>
          </div>
          <div>
            <p className="tech-label text-ash">Representative quote</p>
            <p className="mt-2 font-mono text-sm leading-7 text-bone">“{items[selectedIndex]?.quote}”</p>
          </div>
        </div>
      </div>
    </div>
  );
}
