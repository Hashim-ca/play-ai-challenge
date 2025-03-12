'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, FileText, User, Bot } from 'lucide-react';
import { FileUpload } from './ui/file-upload';
import { PDFViewer } from './ui/pdf-viewer';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPublicPdfUrl } from '@/lib/s3';
import { Chat as ChatType, ChatMessage } from '@/lib/types/chat';
import { useUpdateChat, useSendMessage } from '@/lib/hooks/useChats';

interface ChatProps {
  chat: ChatType;
  onChatUpdate?: (updatedChat: ChatType) => void;
}

export function Chat({ chat, onChatUpdate }: ChatProps) {
  const [message, setMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // React Query hooks
  const updateChatMutation = useUpdateChat();
  const sendMessageMutation = useSendMessage();

  useEffect(() => {
    const loadPdf = async () => {
      if (chat?.pdfStorageUrl) {
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
  }, [chat?.pdfStorageUrl]);

  const handleSendMessage = async () => {
    if (!message.trim() || !chat.id) return;
    
    try {
      const trimmedMessage = message.trim();
      setMessage('');
      
      // Optimistically update UI
      if (onChatUpdate && chat.messages) {
        const optimisticChat = {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: 'temp-user-id',
              content: trimmedMessage,
              role: 'user',
              timestamp: new Date(),
            } as ChatMessage,
          ],
        };
        onChatUpdate(optimisticChat);
      }
      
      // Send message to API
      await sendMessageMutation.mutateAsync({
        chatId: chat.id,
        message: trimmedMessage,
      });
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const handleFileUpload = async (key: string, fileName: string) => {
    try {
      // Update chat with PDF info
      const updatedChat = await updateChatMutation.mutateAsync({
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
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Upload PDF prompt */}
        {!pdfUrl && !loading && !chat.pdfStorageUrl && (
          <div className="flex flex-col items-center justify-center flex-1 p-4">
            <p className="text-center text-muted-foreground mb-4">
              Upload a PDF document to start chatting
            </p>
            <FileUpload 
              onUploadComplete={handleFileUpload}
              className="max-w-xs"
            />
          </div>
        )}
        
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center flex-1 p-4">
            <p>Loading PDF...</p>
          </div>
        )}
        
        {/* Error display */}
        {error && (
          <div className="text-destructive text-center p-4">
            {error}
          </div>
        )}
        
        {/* Split view with PDF and messages */}
        {pdfUrl && (
          <div className="flex flex-1 overflow-hidden">
            {/* PDF Viewer */}
            <div className="w-1/2 border-r">
              <PDFViewer url={pdfUrl} />
            </div>
            
            {/* Chat Messages */}
            <div className="w-1/2 flex flex-col h-full">
              <ScrollArea className="flex-1 p-4">
                {chat.messages && chat.messages.length > 0 ? (
                  <div className="space-y-4">
                    {chat.messages.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[80%] p-3 rounded-lg ${
                            msg.role === 'user' 
                              ? 'bg-primary text-primary-foreground ml-auto' 
                              : 'bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {msg.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                            <span className="text-xs font-medium">
                              {msg.role === 'user' ? 'You' : 'AI Assistant'}
                            </span>
                          </div>
                          <p>{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <p>Your messages will appear here</p>
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
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
            disabled={!pdfUrl || sendMessageMutation.isPending} 
          />
          <Button 
            type="submit" 
            disabled={!message.trim() || !pdfUrl || sendMessageMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}