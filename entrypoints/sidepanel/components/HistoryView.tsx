import React, { useEffect, useState } from 'react';
import { DraftHistoryEntry } from '../../../lib/types';
import { getDraftHistory, deleteDraftFromHistory } from '../../../lib/storage';

interface Props {
  onBack: () => void;
  onReuse: (notes: string) => void;
}

export default function HistoryView({ onBack, onReuse }: Props) {
  const [history, setHistory] = useState<DraftHistoryEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getDraftHistory().then(setHistory);
  }, []);

  const handleDelete = async (id: string) => {
    await deleteDraftFromHistory(id);
    setHistory((h) => h.filter((e) => e.id !== id));
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="history-view">
      <header className="header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Draft History</h1>
      </header>

      {history.length === 0 ? (
        <div className="history-empty">No drafts yet. Generated drafts will appear here.</div>
      ) : (
        <div className="history-list">
          {history.map((entry) => (
            <div
              key={entry.id}
              className={`history-item ${expandedId === entry.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="history-item-header">
                <span className="history-item-subject">
                  {entry.threadSubject || '(New email)'}
                </span>
                <span className="history-item-date">{formatDate(entry.timestamp)}</span>
              </div>
              <div className="history-item-mode">
                {entry.mode === 'compose' ? 'New email' : 'Reply'}
              </div>
              <div className="history-item-notes">{entry.notes}</div>

              {expandedId === entry.id && (
                <div className="history-item-body">
                  <div className="history-item-draft">{entry.draft}</div>
                  <div className="history-item-actions">
                    <button onClick={(e) => { e.stopPropagation(); onReuse(entry.notes); }}>
                      Reuse Notes
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}>
                      Delete
                    </button>
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
