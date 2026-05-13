export default function ParticleBackground({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0 grid-bg opacity-35" />
      <div className="absolute left-[-6%] top-[15%] h-[52%] w-[46%] rotate-[-9deg] dot-field opacity-70 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute right-[-9%] top-[16%] h-[58%] w-[50%] rotate-[7deg] dot-field opacity-75 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
      <div className="absolute left-[38%] top-[18%] h-[46%] w-[24%] dot-field opacity-25 [mask-image:radial-gradient(ellipse_at_center,black,transparent_72%)]" />
      <div className="absolute inset-x-12 bottom-20 h-px bg-white/15" />
      <div className="absolute left-1/2 bottom-[78px] h-3 w-3 -translate-x-1/2 rounded-full border border-white/40 bg-white/50" />
    </div>
  );
}
