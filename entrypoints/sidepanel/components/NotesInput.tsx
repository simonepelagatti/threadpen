import React from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  isRefinement: boolean;
}

export default function NotesInput({ value, onChange, onSubmit, loading, isRefinement }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !loading) {
        onSubmit();
      }
    }
  };

  return (
    <div className="notes-input">
      <textarea
        placeholder={
          isRefinement
            ? 'Refine: e.g. "make it shorter", "more formal"... (Enter to send, Shift+Enter for newline)'
            : 'What should the reply cover? (Enter to send, Shift+Enter for newline)'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={3}
        disabled={loading}
      />
      <button onClick={onSubmit} disabled={loading || !value.trim()}>
        {loading ? 'Generating...' : isRefinement ? 'Refine' : 'Draft Reply'}
      </button>
    </div>
  );
}
