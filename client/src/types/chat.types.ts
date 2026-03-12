export interface Attachment {
  url: string;
  filename: string;
  type: string; // MIME type
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  attachments?: Attachment[];
  created_at: number;
}

export interface TypingEvent {
  username: string;
  isTyping: boolean;
}

export interface ReadReceipt {
  userId: string;
  username: string;
  messageId: string;
}

export type UserStatus = 'online' | 'away' | 'offline';

export interface SearchResult {
  id: string;
  room_id: string;
  room_name: string;
  user_id: string;
  username: string;
  content: string;
  created_at: number;
}
