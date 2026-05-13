import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const marker = {
  Curious: '◌',
  Guarded: '◒',
  Tender: '♡',
  Tense: '⚠',
  Reflective: '◇',
  Hopeful: '✦',
  Unclear: '?',
};

export default function SentimentStoryboard({ data }) {
  return (
    <div className="thin-panel p-5">
      <p className="tech-label mb-6 text-smoke">Sentiment Storyboard</p>
      <div className="h-64 w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: -18 }}>
            <XAxis dataKey="period" tick={{ fill: '#7b7a75', fontSize: 10 }} axisLine={{ stroke: 'rgba(255,255,255,.12)' }} tickLine={false} />
            <YAxis tick={{ fill: '#7b7a75', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#050505', border: '1px solid rgba(255,255,255,.18)', color: '#f3f1ed' }}
              labelStyle={{ color: '#b9b7b1' }}
            />
            <Line type="monotone" dataKey="intensity" stroke="#c4b5fd" strokeWidth={1.6} dot={{ r: 4, fill: '#050505', stroke: '#f0abfc' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((item) => (
          <div key={`${item.period}-${item.emotion}`} className="border border-white/10 p-4">
            <p className="text-2xl">{marker[item.emotion] || '•'}</p>
            <p className="mt-2 font-mono text-xs uppercase tracking-[0.14em] text-bone">{item.emotion}</p>
            <p className="mt-2 text-xs leading-5 text-ash">{item.period} • {item.intensity}/100</p>
            <p className="mt-3 text-sm leading-6 text-smoke">{item.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
