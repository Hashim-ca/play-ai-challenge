'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, FileText, User, Bot, FileJson } from 'lucide-react';
import { FileUpload } from './ui/file-upload';
import { PDFViewer } from './ui/pdf-viewer';
import { ParsedContentViewer } from './ui/parsed-content-viewer';
import { ProcessingOverlay } from './ui/processing-overlay';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getPublicPdfUrl } from '@/lib/s3';
import { Chat as ChatType, ChatMessage } from '@/lib/types/chat';
import { useUpdateChat, useSendMessage } from '@/lib/hooks/useChats';
import { usePdfProcessing } from '@/lib/hooks/usePdfProcessing';

interface ChatProps {
  chat: ChatType;
  onChatUpdate?: (updatedChat: ChatType) => void;
}

export function Chat({ chat, onChatUpdate }: ChatProps) {
  const [message, setMessage] = useState('');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showParsedContent, setShowParsedContent] = useState(false);
  
  // React Query hooks
  const updateChatMutation = useUpdateChat();
  const sendMessageMutation = useSendMessage();
  
  // Helper function to fetch latest chat data
  const fetchChatUpdate = async () => {
    try {
      const response = await fetch(`/api/chat/${chat.id}`);
      if (response.ok) {
        const updatedChat = await response.json();
        if (onChatUpdate) {
          onChatUpdate(updatedChat);
        }
      }
    } catch (err) {
      console.error('Error fetching updated chat:', err);
    }
  };

  // PDF processing hook
  const pdfProcessing = usePdfProcessing({
    chatId: chat.id,
    pdfStorageUrl: chat.pdfStorageUrl,
    initialState: chat.processingState || 'idle',
    onSuccess: () => {
      // Refresh chat data to get the updated parsedContentId
      fetchChatUpdate();
    },
    onError: (error) => {
      setError(`Failed to process PDF: ${error.message}`);
    }
  });

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
      // First, generate the URL for displaying the PDF
      const url = getPublicPdfUrl(key);
      setPdfUrl(url);
      
      // Update chat with PDF info and set initial processing state
      const updatedChat = await updateChatMutation.mutateAsync({
        id: chat.id,
        pdfStorageUrl: key,
        pdfFileName: fileName,
        processingState: 'processing' // Set initial processing state
      });
      
      if (onChatUpdate) {
        onChatUpdate(updatedChat);
      }

      // After the chat is updated, start processing the PDF
      processPdf(key);
      
    } catch (err) {
      console.error('Error updating chat with PDF:', err);
      setError('Failed to update chat with PDF');
    }
  };
  
  const processPdf = async (pdfUrl: string) => {
    try {
      setError(null);
      
      // Extract the key if it's a proxy URL
      let urlToSend = pdfUrl;
      if (pdfUrl.includes('/api/proxy/pdf?key=')) {
        const key = new URL(pdfUrl, 'http://localhost').searchParams.get('key');
        if (key) {
          urlToSend = key;
        }
      }
      
      // Update the PDF URL in the hook and start processing
      pdfProcessing.setPdfStorageUrl(urlToSend);
      pdfProcessing.startProcessing(urlToSend);
      
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to process PDF');
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
    <>
      {/* Processing Overlay - only visible during processing */}
      <ProcessingOverlay 
        state={pdfProcessing.processingState}
        errorMessage={pdfProcessing.errorMessage}
        metadata={pdfProcessing.metadata}
      />
      
      <Card className="h-full w-full flex flex-col">
        <CardHeader className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{chat.title}</h2>
            {(chat.parsedContentId || chat.parsedContent) && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowParsedContent(!showParsedContent)}
                className="flex items-center gap-1"
                disabled={pdfProcessing.isPending}
              >
                <FileJson className="h-4 w-4" />
                {showParsedContent ? 'Hide Analysis' : 'View Analysis'}
              </Button>
            )}
          </div>
          {chat.pdfFileName && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-1" />
                {chat.pdfFileName}
              </div>
              {pdfProcessing.isPending && (
                <span className="text-xs text-primary animate-pulse flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing document...
                </span>
              )}
            </div>
          )}
        </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
        {/* Parsed Content Viewer */}
        {showParsedContent && (
          <div className="p-4">
            <ParsedContentViewer 
              chatId={chat.id} 
              onClose={() => setShowParsedContent(false)} 
            />
          </div>
        )}
        
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
        {pdfUrl && !showParsedContent && (
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
            disabled={
              !pdfUrl || 
              sendMessageMutation.isPending || 
              showParsedContent || 
              pdfProcessing.isPending
            } 
          />
          <Button 
            type="submit" 
            disabled={
              !message.trim() || 
              !pdfUrl || 
              sendMessageMutation.isPending || 
              showParsedContent || 
              pdfProcessing.isPending
            }
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
    </>
  );
}