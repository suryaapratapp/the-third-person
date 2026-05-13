export default function PrivacyNotice({ compact = false }) {
  return (
    <div className="border border-white/14 bg-white/[0.025] p-4">
      <p className="tech-label text-bone">Privacy reminder</p>
      <p className={`mt-3 text-sm leading-7 text-smoke ${compact ? 'max-w-3xl' : ''}`}>
        Your chat is treated as sensitive conversation data. ThirdPerson AI prepares the conversation carefully and protects private details before analysis.
      </p>
    </div>
  );
}
