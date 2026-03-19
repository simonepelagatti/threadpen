import React from 'react';
import { markdownToHtml } from '../../../lib/markdown';

interface Props {
  tips: string;
}

export default function TipsOutput({ tips }: Props) {
  if (!tips) return null;

  return (
    <div className="tips-output">
      <div className="tips-label">Tips</div>
      <div
        className="tips-text"
        dangerouslySetInnerHTML={{ __html: markdownToHtml(tips) }}
      />
    </div>
  );
}
