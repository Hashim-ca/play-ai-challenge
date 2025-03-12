export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface ParsedContentMetadata {
  pageCount?: number;
  documentType?: string;
  processingTimeMs?: number;
}

export interface ParsedContent {
  _id: string;
  chatId: string;
  jobId?: string;
  result: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  metadata?: ParsedContentMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export type ProcessingState = 'idle' | 'processing' | 'completed' | 'failed';

export interface Chat {
  id: string;
  title: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContent?: string; // Legacy field
  parsedContentId?: string;
  processingState?: ProcessingState;
  audioInfo?: string;
  messages?: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateChatParams {
  title: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  processingState?: ProcessingState;
  audioInfo?: string;
}

export interface UpdateChatParams {
  id: string;
  title?: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContentId?: string;
  processingState?: ProcessingState;
  audioInfo?: string;
}

export interface SendMessageParams {
  chatId: string;
  message: string;
}

export interface ProcessPdfParams {
  chatId: string;
  pdfStorageUrl: string;
} 