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

export interface Settings {
  apiKey: string;
  userName: string;
  userEmail: string;
  writingGuidelines: string;
  model: string;
}

export type RuntimeMessage =
  | { type: 'THREAD_DATA_UPDATED'; payload: ThreadData }
  | { type: 'GET_THREAD_DATA' }
  | { type: 'GENERATE_DRAFT'; payload: GenerateDraftRequest }
  | { type: 'GET_SETTINGS' };

export interface WindowMessage {
  source: 'threadpen-gmail-reader';
  type: 'GMAIL_THREAD_DATA';
  payload: ThreadData;
}

export const MAX_THREAD_MESSAGES = 15;
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
