'use client';

import { useState } from 'react';

export type Tone = 'professional' | 'casual' | 'humorous' | 'empathetic' | 'analytical' | 'enthusiastic' | 'controversial';

interface TonePickerProps {
  selectedTone: Tone;
  onToneChange: (tone: Tone) => void;
  className?: string;
}

const toneOptions: { value: Tone; label: string; emoji: string; description: string }[] = [
  { value: 'professional', label: 'Professional', emoji: '💼', description: 'Formal and business-like' },
  { value: 'casual', label: 'Casual', emoji: '😊', description: 'Friendly and relaxed' },
  { value: 'humorous', label: 'Humorous', emoji: '😄', description: 'Witty and entertaining' },
  { value: 'empathetic', label: 'Empathetic', emoji: '❤️', description: 'Caring and supportive' },
  { value: 'analytical', label: 'Analytical', emoji: '🧠', description: 'Thoughtful and logical' },
  { value: 'enthusiastic', label: 'Enthusiastic', emoji: '🔥', description: 'Energetic and excited' },
  { value: 'controversial', label: 'Controversial', emoji: '⚡', description: 'Provocative and challenging' },
];

export function TonePicker({ selectedTone, onToneChange, className = '' }: TonePickerProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <label className="text-sm font-medium text-ink-mute">Select Tone</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {toneOptions.map((tone) => (
          <button
            key={tone.value}
            type="button"
            onClick={() => onToneChange(tone.value)}
            className={`tone-option ${selectedTone === tone.value ? 'active' : ''}`}
          >
            <div className="flex flex-col items-center space-y-1">
              <span className="text-lg">{tone.emoji}</span>
              <span className="text-xs font-medium">{tone.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
