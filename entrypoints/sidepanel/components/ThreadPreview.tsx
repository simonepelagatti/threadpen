import React, { useState } from 'react';
import { ThreadData } from '../../../lib/types';
import { summarizeThread, getThreadData } from '../../../lib/messages';
import { markdownToHtml } from '../../../lib/markdown';

interface Props {
  thread: ThreadData | null;
  onDismiss: () => void;
  onThreadLoaded: (data: ThreadData) => void;
}

export default function ThreadPreview({ thread, onDismiss, onThreadLoaded }: Props) {
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryTokens, setSummaryTokens] = useState({ input: 0, output: 0 });
  const [summarizing, setSummarizing] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const showTemporaryError = (msg: string) => {
    setLoadError(msg);
    setTimeout(() => setLoadError(null), 4000);
  };

  if (!thread) {
    const handleLoadThread = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getThreadData();
        if (data) {
          onThreadLoaded(data);
        } else {
          showTemporaryError('No thread found. Make sure you have a Gmail conversation open.');
        }
      } catch {
        showTemporaryError('Could not reach Gmail. Make sure you have a Gmail tab open.');
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="thread-preview empty">
        <p>No thread loaded.</p>
        <button
          className="load-thread-btn"
          onClick={handleLoadThread}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load thread from Gmail'}
        </button>
        {loadError && <p className="load-error">{loadError}</p>}
      </div>
    );
  }

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const result = await summarizeThread();
      if ((result as any).error) {
        console.error(result);
      } else {
        setSummary(result.summary);
        setSummaryTokens({ input: result.inputTokens, output: result.outputTokens });
        setSummaryExpanded(true);
      }
    } catch (err) {
      console.error('[ThreadPen] Summarize error:', err);
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="thread-preview">
      <div className="thread-header-row">
        <div className="thread-subject">{thread.subject || '(No subject)'}</div>
        <button className="dismiss-btn" onClick={onDismiss} title="Dismiss thread">×</button>
      </div>
      <div className="thread-meta">
        {thread.messages.length} message{thread.messages.length !== 1 ? 's' : ''}
        {thread.truncated && ` (showing latest ${thread.messages.length} of ${thread.totalMessages})`}
      </div>
      <div className="thread-latest">
        <span className="label">Latest from:</span>{' '}
        {thread.messages[thread.messages.length - 1]?.from || 'Unknown'}
      </div>

      <div className="thread-actions">
        <button
          className="summarize-btn"
          onClick={handleSummarize}
          disabled={summarizing}
        >
          {summarizing ? 'Summarizing...' : summary ? 'Re-summarize' : 'Summarize'}
        </button>
      </div>

      {summary && (
        <div className="thread-summary">
          <div className="summary-header">
            <span className="summary-label">Summary</span>
            <span className="summary-tokens">
              {summaryTokens.input + summaryTokens.output} tokens
            </span>
            <button
              className="summary-toggle"
              onClick={() => setSummaryExpanded(!summaryExpanded)}
            >
              {summaryExpanded ? 'Hide' : 'Show'}
            </button>
          </div>
          {summaryExpanded && (
            <div
              className="summary-body"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
