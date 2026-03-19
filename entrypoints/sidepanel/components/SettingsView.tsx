import React, { useState } from 'react';
import { Settings, TonePreset, IntentPreset, DEFAULT_TONE_PRESETS, DEFAULT_INTENT_PRESETS } from '../../../lib/types';
import { saveSettings } from '../../../lib/storage';

const MODELS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
];

interface Props {
  initial: Settings;
  onBack: () => void;
  onSaved: (settings: Settings) => void;
}

export default function SettingsView({ initial, onBack, onSaved }: Props) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSaved(settings);
    }, 800);
  };

  const updateTonePreset = (index: number, field: keyof TonePreset, value: string) => {
    const updated = [...settings.tonePresets];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'label') {
      updated[index].id = value.toLowerCase().replace(/\s+/g, '-');
    }
    setSettings({ ...settings, tonePresets: updated });
  };

  const addTonePreset = () => {
    const id = `tone-${Date.now()}`;
    setSettings({
      ...settings,
      tonePresets: [...settings.tonePresets, { id, label: '', instruction: '' }],
    });
  };

  const removeTonePreset = (index: number) => {
    const updated = settings.tonePresets.filter((_, i) => i !== index);
    setSettings({ ...settings, tonePresets: updated });
  };

  const updateIntentPreset = (index: number, field: keyof IntentPreset, value: string) => {
    const updated = [...settings.intentPresets];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'label') {
      updated[index].id = value.toLowerCase().replace(/\s+/g, '-');
    }
    setSettings({ ...settings, intentPresets: updated });
  };

  const addIntentPreset = () => {
    const id = `intent-${Date.now()}`;
    setSettings({
      ...settings,
      intentPresets: [...settings.intentPresets, { id, label: '', instruction: '' }],
    });
  };

  const removeIntentPreset = (index: number) => {
    const updated = settings.intentPresets.filter((_, i) => i !== index);
    setSettings({ ...settings, intentPresets: updated });
  };

  const resetPresets = () => {
    setSettings({
      ...settings,
      tonePresets: DEFAULT_TONE_PRESETS,
      intentPresets: DEFAULT_INTENT_PRESETS,
    });
  };

  return (
    <div className="settings-view">
      <header className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Settings</h1>
      </header>

      <div className="field">
        <label htmlFor="apiKey">Anthropic API Key</label>
        <input
          id="apiKey"
          type="password"
          value={settings.apiKey}
          onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
          placeholder="sk-ant-..."
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="userName">Your Name</label>
          <input
            id="userName"
            type="text"
            value={settings.userName}
            onChange={(e) => setSettings({ ...settings, userName: e.target.value })}
            placeholder="Jane Doe"
          />
        </div>
        <div className="field">
          <label htmlFor="userEmail">Your Email</label>
          <input
            id="userEmail"
            type="email"
            value={settings.userEmail}
            onChange={(e) => setSettings({ ...settings, userEmail: e.target.value })}
            placeholder="jane@example.com"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="model">Model</label>
        <select
          id="model"
          value={settings.model}
          onChange={(e) => setSettings({ ...settings, model: e.target.value })}
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="guidelines">Writing Guidelines</label>
        <textarea
          id="guidelines"
          value={settings.writingGuidelines}
          onChange={(e) => setSettings({ ...settings, writingGuidelines: e.target.value })}
          placeholder="e.g. Write in a friendly but professional tone. Keep replies under 150 words."
          rows={4}
        />
      </div>

      <div className="preset-section">
        <h3>Tone Presets</h3>
        <div className="preset-list">
          {settings.tonePresets.map((preset, i) => (
            <div key={preset.id} className="preset-item">
              <input
                value={preset.label}
                onChange={(e) => updateTonePreset(i, 'label', e.target.value)}
                placeholder="Label"
              />
              <input
                value={preset.instruction}
                onChange={(e) => updateTonePreset(i, 'instruction', e.target.value)}
                placeholder="Instruction for Claude"
              />
              <button className="remove-btn" onClick={() => removeTonePreset(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="add-preset-btn" onClick={addTonePreset}>+ Add tone</button>
      </div>

      <div className="preset-section">
        <h3>Intent Presets</h3>
        <div className="preset-list">
          {settings.intentPresets.map((preset, i) => (
            <div key={preset.id} className="preset-item">
              <input
                value={preset.label}
                onChange={(e) => updateIntentPreset(i, 'label', e.target.value)}
                placeholder="Label"
              />
              <input
                value={preset.instruction}
                onChange={(e) => updateIntentPreset(i, 'instruction', e.target.value)}
                placeholder="Instruction for Claude"
              />
              <button className="remove-btn" onClick={() => removeIntentPreset(i)}>×</button>
            </div>
          ))}
        </div>
        <button className="add-preset-btn" onClick={addIntentPreset}>+ Add intent</button>
      </div>

      <button className="add-preset-btn" onClick={resetPresets} style={{ alignSelf: 'flex-start' }}>
        Reset presets to defaults
      </button>

      <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave}>
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
