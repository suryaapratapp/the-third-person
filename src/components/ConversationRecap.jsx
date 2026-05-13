export default function ConversationRecap({ recap = {} }) {
  const rows = [
    ['Person name', recap.personName],
    ['Relationship type', recap.relationshipType],
    ['Platform', recap.platform],
    ['Main dynamic', recap.mainDynamic],
    ['Compatibility score', `${recap.compatibilityScore}/100`],
    ['Emotional trend', recap.emotionalTrend],
    ['Key takeaway', recap.keyTakeaway],
  ];
  return (
    <div className="accent-panel p-5">
      <h2 className="serif-title text-4xl">Conversation Recap</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="border border-white/10 bg-black/35 p-4">
            <p className="tech-label text-ash">{label}</p>
            <p className="mt-3 text-sm leading-6 text-bone">{value || 'Available after analysis.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
