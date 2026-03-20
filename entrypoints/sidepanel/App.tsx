import React, { useEffect, useReducer, useRef, useState, useCallback } from 'react';
import {
  ThreadData,
  ConversationTurn,
  GenerateDraftResponse,
  Settings,
  SessionState,
  StreamPortMessage,
  DEFAULT_MODEL,
  DEFAULT_TONE_PRESETS,
  DEFAULT_INTENT_PRESETS,
} from '../../lib/types';
import { getThreadData, insertDraftIntoGmail, openNewCompose, sendRuntimeMessage } from '../../lib/messages';
import { loadSettings, saveSettings, saveSessionState, loadSessionState, addDraftToHistory } from '../../lib/storage';
import { parseDraftResponse } from '../../lib/claude';
import { markdownToPlainText } from '../../lib/markdown';
import ThreadPreview from './components/ThreadPreview';
import NotesInput from './components/NotesInput';
import DraftOutput from './components/DraftOutput';
import TipsOutput from './components/TipsOutput';
import CopyButton from './components/CopyButton';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import AgendaView from './components/AgendaView';
import ContactEditor from './components/ContactEditor';
import ToneControls from './components/ToneControls';
import ComposeForm from './components/ComposeForm';
import { ContactProfile } from '../../lib/types';

interface State {
  thread: ThreadData | null;
  notes: string;
  draft: string;
  tips: string;
  conversationHistory: ConversationTurn[];
  loading: boolean;
  streaming: boolean;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  selectedTone: string | null;
  selectedIntent: string | null;
  mode: 'reply' | 'compose';
  composeRecipient: string;
  composeSubject: string;
}

