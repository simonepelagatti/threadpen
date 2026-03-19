import React from 'react';
import { markdownToHtml } from '../../../lib/markdown';

interface Props {
  draft: string;
  streaming?: boolean;
}

export default function DraftOutput({ draft, streaming }: Props) {
  return (
    <div className={`draft-output ${streaming ? 'streaming' : ''}`}>
      <div className="draft-label">
        {streaming ? 'Generating...' : 'Generated Reply'}
      </div>
      <div className="draft-text">
        {streaming ? (
          <>
            {draft}
            <span className="streaming-cursor" />
          </>
        ) : (
          <div dangerouslySetInnerHTML={{ __html: markdownToHtml(draft) }} />
        )}
      </div>
    </div>
  );
}
