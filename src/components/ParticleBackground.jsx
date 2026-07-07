export default function ParticleBackground({ className = '', showAxis = true }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="aurora-orb aurora-orb-pink left-[-10rem] top-[8rem]" />
      <div className="aurora-orb aurora-orb-purple right-[-12rem] top-[4rem]" />
      <div className="aurora-ring right-[8%] top-[18%] hidden sm:block" />
      <div className="absolute inset-0 grid-bg opacity-25" />
      <div className="absolute left-[-6%] top-[15%] hidden h-[52%] w-[46%] rotate-[-9deg] dot-field opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] md:block" />
      <div className="absolute right-[-9%] top-[16%] hidden h-[58%] w-[50%] rotate-[7deg] dot-field opacity-35 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)] md:block" />
      {showAxis && (
        <>
          <div className="absolute inset-x-12 bottom-20 h-px bg-white/15" />
          <div className="absolute left-1/2 bottom-[78px] h-3 w-3 -translate-x-1/2 rounded-full border border-white/40 bg-white/50" />
        </>
      )}
    </div>
  );
}
