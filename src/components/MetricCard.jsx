import SignalWaveform from './SignalWaveform.jsx';

export default function MetricCard({ label, value }) {
  return (
    <div className="border-b border-white/10 py-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <span className="tech-label text-smoke">{label}</span>
        <span className="font-mono text-sm text-bone">{value}</span>
      </div>
      <SignalWaveform bars={28} compact />
    </div>
  );
}
