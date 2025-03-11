export interface Chat {
  id: string;
  title: string;
  pdfStorageUrl?: string;
  pdfFileName?: string;
  parsedContent?: string;
  audioInfo?: string;
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