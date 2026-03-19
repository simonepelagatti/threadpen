import React, { useEffect, useReducer, useState } from 'react';
import { ThreadData, ConversationTurn, GenerateDraftResponse, Settings, DEFAULT_MODEL } from '../../lib/types';
import { getThreadData, generateDraft } from '../../lib/messages';
import { loadSettings, saveSettings } from '../../lib/storage';
import ThreadPreview from './components/ThreadPreview';
import NotesInput from './components/NotesInput';
import DraftOutput from './components/DraftOutput';
import TipsOutput from './components/TipsOutput';
import CopyButton from './components/CopyButton';
import SettingsView from './components/SettingsView';

interface State {
  thread: ThreadData | null;
  notes: string;
  draft: string;
  tips: string;
  conversationHistory: ConversationTurn[];
  loading: boolean;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
}

type Action =
  | { type: 'SET_THREAD'; payload: ThreadData | null }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'SET_LOADING' }
  | { type: 'SET_DRAFT'; payload: GenerateDraftResponse }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_ERROR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_THREAD':
      return { ...state, thread: action.payload };
    case 'SET_NOTES':
      return { ...state, notes: action.payload, error: null };
    case 'SET_LOADING':
      return { ...state, loading: true, error: null };
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
        notes: '',
        conversationHistory: newHistory,
        inputTokens,
        outputTokens,
      };
    }
    case 'SET_ERROR':
      return { ...state, loading: false, error: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
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
  error: null,
  inputTokens: 0,
  outputTokens: 0,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [view, setView] = useState<'main' | 'settings'>('main');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    getThreadData()
      .then((data) => dispatch({ type: 'SET_THREAD', payload: data }))
      .catch(() => dispatch({ type: 'SET_ERROR', payload: 'Failed to load thread data' }));

    loadSettings().then(setSettings);
  }, []);

  // If no API key, show settings first
  useEffect(() => {
    if (settings && !settings.apiKey) {
      setView('settings');
    }
  }, [settings]);

  const handleGenerate = async () => {
    if (!state.notes.trim()) return;
    dispatch({ type: 'SET_LOADING' });
    try {
      const result = await generateDraft(state.notes, state.conversationHistory);
      if ((result as any).error) {
        dispatch({ type: 'SET_ERROR', payload: (result as any).error });
      } else {
        dispatch({ type: 'SET_DRAFT', payload: result });
      }
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', payload: err.message || 'Failed to generate draft' });
    }
  };

  const handleSettingsSaved = (s: Settings) => {
    setSettings(s);
    setView('main');
  };

  const hasExistingDraft = state.conversationHistory.length > 0;

  if (view === 'settings') {
    return (
      <div className="app">
        <SettingsView
          initial={settings || { apiKey: '', userName: '', userEmail: '', writingGuidelines: '', model: DEFAULT_MODEL }}
          onBack={() => setView('main')}
          onSaved={handleSettingsSaved}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>ThreadPen</h1>
        <button
          className="settings-btn"
          onClick={() => setView('settings')}
          title="Settings"
        >
          ⚙
        </button>
      </header>

      <ThreadPreview thread={state.thread} />

      {state.error && (
        <div className="error">
          {state.error}
          <button onClick={() => dispatch({ type: 'CLEAR_ERROR' })}>×</button>
        </div>
      )}

      {state.draft && (
        <>
          <DraftOutput draft={state.draft} />
          <CopyButton text={state.draft} />
        </>
      )}

      {state.tips && <TipsOutput tips={state.tips} />}

      {state.draft && (
        <div className="token-info">
          Tokens: {state.inputTokens} in / {state.outputTokens} out
        </div>
      )}

      <NotesInput
        value={state.notes}
        onChange={(v) => dispatch({ type: 'SET_NOTES', payload: v })}
        onSubmit={handleGenerate}
        loading={state.loading}
        isRefinement={hasExistingDraft}
      />
    </div>
  );
}
