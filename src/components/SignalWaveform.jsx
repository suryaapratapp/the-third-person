export default function SignalWaveform({ bars = 96, compact = false }) {
  return (
    <div className={`flex w-full items-end justify-center gap-[3px] ${compact ? 'h-10' : 'h-20'}`}>
      {Array.from({ length: bars }).map((_, index) => {
        const wave = Math.sin(index * 0.45) + Math.sin(index * 0.13);
        const spike = index % 17 === 0 ? 1.8 : index % 29 === 0 ? 2.2 : 1;
        const height = Math.max(10, Math.abs(wave) * 20 * spike + (compact ? 6 : 12));
        return (
          <span
            key={index}
            className="w-px bg-bone/55"
            style={{ height: compact ? height / 2 : height }}
          />
        );
      })}
    </div>
  );
}
