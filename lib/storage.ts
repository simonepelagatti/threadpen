import {
  Settings,
  ThreadData,
  SessionState,
  DraftHistoryEntry,
  ContactProfile,
  ContactExtractionResult,
  RelationshipType,
  DEFAULT_MODEL,
  DRAFT_HISTORY_LIMIT,
  CONTACT_AGENDA_LIMIT,
  DEFAULT_TONE_PRESETS,
  DEFAULT_INTENT_PRESETS,
} from './types';

const SETTINGS_KEY = 'threadpen_settings';
const THREAD_CACHE_KEY = 'threadpen_thread_cache';
const SESSION_STATE_KEY = 'threadpen_session_state';
const DRAFT_HISTORY_KEY = 'threadpen_draft_history';
const CONTACT_AGENDA_KEY = 'threadpen_contact_agenda';

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

// --- Contact Agenda ---

export async function getContactAgenda(): Promise<ContactProfile[]> {
  const result = await chrome.storage.local.get(CONTACT_AGENDA_KEY);
  return (result[CONTACT_AGENDA_KEY] as ContactProfile[]) ?? [];
}

export async function getContactByEmail(email: string): Promise<ContactProfile | null> {
  const normalized = email.trim().toLowerCase();
  const contacts = await getContactAgenda();
  return contacts.find((c) => c.email.toLowerCase() === normalized) ?? null;
}

export async function saveContact(contact: ContactProfile): Promise<void> {
  const contacts = await getContactAgenda();
  const idx = contacts.findIndex((c) => c.id === contact.id);
  if (idx >= 0) {
    contacts[idx] = contact;
  } else {
    if (contacts.length >= CONTACT_AGENDA_LIMIT) {
      contacts.pop();
    }
    contacts.unshift(contact);
  }
  await chrome.storage.local.set({ [CONTACT_AGENDA_KEY]: contacts });
}

export async function deleteContact(id: string): Promise<void> {
  const contacts = await getContactAgenda();
  const filtered = contacts.filter((c) => c.id !== id);
  await chrome.storage.local.set({ [CONTACT_AGENDA_KEY]: filtered });
}

const VALID_RELATIONSHIPS: RelationshipType[] = ['colleague', 'client', 'vendor', 'manager', 'report', 'partner', 'other'];

export async function upsertContactFromExtraction(extraction: ContactExtractionResult): Promise<ContactProfile> {
  const now = Date.now();
  const existing = await getContactByEmail(extraction.email);

  if (existing) {
    const updated = { ...existing, updatedAt: now };
    const autoFields: Array<{ key: keyof ContactProfile & ('name' | 'role' | 'company' | 'relationship' | 'preferredTone' | 'notes'); extractKey: keyof ContactExtractionResult }> = [
      { key: 'name', extractKey: 'name' },
      { key: 'role', extractKey: 'role' },
      { key: 'company', extractKey: 'company' },
      { key: 'relationship', extractKey: 'relationship' },
      { key: 'preferredTone', extractKey: 'suggestedTone' },
    ];
    for (const { key, extractKey } of autoFields) {
      const value = extraction[extractKey];
      if (value && existing.fieldMeta[key]?.source !== 'manual') {
        if (key === 'relationship') {
          if (VALID_RELATIONSHIPS.includes(value as RelationshipType)) {
            (updated as any)[key] = value;
            updated.fieldMeta = { ...updated.fieldMeta, [key]: { source: 'auto', updatedAt: now } };
          }
        } else {
          (updated as any)[key] = value;
          updated.fieldMeta = { ...updated.fieldMeta, [key]: { source: 'auto', updatedAt: now } };
        }
      }
    }
    await saveContact(updated);
    return updated;
  }

  const contact: ContactProfile = {
    id: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    email: extraction.email.trim().toLowerCase(),
    name: extraction.name ?? '',
    role: extraction.role ?? '',
    company: extraction.company ?? '',
    relationship: (extraction.relationship && VALID_RELATIONSHIPS.includes(extraction.relationship)) ? extraction.relationship : 'other',
    preferredTone: extraction.suggestedTone ?? '',
    notes: '',
    fieldMeta: {
      ...(extraction.name ? { name: { source: 'auto' as const, updatedAt: now } } : {}),
      ...(extraction.role ? { role: { source: 'auto' as const, updatedAt: now } } : {}),
      ...(extraction.company ? { company: { source: 'auto' as const, updatedAt: now } } : {}),
      ...(extraction.relationship ? { relationship: { source: 'auto' as const, updatedAt: now } } : {}),
      ...(extraction.suggestedTone ? { preferredTone: { source: 'auto' as const, updatedAt: now } } : {}),
    },
    createdAt: now,
    updatedAt: now,
  };
  await saveContact(contact);
  return contact;
}
