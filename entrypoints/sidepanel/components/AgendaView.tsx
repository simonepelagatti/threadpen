import React, { useEffect, useState } from 'react';
import { ContactProfile } from '../../../lib/types';
import { getContactAgenda, deleteContact } from '../../../lib/storage';

interface Props {
  onBack: () => void;
  onEdit: (contact: ContactProfile) => void;
  onAdd: () => void;
}

export default function AgendaView({ onBack, onEdit, onAdd }: Props) {
  const [contacts, setContacts] = useState<ContactProfile[]>([]);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getContactAgenda().then(setContacts);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    setContacts((c) => c.filter((x) => x.id !== id));
  };

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
  });

  const relationshipLabel = (r: string) =>
    r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <div className="agenda-view">
      <header className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Contact Agenda</h1>
      </header>

      <div className="agenda-toolbar">
        <input
          type="text"
          className="agenda-search"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="add-contact-btn" onClick={onAdd}>+ Add</button>
      </div>

      {filtered.length === 0 ? (
        <div className="history-empty">
          {contacts.length === 0
            ? 'No contacts yet. Contacts are added automatically when you generate drafts, or you can add them manually.'
            : 'No contacts match your search.'}
        </div>
      ) : (
        <div className="agenda-list">
          {filtered.map((contact) => (
            <div
              key={contact.id}
              className={`contact-card ${expandedId === contact.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === contact.id ? null : contact.id)}
            >
              <div className="contact-card-header">
                <div className="contact-card-info">
                  <span className="contact-card-name">{contact.name || contact.email}</span>
                  {contact.name && <span className="contact-card-email">{contact.email}</span>}
                  {(contact.role || contact.company) && (
                    <span className="contact-card-role">{contact.role}{contact.role && contact.company ? ` at ${contact.company}` : contact.company}</span>
                  )}
                </div>
                <div className="contact-card-badges">
                  {contact.relationship && contact.relationship !== 'other' && (
                    <span className="contact-badge relationship">{relationshipLabel(contact.relationship)}</span>
                  )}
                </div>
              </div>

              {expandedId === contact.id && (
                <div className="contact-card-details">
                  {contact.preferredTone && <div className="contact-detail"><strong>Tone:</strong> {contact.preferredTone}</div>}
                  {contact.notes && <div className="contact-detail"><strong>Notes:</strong> {contact.notes}</div>}
                  <div className="contact-card-actions">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(contact); }}>Edit</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(contact.id); }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
