import React from 'react';

interface Props {
  draft: string;
}

export default function DraftOutput({ draft }: Props) {
  return (
    <div className="draft-output">
      <div className="draft-label">Generated Reply</div>
      <div className="draft-text">{draft}</div>
    </div>
  );
}
