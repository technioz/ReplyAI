'use client';

export type Stance = 'agree' | 'pov';

interface StanceToggleProps {
  selectedStance: Stance;
  onStanceChange: (stance: Stance) => void;
  className?: string;
}

const stanceOptions: { value: Stance; label: string; description: string }[] = [
  { value: 'agree', label: 'Agree', description: 'Support the post' },
  { value: 'pov', label: 'POV', description: 'Share your perspective' },
];

export function StanceToggle({ selectedStance, onStanceChange, className = '' }: StanceToggleProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-ink-mute">Stance</label>
      <div className="stance-toggle">
        {stanceOptions.map((stance) => (
          <button
            key={stance.value}
            type="button"
            onClick={() => onStanceChange(stance.value)}
            className={`stance-option ${selectedStance === stance.value ? 'active' : ''}`}
          >
            {stance.label}
          </button>
        ))}
      </div>
    </div>
  );
}
