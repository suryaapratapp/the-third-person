const relationships = [
  'Partner', 'Ex', 'Crush', 'Early stage dating / seeing each other', 'Friend', 'Best friend',
  'Mom', 'Dad', 'Brother', 'Sister', 'Cousin', 'Colleague', 'Manager', 'Client', 'Family member', 'Other',
];

export default function RelationshipSelector({ value, onChange }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {relationships.map((relationship) => (
        <button
          key={relationship}
          onClick={() => onChange(relationship)}
          className={`glass-button min-h-16 p-4 text-left text-sm text-bone ${value === relationship ? 'border-white/70 bg-white/10' : ''}`}
        >
          {relationship}
        </button>
      ))}
    </div>
  );
}
