import React from 'react';
import { TonePreset, IntentPreset } from '../../../lib/types';

interface Props {
  tonePresets: TonePreset[];
  intentPresets: IntentPreset[];
  selectedTone: string | null;
  selectedIntent: string | null;
  onToneChange: (id: string | null) => void;
  onIntentChange: (id: string | null) => void;
  label?: string;
}

export default function ToneControls({
  tonePresets,
  intentPresets,
  selectedTone,
  selectedIntent,
  onToneChange,
  onIntentChange,
  label,
}: Props) {
  return (
    <div className="tone-controls">
      {label && <div className="control-section-label">{label}</div>}
      <div>
        <div className="control-label">Tone</div>
        <div className="control-row">
          {tonePresets.map((t) => (
            <button
              key={t.id}
              className={`tone-chip ${selectedTone === t.id ? 'selected' : ''}`}
              onClick={() => onToneChange(selectedTone === t.id ? null : t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="control-label">Intent</div>
        <div className="control-row">
          {intentPresets.map((t) => (
            <button
              key={t.id}
              className={`tone-chip ${selectedIntent === t.id ? 'selected' : ''}`}
              onClick={() => onIntentChange(selectedIntent === t.id ? null : t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
