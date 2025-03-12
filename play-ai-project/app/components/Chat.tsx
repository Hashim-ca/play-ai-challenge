'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, FileText } from 'lucide-react';
import { FileUpload } from './ui/file-upload';
import { PDFViewer } from './ui/pdf-viewer';
import { updateChat } from '@/lib/chatService';
import { getPublicPdfUrl } from '@/lib/s3';
import { Chat as ChatType } from '@/lib/types/chat';

interface ChatProps {
  chat: ChatType;
  onChatUpdate?: (updatedChat: ChatType) => void;
}

export function Chat({ chat, onChatUpdate }: ChatProps) {
  const [message, setMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle case when chat is undefined
  if (!chat) {
    return (
      <Card className="h-full w-full flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <p className="text-muted-foreground">Chat not found or loading...</p>
        </CardContent>
      </Card>
    );
  }

  useEffect(() => {
    const loadPdf = async () => {
      if (chat.pdfStorageUrl) {
        try {
          setLoading(true);
          const url = getPublicPdfUrl(chat.pdfStorageUrl);
          setPdfUrl(url);
        } catch (err) {
          console.error('Error loading PDF:', err);
          setError('Failed to load PDF');
        } finally {
          setLoading(false);
        }
      }
    };

    loadPdf();
  }, [chat.pdfStorageUrl]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    // TODO: Implement message sending
    console.log('Sending message:', message);
    setMessage('');
  };

  const handleFileUpload = async (key: string, fileName: string) => {
    try {
      const updatedChat = await updateChat({
        id: chat.id,
        pdfStorageUrl: key,
        pdfFileName: fileName,
      });
      
      const url = getPublicPdfUrl(key);
      setPdfUrl(url);
      
      if (onChatUpdate) {
        onChatUpdate(updatedChat);
      }
    } catch (err) {
      console.error('Error updating chat with PDF:', err);
      setError('Failed to update chat with PDF');
    }
  };

  return (
    <Card className="h-full w-full flex flex-col">
      <CardHeader className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">{chat.title}</h2>
        {chat.pdfFileName && (
          <div className="flex items-center text-sm text-muted-foreground">
            <FileText className="h-4 w-4 mr-1" />
            {chat.pdfFileName}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4">
        {!pdfUrl && !loading && !chat.pdfStorageUrl && (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-center text-muted-foreground mb-4">
              Upload a PDF document to start chatting
            </p>
            <FileUpload 
              onUploadComplete={handleFileUpload}
              className="max-w-xs"
            />
          </div>
        )}
        
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p>Loading PDF...</p>
          </div>
        )}
        
        {error && (
          <div className="text-destructive text-center">
            {error}
          </div>
        )}
        
        {pdfUrl && (
          <PDFViewer url={pdfUrl} />
        )}
      </CardContent>
      
      <CardFooter className="border-t p-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2 w-full"
        >
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1"
            disabled={!pdfUrl} // Disable if no PDF is uploaded
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || !pdfUrl}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}