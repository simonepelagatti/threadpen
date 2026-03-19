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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      onSubmit();
    }
  };

  return (
    <div className="notes-input">
      <textarea
        placeholder={
          isRefinement
            ? 'Refine: e.g. "make it shorter", "more formal"...'
            : 'What should the reply cover? e.g. "Accept the meeting, suggest Thursday instead"'
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
