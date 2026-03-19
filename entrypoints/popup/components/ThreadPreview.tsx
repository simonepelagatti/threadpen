import React from 'react';
import { ThreadData } from '../../../lib/types';

interface Props {
  thread: ThreadData | null;
}

export default function ThreadPreview({ thread }: Props) {
  if (!thread) {
    return (
      <div className="thread-preview empty">
        <p>No thread detected. Open a Gmail conversation first.</p>
      </div>
    );
  }

  return (
    <div className="thread-preview">
      <div className="thread-subject">{thread.subject || '(No subject)'}</div>
      <div className="thread-meta">
        {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
        {thread.truncated && ` (showing latest ${thread.messages.length} of ${thread.totalMessages})`}
      </div>
      <div className="thread-latest">
        <span className="label">Latest from:</span>{' '}
        {thread.messages[thread.messages.length - 1]?.from || 'Unknown'}
      </div>
    </div>
  );
}
