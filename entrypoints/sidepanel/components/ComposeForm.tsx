import React, { useEffect, useState, useRef } from 'react';
import { ContactProfile } from '../../../lib/types';
import { getContactByEmail, getContactAgenda } from '../../../lib/storage';

interface Props {
  recipient: string;
  subject: string;
  onRecipientChange: (v: string) => void;
  onSubjectChange: (v: string) => void;
}

export default function ComposeForm({ recipient, subject, onRecipientChange, onSubjectChange }: Props) {
  const [matchedContact, setMatchedContact] = useState<ContactProfile | null>(null);
  const [suggestions, setSuggestions] = useState<ContactProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allContacts, setAllContacts] = useState<ContactProfile[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Load contacts once on mount
  useEffect(() => {
    getContactAgenda().then(setAllContacts);
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Typeahead filtering + exact match badge
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = recipient.trim().toLowerCase();

    if (!q) {
      setMatchedContact(null);
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(() => {
      // Exact match for badge
      getContactByEmail(q).then(setMatchedContact);

      // Fuzzy filter for suggestions
      const filtered = allContacts.filter((c) =>
        c.email.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      ).slice(0, 5);
      setSuggestions(filtered);
    }, 150);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [recipient, allContacts]);

  const handleSelect = (contact: ContactProfile) => {
    onRecipientChange(contact.email);
    setShowSuggestions(false);
  };

  const relationshipLabel = (r: string) =>
    r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <div className="compose-form">
      <div className="field" ref={wrapperRef}>
        <label>Recipient (optional, for context)</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => { onRecipientChange(e.target.value); setShowSuggestions(true); }}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder="jane@example.com"
          autoComplete="off"
        />
        {showSuggestions && suggestions.length > 0 && !matchedContact && (
          <div className="recipient-suggestions">
            {suggestions.map((c) => (
              <div
                key={c.id}
                className="recipient-suggestion"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(c); }}
              >
                <span className="suggestion-name">{c.name || c.email}</span>
                {c.name && <span className="suggestion-email">{c.email}</span>}
                {c.relationship && c.relationship !== 'other' && (
                  <span className="contact-badge relationship">{relationshipLabel(c.relationship)}</span>
                )}
              </div>
            ))}
          </div>
        )}
        {matchedContact && (
          <div className="contact-badge-inline">
            Known: {matchedContact.name || matchedContact.email}
            {matchedContact.relationship && matchedContact.relationship !== 'other' && (
              <span className="contact-badge relationship">{relationshipLabel(matchedContact.relationship)}</span>
            )}
          </div>
        )}
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