type Action =
  | { type: 'SET_THREAD'; payload: ThreadData | null }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_LOADING' }
  | { type: 'SET_STREAMING'; payload: boolean }
  | { type: 'STREAM_APPEND'; payload: string }
  | { type: 'SET_DRAFT'; payload: GenerateDraftResponse }
  | { type: 'STREAM_COMPLETE'; payload: { inputTokens: number; outputTokens: number } }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_TONE'; payload: string | null }
  | { type: 'SET_INTENT'; payload: string | null }
  | { type: 'SET_MODE'; payload: 'reply' | 'compose' }
  | { type: 'SET_COMPOSE_RECIPIENT'; payload: string }
  | { type: 'SET_COMPOSE_SUBJECT'; payload: string }
  | { type: 'RESTORE_SESSION'; payload: Partial<SessionState> }
  | { type: 'REUSE_NOTES'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THREAD':
      return { ...state, thread: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, loading: true, streaming: false, error: null };
    case 'SET_STREAMING':
      return { ...state, streaming: action.payload, loading: action.payload };
    case 'STREAM_APPEND':
      return { ...state, draft: state.draft + action.payload };
    case 'SET_DRAFT': {
      const { draft, tips, inputTokens, outputTokens } = action.payload;
      const newHistory: ConversationTurn[] = [
        ...state.conversationHistory,
        { role: 'user', content: state.notes },
        { role: 'assistant', content: draft },
      ];
      return {
        ...state,
        draft,
        tips,
        loading: false,
        streaming: false,
        notes: '',
        conversationHistory: newHistory,
        inputTokens,
        outputTokens,
      };
    }
    case 'STREAM_COMPLETE': {
      const { draft, tips } = parseDraftResponse(state.draft);
      const newHistory: ConversationTurn[] = [
        ...state.conversationHistory,
        { role: 'user', content: state.notes },
        { role: 'assistant', content: draft },
      ];
      return {
        ...state,
        draft,
        tips,
        loading: false,
        streaming: false,
        notes: '',
        conversationHistory: newHistory,
        inputTokens: action.payload.inputTokens,
        outputTokens: action.payload.outputTokens,
      };
    }
    case 'SET_ERROR':
      return { ...state, loading: false, streaming: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_TONE':
      return { ...state, selectedTone: action.payload };
    case 'SET_INTENT':
      return { ...state, selectedIntent: action.payload };
    case 'SET_MODE':
      return {
        ...state,
        mode: action.payload,
        draft: '',
        tips: '',
        notes: '',
        conversationHistory: [],
        error: null,
        inputTokens: 0,
        outputTokens: 0,
      };
    case 'SET_COMPOSE_RECIPIENT':
      return { ...state, composeRecipient: action.payload };
    case 'SET_COMPOSE_SUBJECT':
      return { ...state, composeSubject: action.payload };
    case 'RESTORE_SESSION':
      return {
        ...state,
        notes: action.payload.notes ?? state.notes,
        draft: action.payload.draft ?? state.draft,
        tips: action.payload.tips ?? state.tips,
        conversationHistory: action.payload.conversationHistory ?? state.conversationHistory,
        selectedTone: action.payload.selectedTone ?? state.selectedTone,
        selectedIntent: action.payload.selectedIntent ?? state.selectedIntent,
        inputTokens: action.payload.inputTokens ?? state.inputTokens,
        outputTokens: action.payload.outputTokens ?? state.outputTokens,
        mode: action.payload.mode ?? state.mode,
        composeRecipient: action.payload.composeRecipient ?? state.composeRecipient,
        composeSubject: action.payload.composeSubject ?? state.composeSubject,
      };
    case 'REUSE_NOTES':
      return { ...state, notes: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  thread: null,
  notes: '',
  draft: '',
  tips: '',
  conversationHistory: [],
  loading: false,
  streaming: false,
  error: null,
  inputTokens: 0,
  outputTokens: 0,
  selectedTone: null,
  selectedIntent: null,
  mode: 'reply',
  composeRecipient: '',
  composeSubject: '',
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [view, setView] = useState<'main' | 'settings' | 'history' | 'agenda' | 'contact-editor'>('main');
  const [editingContact, setEditingContact] = useState<ContactProfile | undefined>(undefined);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesBeforeStreamRef = useRef<string>('');

  // Load settings + session state on mount
  useEffect(() => {
    loadSettings().then(setSettings);
    loadSessionState().then((session) => {
      if (session) {
        dispatch({ type: 'RESTORE_SESSION', payload: session });
      }
    });
    getThreadData()
      .then((data) => dispatch({ type: 'SET_THREAD', payload: data }))
      .catch(() => dispatch({ type: 'SET_ERROR', payload: 'Failed to load thread data' }));
  }, []);

  // Listen for thread updates from the content script (dynamic detection)
  useEffect(() => {
    const listener = (message: any) => {
      if (message.type === 'THREAD_DATA_UPDATED' && message.payload) {
        dispatch({ type: 'SET_THREAD', payload: message.payload });
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  // If no API key, show settings first
  useEffect(() => {
    if (settings && !settings.apiKey) {
      setView('settings');
    }
  }, [settings]);

  // Debounced session state persistence
  const persistSession = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const session: SessionState = {
        threadSubject: state.thread?.subject ?? '',
        notes: state.notes,
        draft: state.draft,
        tips: state.tips,
        conversationHistory: state.conversationHistory,
        selectedTone: state.selectedTone,
        selectedIntent: state.selectedIntent,
        inputTokens: state.inputTokens,
        outputTokens: state.outputTokens,
        mode: state.mode,
        composeRecipient: state.composeRecipient,
        composeSubject: state.composeSubject,
      };
      saveSessionState(session);
    }, 500);
  }, [state]);

  useEffect(() => {
    persistSession();
  }, [state.notes, state.draft, state.tips, state.conversationHistory, state.selectedTone, state.selectedIntent, state.mode, state.composeRecipient, state.composeSubject, persistSession]);

  // Clear session if thread subject changed
  useEffect(() => {
    if (state.mode !== 'reply') return;
    loadSessionState().then((session) => {
      if (session && state.thread && session.threadSubject && session.threadSubject !== state.thread.subject) {
        // Thread changed — clear session
        dispatch({ type: 'RESTORE_SESSION', payload: { notes: '', draft: '', tips: '', conversationHistory: [], inputTokens: 0, outputTokens: 0 } });
      }
    });
  }, [state.thread?.subject]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const getToneInstruction = (): string | undefined => {
    if (!state.selectedTone || !settings) return undefined;
    return settings.tonePresets.find((t) => t.id === state.selectedTone)?.instruction;
  };

  const getIntentInstruction = (): string | undefined => {
    if (!state.selectedIntent || !settings) return undefined;
    return settings.intentPresets.find((t) => t.id === state.selectedIntent)?.instruction;
  };

  const handleGenerate = async () => {
    if (!state.notes.trim()) return;
    notesBeforeStreamRef.current = state.notes;

    // Clear previous draft and start streaming
    dispatch({ type: 'RESTORE_SESSION', payload: { draft: '', tips: '' } });
    dispatch({ type: 'SET_STREAMING', payload: true });

    const port = chrome.runtime.connect({ name: 'threadpen-stream' });

    const toneInstruction = getToneInstruction();
    const intentInstruction = getIntentInstruction();

    if (state.mode === 'compose') {
      port.postMessage({
        type: 'STREAM_NEW_EMAIL_START',
        payload: {
          notes: state.notes,
          recipient: state.composeRecipient,
          subject: state.composeSubject,
          conversationHistory: state.conversationHistory,
          toneInstruction,
          intentInstruction,
        },
      } as StreamPortMessage);
    } else {
      port.postMessage({
        type: 'STREAM_START',
        payload: {
          notes: state.notes,
          conversationHistory: state.conversationHistory,
          toneInstruction,
          intentInstruction,
        },
      } as StreamPortMessage);
    }

    port.onMessage.addListener((msg: StreamPortMessage) => {
      if (msg.type === 'STREAM_DELTA') {
        dispatch({ type: 'STREAM_APPEND', payload: msg.text });
      } else if (msg.type === 'STREAM_DONE') {
        dispatch({ type: 'STREAM_COMPLETE', payload: { inputTokens: msg.inputTokens, outputTokens: msg.outputTokens } });
        port.disconnect();

        // Save to draft history
        saveToDraftHistory(msg.inputTokens, msg.outputTokens);

        // Fire-and-forget contact extraction
        triggerContactExtraction();
      } else if (msg.type === 'STREAM_ERROR') {
        dispatch({ type: 'SET_ERROR', payload: msg.error });
        port.disconnect();
      }
    });
  };

  const saveToDraftHistory = async (inputTokens: number, outputTokens: number) => {
    // We need to read the final state after stream complete — use a small delay
    setTimeout(async () => {
      const session = await loadSessionState();
      if (session && session.draft) {
        await addDraftToHistory({
          id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          threadSubject: state.thread?.subject ?? state.composeSubject ?? '',
          timestamp: Date.now(),
          notes: notesBeforeStreamRef.current,
          draft: session.draft,
          tips: session.tips,
          model: settings?.model ?? DEFAULT_MODEL,
          mode: state.mode,
        });
      }
    }, 100);
  };

  const triggerContactExtraction = () => {
    setTimeout(async () => {
      const session = await loadSessionState();
      if (!session?.draft) return;
      // Determine recipient email
      let recipientEmail = '';
      if (state.mode === 'compose') {
        recipientEmail = state.composeRecipient.trim();
      } else if (state.thread?.messages.length) {
        const s = await loadSettings();
        const userEmail = s.userEmail?.trim().toLowerCase() || '';
        for (const msg of [...state.thread.messages].reverse()) {
          const fromEmail = msg.from.match(/<([^>]+)>/)?.[1]?.toLowerCase() || msg.from.trim().toLowerCase();
          if (fromEmail && fromEmail !== userEmail) { recipientEmail = fromEmail; break; }
          const toEmail = msg.to.match(/<([^>]+)>/)?.[1]?.toLowerCase() || msg.to.trim().toLowerCase();
          if (toEmail && toEmail !== userEmail) { recipientEmail = toEmail; break; }
        }
      }
      if (!recipientEmail) return;
      // Build a snippet from thread or compose context
      let threadSnippet = '';
      if (state.thread?.messages.length) {
        threadSnippet = state.thread.messages.slice(-3).map((m) => `From: ${m.from}\n${m.body}`).join('\n---\n');
      }
      sendRuntimeMessage({
        type: 'EXTRACT_CONTACT_INFO',
        payload: { recipientEmail, threadSnippet, generatedDraft: session.draft },
      });
    }, 200);
  };

  const handleRefinementClick = (instruction: string) => {
    dispatch({ type: 'SET_NOTES', payload: instruction });
    // Auto-trigger after a tick so the notes state is updated
    setTimeout(() => {
      const notesEl = document.querySelector('.notes-input textarea') as HTMLTextAreaElement;
      if (notesEl) notesEl.value = instruction;
      dispatch({ type: 'SET_NOTES', payload: instruction });
    }, 0);
  };

  const handleInsert = async () => {
    if (!state.draft) return;
    const plainDraft = markdownToPlainText(state.draft);
    try {
      const result = state.mode === 'compose'
        ? await openNewCompose(plainDraft)
        : await insertDraftIntoGmail(plainDraft);
      if (result.error === 'clipboard_fallback') {
        showToast('Copied to clipboard (compose box not found)');
      } else if (result.ok) {
        showToast('Inserted into Gmail!');
      } else {
        showToast(result.error || 'Insert failed');
      }
    } catch (err: any) {
      showToast(err.message || 'Insert failed');
    }
  };

  const handleSettingsSaved = (s: Settings) => {
    setSettings(s);
    setView('main');
  };

  const handleReuse = (notes: string) => {
    dispatch({ type: 'REUSE_NOTES', payload: notes });
    setView('main');
  };

  const hasExistingDraft = state.conversationHistory.length > 0;

  if (view === 'settings') {
    return (
      <div className="app">
        <SettingsView
          initial={settings || {
            apiKey: '', userName: '', userEmail: '', writingGuidelines: '', model: DEFAULT_MODEL,
            tonePresets: DEFAULT_TONE_PRESETS, intentPresets: DEFAULT_INTENT_PRESETS,
          }}
          onBack={() => setView('main')}
          onSaved={handleSettingsSaved}
        />
      </div>
    );
  }

  if (view === 'history') {
    return (
      <div className="app">
        <HistoryView onBack={() => setView('main')} onReuse={handleReuse} />
      </div>
    );
  }

  if (view === 'agenda') {
    return (
      <div className="app">
        <AgendaView
          onBack={() => setView('main')}
          onEdit={(contact) => { setEditingContact(contact); setView('contact-editor'); }}
          onAdd={() => { setEditingContact(undefined); setView('contact-editor'); }}
        />
      </div>
    );
  }

  if (view === 'contact-editor') {
    return (
      <div className="app">
        <ContactEditor
          initial={editingContact}
          onSave={() => setView('agenda')}
          onBack={() => setView('agenda')}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ThreadPen <span className="version-tag">v{chrome.runtime.getManifest().version}</span></h1>
        <div className="header-actions">
          <button
            className="history-btn"
            onClick={() => setView('history')}
            title="Draft History"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6.5" />
              <polyline points="8,4.5 8,8 10.5,9.5" />
            </svg>
          </button>
          <button
            className="agenda-btn"
            onClick={() => setView('agenda')}
            title="Contact Agenda"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="5.5" r="3" />
              <path d="M2.5 14c0-3 2.5-4.5 5.5-4.5s5.5 1.5 5.5 4.5" />
            </svg>
          </button>
          <button
            className="settings-btn"
            onClick={() => setView('settings')}
            title="Settings"
          >
            &#x2699;
          </button>
        </div>
      </header>

      <div className="mode-toggle">
        <button
          className={state.mode === 'reply' ? 'active' : ''}
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'reply' })}
        >
          Reply
        </button>
        <button
          className={state.mode === 'compose' ? 'active' : ''}
          onClick={() => dispatch({ type: 'SET_MODE', payload: 'compose' })}
        >
          New Email
        </button>
      </div>

      {state.mode === 'reply' && (
        <ThreadPreview
          thread={state.thread}
          onDismiss={() => {
            dispatch({ type: 'SET_THREAD', payload: null });
            sendRuntimeMessage({ type: 'DISMISS_THREAD' });
          }}
          onThreadLoaded={(data) => dispatch({ type: 'SET_THREAD', payload: data })}
        />
      )}

      {state.mode === 'compose' && (
        <ComposeForm
          recipient={state.composeRecipient}
          subject={state.composeSubject}
          onRecipientChange={(v) => dispatch({ type: 'SET_COMPOSE_RECIPIENT', payload: v })}
          onSubjectChange={(v) => dispatch({ type: 'SET_COMPOSE_SUBJECT', payload: v })}
        />
      )}

      {state.error && (
        <div className="error">
          {state.error}
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>×</button>
        </div>
      )}

      {(state.draft || state.streaming) && (
        <DraftOutput draft={state.draft} streaming={state.streaming} />
      )}

      {state.draft && !state.streaming && (
        <div className="action-buttons">
          <CopyButton text={markdownToPlainText(state.draft)} />
          <button className="insert-btn" onClick={handleInsert}>
            {state.mode === 'compose' ? 'Insert into Compose' : 'Insert into Reply'}
          </button>
        </div>
      )}

      {state.tips && !state.streaming && <TipsOutput tips={state.tips} />}

      {state.draft && !state.streaming && (
        <div className="token-info">
          Tokens: {state.inputTokens} in / {state.outputTokens} out
        </div>
      )}

      {settings && (
        <ToneControls
          tonePresets={settings.tonePresets}
          intentPresets={settings.intentPresets}
          selectedTone={state.selectedTone}
          selectedIntent={state.selectedIntent}
          onToneChange={(id) => {
            if (hasExistingDraft && id) {
              // Post-draft: trigger refinement with the tone instruction
              const instruction = settings.tonePresets.find((t) => t.id === id)?.instruction;
              if (instruction) handleRefinementClick(instruction);
            } else {
              dispatch({ type: 'SET_TONE', payload: id });
            }
          }}
          onIntentChange={(id) => {
            if (hasExistingDraft && id) {
              const instruction = settings.intentPresets.find((t) => t.id === id)?.instruction;
              if (instruction) handleRefinementClick(instruction);
            } else {
              dispatch({ type: 'SET_INTENT', payload: id });
            }
          }}
          label={hasExistingDraft ? 'Quick refine' : undefined}
        />
      )}

      <NotesInput
        value={state.notes}
        onChange={(v) => dispatch({ type: 'SET_NOTES', payload: v })}
        onSubmit={handleGenerate}
        loading={state.loading}
        isRefinement={hasExistingDraft}
      />

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
