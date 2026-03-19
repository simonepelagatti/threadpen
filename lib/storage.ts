import {
  Settings,
  ThreadData,
  SessionState,
  DraftHistoryEntry,
  DEFAULT_MODEL,
  DRAFT_HISTORY_LIMIT,
  DEFAULT_TONE_PRESETS,
  DEFAULT_INTENT_PRESETS,
} from './types';

const SETTINGS_KEY = 'threadpen_settings';
const THREAD_CACHE_KEY = 'threadpen_thread_cache';
const SESSION_STATE_KEY = 'threadpen_session_state';
const DRAFT_HISTORY_KEY = 'threadpen_draft_history';

// --- Settings ---

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const saved = result[SETTINGS_KEY] as Partial<Settings> | undefined;
  return {
    apiKey: saved?.apiKey ?? '',
    userName: saved?.userName ?? '',
    userEmail: saved?.userEmail ?? '',
    writingGuidelines: saved?.writingGuidelines ?? '',
    model: saved?.model ?? DEFAULT_MODEL,
    tonePresets: saved?.tonePresets ?? DEFAULT_TONE_PRESETS,
    intentPresets: saved?.intentPresets ?? DEFAULT_INTENT_PRESETS,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

// --- Thread cache ---

export async function cacheThreadData(data: ThreadData): Promise<void> {
  await chrome.storage.session.set({ [THREAD_CACHE_KEY]: data });
}

export async function getCachedThreadData(): Promise<ThreadData | null> {
  const result = await chrome.storage.session.get(THREAD_CACHE_KEY);
  return (result[THREAD_CACHE_KEY] as ThreadData) ?? null;
}

export async function clearCachedThreadData(): Promise<void> {
  await chrome.storage.session.remove(THREAD_CACHE_KEY);
}

// --- Session state persistence ---

export async function saveSessionState(state: SessionState): Promise<void> {
  await chrome.storage.session.set({ [SESSION_STATE_KEY]: state });
}

export async function loadSessionState(): Promise<SessionState | null> {
  const result = await chrome.storage.session.get(SESSION_STATE_KEY);
  return (result[SESSION_STATE_KEY] as SessionState) ?? null;
}

export async function clearSessionState(): Promise<void> {
  await chrome.storage.session.remove(SESSION_STATE_KEY);
}

// --- Draft history ---

export async function getDraftHistory(): Promise<DraftHistoryEntry[]> {
  const result = await chrome.storage.local.get(DRAFT_HISTORY_KEY);
  return (result[DRAFT_HISTORY_KEY] as DraftHistoryEntry[]) ?? [];
}

export async function addDraftToHistory(entry: DraftHistoryEntry): Promise<void> {
  const history = await getDraftHistory();
  history.unshift(entry);
  if (history.length > DRAFT_HISTORY_LIMIT) {
    history.length = DRAFT_HISTORY_LIMIT;
  }
  await chrome.storage.local.set({ [DRAFT_HISTORY_KEY]: history });
}

export async function deleteDraftFromHistory(id: string): Promise<void> {
  const history = await getDraftHistory();
  const filtered = history.filter((e) => e.id !== id);
  await chrome.storage.local.set({ [DRAFT_HISTORY_KEY]: filtered });
}
