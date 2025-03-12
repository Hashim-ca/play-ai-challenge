export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface Chat {
  id: string;
  title: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContent?: string;
  audioInfo?: string;
  messages?: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatParams {
  title: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContent?: string;
  audioInfo?: string;
}

export interface UpdateChatParams {
  id: string;
  title?: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContent?: string;
  audioInfo?: string;
}

export interface SendMessageParams {
  chatId: string;
  message: string;
} 