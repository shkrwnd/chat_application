export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  username: string;
  content: string;
  created_at: number;
}

export interface TypingEvent {
  username: string;
  isTyping: boolean;
}

export interface SearchResult {
  id: string;
  room_id: string;
  room_name: string;
  user_id: string;
  username: string;
  content: string;
  created_at: number;
}
