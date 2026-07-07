import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export default function DayNightDynamics({ dynamics }) {
  if (!dynamics) return null;
  const periodRanges = {
    Day: '06:00–17:59',
    Evening: '18:00–21:59',
    Night: '22:00–05:59',
  };
  const volume = (dynamics.volumeByPeriod || []).map((item) => ({
    ...item,
    periodLabel: `${item.period}\n${periodRanges[item.period] || ''}`,
  }));
  const activeRange = periodRanges[dynamics.mostActivePeriod] || 'time range unavailable';
  const cards = [
    ['Most active period', dynamics.mostActivePeriod, 'bg-purple-300/10 text-purple-100'],
    ['Warmest period', dynamics.warmestPeriod, 'bg-orange-300/10 text-orange-100'],
    ['Highest tension period', dynamics.highestTensionPeriod, 'bg-pink-300/10 text-pink-100'],
    ['Deepest conversation period', dynamics.deepestConversationPeriod, 'bg-violet-300/10 text-violet-100'],
  ];

  return (
    <section className="accent-panel p-5">
      <p className="tech-label text-smoke">Day vs Night Dynamics 🌙</p>
      <h2 className="serif-title mt-3 text-4xl">When the chat feels warmer, heavier, or more active.</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-smoke">
        A softer look at when the conversation feels warmer, heavier, more active, or more emotionally intense.
      </p>
      <div className="mt-5 border border-orange-300/20 bg-orange-300/[0.06] p-4">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-orange-100">Most active time window</p>
        <p className="mt-2 text-2xl text-bone">{dynamics.mostActivePeriod || 'Not enough data'} <span className="text-base text-smoke">({activeRange})</span></p>
      </div>
      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="h-72 border border-white/10 bg-black/35 p-4">
          <ResponsiveContainer>
            <BarChart data={volume}>
              <XAxis dataKey="periodLabel" tick={{ fill: '#b9b7b1', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fill: '#7b7a75', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#050505', border: '1px solid rgba(255,255,255,.18)', color: '#f3f1ed' }} />
              <Bar dataKey="count" fill="#a78bfa" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {cards.map(([label, value, cls]) => (
            <div key={label} className={`border border-white/10 p-4 ${cls}`}>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.13em] opacity-70">{label}</p>
              <p className="mt-3 text-2xl">{value || 'Not enough data'}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-smoke">{dynamics.interpretation}</p>
    </section>
  );
}
