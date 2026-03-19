import { Settings, ThreadData, DEFAULT_MODEL } from './types';

const SETTINGS_KEY = 'threadpen_settings';
const THREAD_CACHE_KEY = 'threadpen_thread_cache';

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.sync.get(SETTINGS_KEY);
  const saved = result[SETTINGS_KEY] as Partial<Settings> | undefined;
  return {
    apiKey: saved?.apiKey ?? '',
    userName: saved?.userName ?? '',
    userEmail: saved?.userEmail ?? '',
    writingGuidelines: saved?.writingGuidelines ?? '',
    model: saved?.model ?? DEFAULT_MODEL,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function cacheThreadData(data: ThreadData): Promise<void> {
  await chrome.storage.session.set({ [THREAD_CACHE_KEY]: data });
}

export async function getCachedThreadData(): Promise<ThreadData | null> {
  const result = await chrome.storage.session.get(THREAD_CACHE_KEY);
  return (result[THREAD_CACHE_KEY] as ThreadData) ?? null;
}
