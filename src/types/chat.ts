export interface ChatMessage {
  id: string;
  client_code: string;
  client_name?: string;
  sender: 'client' | 'admin';
  message: string;
  read_by_admin: boolean;
  read_by_client: boolean;
  created_at: string;
}

export interface ChatConversation {
  client_code: string;
  client_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  last_sender: 'client' | 'admin';
}
