import React from 'react';

interface Props {
  recipient: string;
  subject: string;
  onRecipientChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
}

export default function ComposeForm({ recipient, subject, onRecipientChange, onSubjectChange }: Props) {
  return (
    <div className="compose-form">
      <div className="field">
        <label>Recipient (optional, for context)</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => onRecipientChange(e.target.value)}
          placeholder="jane@example.com"
        />
      </div>
      <div className="field">
        <label>Subject (optional)</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubjectChange(e.target.value)}
          placeholder="Meeting follow-up"
        />
      </div>
    </div>
  );
}
