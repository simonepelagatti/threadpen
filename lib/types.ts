export interface ThreadMessage {
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
}

export interface ThreadData {
  subject: string;
  messages: ThreadMessage[];
  totalMessages: number;
  truncated: boolean;
}

export interface GenerateDraftRequest {
  notes: string;
  conversationHistory: ConversationTurn[];
  toneInstruction?: string;
  intentInstruction?: string;
}

export interface GenerateDraftResponse {
  draft: string;
  tips: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface TonePreset {
  id: string;
  label: string;
  instruction: string;
}

export interface IntentPreset {
  id: string;
  label: string;
  instruction: string;
}

export const DEFAULT_TONE_PRESETS: TonePreset[] = [
  { id: 'formal', label: 'Formal', instruction: 'Use a formal, professional tone.' },
  { id: 'casual', label: 'Casual', instruction: 'Use a casual, relaxed tone.' },
  { id: 'friendly', label: 'Friendly', instruction: 'Use a warm, friendly tone.' },
  { id: 'concise', label: 'Concise', instruction: 'Be very concise and to the point. Keep the reply short.' },
];

export const DEFAULT_INTENT_PRESETS: IntentPreset[] = [
  { id: 'accept', label: 'Accept', instruction: 'Accept the request or proposal in the thread.' },
  { id: 'decline', label: 'Decline', instruction: 'Politely decline the request or proposal in the thread.' },
  { id: 'ask-info', label: 'Ask for info', instruction: 'Ask for more information or clarification about the topic.' },
  { id: 'schedule', label: 'Schedule', instruction: 'Propose scheduling a meeting or call to discuss further.' },
];

export interface Settings {
  apiKey: string;
  userName: string;
  userEmail: string;
  writingGuidelines: string;
  model: string;
  tonePresets: TonePreset[];
  intentPresets: IntentPreset[];
}

export interface DraftHistoryEntry {
  id: string;
  threadSubject: string;
  timestamp: number;
  notes: string;
  draft: string;
  tips: string;
  model: string;
  mode: 'reply' | 'compose';
}

export interface SessionState {
  threadSubject: string;
  notes: string;
  draft: string;
  tips: string;
  conversationHistory: ConversationTurn[];
  selectedTone: string | null;
  selectedIntent: string | null;
  inputTokens: number;
  outputTokens: number;
  mode: 'reply' | 'compose';
  composeRecipient: string;
  composeSubject: string;
}

export interface SummarizeResponse {
  summary: string;
  inputTokens: number;
  outputTokens: number;
}

export interface NewEmailDraftRequest {
  notes: string;
  recipient: string;
  subject: string;
  conversationHistory: ConversationTurn[];
  toneInstruction?: string;
  intentInstruction?: string;
}

// --- Runtime messages (sendMessage) ---
export type RuntimeMessage =
  | { type: 'THREAD_DATA_UPDATED'; payload: ThreadData }
  | { type: 'GET_THREAD_DATA' }
  | { type: 'GENERATE_DRAFT'; payload: GenerateDraftRequest }
  | { type: 'GET_SETTINGS' }
  | { type: 'SUMMARIZE_THREAD' }
  | { type: 'INSERT_DRAFT'; payload: { text: string } }
  | { type: 'OPEN_NEW_COMPOSE'; payload: { text: string } }
  | { type: 'GENERATE_NEW_EMAIL'; payload: NewEmailDraftRequest }
  | { type: 'DISMISS_THREAD' }
  | { type: 'INSERT_DRAFT_REPLY_ALL'; payload: { text: string } }
  | { type: 'EXTRACT_CONTACT_INFO'; payload: { recipientEmail: string; threadSnippet: string; generatedDraft: string } };

// --- Port messages (streaming) ---
export type StreamPortMessage =
  | { type: 'STREAM_START'; payload: GenerateDraftRequest }
  | { type: 'STREAM_NEW_EMAIL_START'; payload: NewEmailDraftRequest }
  | { type: 'STREAM_DELTA'; text: string }
  | { type: 'STREAM_DONE'; inputTokens: number; outputTokens: number }
  | { type: 'STREAM_ERROR'; error: string };

export interface WindowMessage {
  source: 'threadpen-gmail-reader';
  type: 'GMAIL_THREAD_DATA';
  payload: ThreadData;
}

export type RelationshipType = 'colleague' | 'client' | 'vendor' | 'manager' | 'report' | 'partner' | 'other';

export interface ContactProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  company: string;
  relationship: RelationshipType;
  preferredTone: string;
  notes: string;
  fieldMeta: Partial<Record<'name' | 'role' | 'company' | 'relationship' | 'preferredTone' | 'notes', { source: 'manual' | 'auto'; updatedAt: number }>>;
  createdAt: number;
  updatedAt: number;
}

export interface ContactExtractionResult {
  email: string;
  name?: string;
  role?: string;
  company?: string;
  relationship?: RelationshipType;
  suggestedTone?: string;
}

export const MAX_THREAD_MESSAGES = 15;
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const DRAFT_HISTORY_LIMIT = 25;
export const CONTACT_AGENDA_LIMIT = 200;
