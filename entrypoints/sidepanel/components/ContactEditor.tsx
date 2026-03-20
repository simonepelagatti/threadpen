import React, { useState } from 'react';
import { ContactProfile, RelationshipType } from '../../../lib/types';
import { saveContact } from '../../../lib/storage';

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: 'colleague', label: 'Colleague' },
  { value: 'client', label: 'Client' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'manager', label: 'Manager' },
  { value: 'report', label: 'Report' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

interface Props {
  initial?: ContactProfile;
  onSave: () => void;
  onBack: () => void;
}

export default function ContactEditor({ initial, onSave, onBack }: Props) {
  const isNew = !initial;
  const [email, setEmail] = useState(initial?.email ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [company, setCompany] = useState(initial?.company ?? '');
  const [relationship, setRelationship] = useState<RelationshipType>(initial?.relationship ?? 'other');
  const [preferredTone, setPreferredTone] = useState(initial?.preferredTone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saved, setSaved] = useState(false);

  const fieldMeta = initial?.fieldMeta ?? {};

  const autoTag = (field: keyof typeof fieldMeta) =>
    fieldMeta[field]?.source === 'auto' ? ' (auto)' : '';

  const handleSave = async () => {
    if (!email.trim()) return;
    const now = Date.now();
    const contact: ContactProfile = {
      id: initial?.id ?? `contact-${now}-${Math.random().toString(36).slice(2, 8)}`,
      email: email.trim().toLowerCase(),
      name,
      role,
      company,
      relationship,
      preferredTone,
      notes,
      fieldMeta: {
        name: { source: initial && fieldMeta.name?.source === 'auto' && name === initial.name ? 'auto' : 'manual', updatedAt: now },
        role: { source: initial && fieldMeta.role?.source === 'auto' && role === initial.role ? 'auto' : 'manual', updatedAt: now },
        company: { source: initial && fieldMeta.company?.source === 'auto' && company === initial.company ? 'auto' : 'manual', updatedAt: now },
        relationship: { source: initial && fieldMeta.relationship?.source === 'auto' && relationship === initial.relationship ? 'auto' : 'manual', updatedAt: now },
        preferredTone: { source: initial && fieldMeta.preferredTone?.source === 'auto' && preferredTone === initial.preferredTone ? 'auto' : 'manual', updatedAt: now },
        notes: { source: 'manual', updatedAt: now },
      },
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    };
    await saveContact(contact);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSave();
    }, 600);
  };

  return (
    <div className="contact-editor">
      <header className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>{isNew ? 'Add Contact' : 'Edit Contact'}</h1>
      </header>

      <div className="field">
        <label htmlFor="ce-email">Email *</label>
        <input
          id="ce-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@example.com"
          disabled={!isNew}
        />
      </div>

      <div className="field">
        <label htmlFor="ce-name">Name{autoTag('name')}</label>
        <input
          id="ce-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Smith"
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="ce-role">Role{autoTag('role')}</label>
          <input
            id="ce-role"
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Senior PM"
          />
        </div>
        <div className="field">
          <label htmlFor="ce-company">Company{autoTag('company')}</label>
          <input
            id="ce-company"
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="ce-relationship">Relationship{autoTag('relationship')}</label>
        <select
          id="ce-relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as RelationshipType)}
        >
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="ce-tone">Preferred Tone{autoTag('preferredTone')}</label>
        <input
          id="ce-tone"
          type="text"
          value={preferredTone}
          onChange={(e) => setPreferredTone(e.target.value)}
          placeholder="Formal and respectful"
        />
      </div>

      <div className="field">
        <label htmlFor="ce-notes">Notes</label>
        <textarea
          id="ce-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Prefers concise emails, avoids jargon..."
          rows={3}
        />
      </div>

      <button className={`save-btn ${saved ? 'saved' : ''}`} onClick={handleSave} disabled={!email.trim()}>
        {saved ? 'Saved!' : isNew ? 'Add Contact' : 'Save Changes'}
      </button>
    </div>
  );
}
