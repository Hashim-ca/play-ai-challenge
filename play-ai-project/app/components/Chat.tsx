"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, FileText, User, Bot, FileJson, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { FileUpload } from "./ui/file-upload"
import { PDFViewer } from "./ui/pdf-viewer"
import { ParsedContentViewer } from "./ui/parsed-content-viewer"
import { ProcessingOverlay } from "./ui/processing-overlay"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getPublicPdfUrl } from "@/lib/s3"
import type { Chat as ChatType, ChatMessage } from "@/lib/types/chat"
import { useUpdateChat, useSendMessage } from "@/lib/hooks/useChats"
import { usePdfProcessing } from "@/lib/hooks/usePdfProcessing"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { showNotification, announceToScreenReader } from "@/lib/utils/ui-helpers"
import { TextToSpeech } from "./ui/text-to-speech"

// Types
interface ChatProps {
  chat: ChatType | null
  onChatUpdate?: (updatedChat: ChatType) => void
}

// Sub-components
const NoChatSelected = () => (
  <Card className="h-full w-full flex flex-col">
    <CardContent className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-4">No Chat Selected</h3>
        <Button 
          onClick={() => window.location.href = '/chat/new'}
          className="flex items-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Create New Chat
        </Button>
      </div>
    </CardContent>
  </Card>
);

const UploadPrompt = ({ onUploadComplete }: { onUploadComplete: (key: string, fileName: string) => void }) => (
  <div className="h-full flex flex-col items-center justify-center p-6 bg-accent/30">
    <div className="max-w-md w-full bg-background rounded-lg shadow-sm p-8 text-center">
      <div className="mb-6 bg-primary/10 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
        <FileText className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Upload a Document</h2>
      <p className="text-muted-foreground mb-6">
        Upload a PDF document to start analyzing and chatting about its contents.
      </p>
      <FileUpload onUploadComplete={onUploadComplete} className="max-w-xs mx-auto" />
    </div>
  </div>
);

const LoadingState = () => (
  <div className="h-full flex items-center justify-center">
    <div className="flex flex-col items-center">
      <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground">Loading PDF document...</p>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }: { error: string, onRetry: () => void }) => (
  <div className="h-full flex items-center justify-center">
    <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center">
      <AlertCircle className="h-10 w-10 mx-auto mb-4" />
      <h3 className="font-semibold text-lg mb-2">Error Loading Document</h3>
      <p>{error}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  </div>
);

const MessageList = ({ 
  messages, 
  messagesEndRef 
}: { 
  messages: ChatMessage[], 
  messagesEndRef: React.RefObject<HTMLDivElement | null> 
}) => (
  <div className="space-y-4 max-w-3xl mx-auto">
    {messages.map((msg) => (
      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
        <div
          className={`max-w-[85%] p-3 rounded-lg ${
            msg.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
            <span className="text-xs font-medium">
              {msg.role === "user" ? "You" : "AI Assistant"}
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        </div>
      </div>
    ))}
    <div ref={messagesEndRef} />
  </div>
);

const ChatInput = ({ 
  message, 
  setMessage, 
  onSendMessage, 
  isDisabled 
}: { 
  message: string, 
  setMessage: (msg: string) => void, 
  onSendMessage: () => void, 
  isDisabled: boolean 
}) => {
  // Ensure isDisabled is always a boolean
  const disabled = isDisabled === true;
  
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSendMessage()
      }}
      className="flex items-center gap-2 w-full"
    >
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Type your message..."
        className="flex-1"
        disabled={disabled}
      />
      <Button
        type="submit"
        disabled={!message.trim() || disabled}
      >
        {disabled && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {!disabled && <Send className="h-4 w-4 mr-2" />}
        Send
      </Button>
    </form>
  );
};

// Main component
export function Chat({ chat, onChatUpdate }: ChatProps) {
  // State
  const [message, setMessage] = useState("")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParsedContent, setShowParsedContent] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("chat")
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Hooks
  const updateChatMutation = useUpdateChat()
  const sendMessageMutation = useSendMessage()
  
  // PDF processing hook with safe fallbacks
  const pdfProcessing = usePdfProcessing({
    chatId: chat?.id ?? "",
    pdfStorageUrl: chat?.pdfStorageUrl,
    initialState: chat?.processingState || "idle",
    onSuccess: handleProcessingSuccess,
    onError: (error) => {
      setError(`Failed to process PDF: ${error.message}`);
      showNotification(`Processing failed: ${error.message}`, 'error');
    },
  })

  // Helper functions
  function handleProcessingSuccess() {
    fetchChatUpdate();
    
    setTimeout(() => {
      const overlay = document.querySelector('.processing-overlay');
      if (overlay) overlay.classList.add('hidden');
      
      showNotification('Document processed successfully!', 'success');
      setShowParsedContent(true);
    }, 500);
  }

  async function fetchChatUpdate() {
    if (!chat?.id) return;

    try {
      const response = await fetch(`/api/chat/${chat.id}`);
      if (response.ok) {
        const updatedChat = await response.json();
        if (onChatUpdate) onChatUpdate(updatedChat);
      }
    } catch (err) {
      console.error("Error fetching updated chat:", err);
    }
  }

  async function handleSendMessage() {
    if (!message.trim() || !chat?.id) return;

    try {
      const trimmedMessage = message.trim();
      setMessage("");

      // Optimistically update UI
      if (onChatUpdate && chat.messages) {
        const optimisticChat = {
          ...chat,
          messages: [
            ...chat.messages,
            {
              id: "temp-user-id",
              content: trimmedMessage,
              role: "user",
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
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  }

  async function handleFileUpload(key: string, fileName: string) {
    try {
      // Update processing state
      if (typeof pdfProcessing.setPdfStorageUrl === 'function') {
        pdfProcessing.setPdfStorageUrl(key);
      }
      if (typeof pdfProcessing.setProcessingState === 'function') {
        pdfProcessing.setProcessingState('processing');
      }
      
      announceToScreenReader('PDF uploaded, now processing document...', 1000);
      
      // Generate URL for displaying PDF
      const url = getPublicPdfUrl(key);
      setPdfUrl(url);

      // Update chat with PDF info
      if (chat?.id) {
        const updatedChat = await updateChatMutation.mutateAsync({
          id: chat.id,
          title: fileName.replace(/\.pdf$/i, ''),
          pdfStorageUrl: key,
          pdfFileName: fileName,
          processingState: "processing",
        });

        if (onChatUpdate) {
          onChatUpdate(updatedChat);
        }
      }

      // Start processing after a small delay
      setTimeout(() => processPdf(url), 100);
    } catch (err) {
      console.error("Error updating chat with PDF:", err);
      setError("Failed to update chat with PDF");
    }
  }

  async function processPdf(pdfUrl: string) {
    try {
      setError(null);
      
      // Update processing state
      if (typeof pdfProcessing.setProcessingState === 'function') {
        pdfProcessing.setProcessingState('processing');
      }
      
      // Set appropriate view based on device
      setActiveTab(window.innerWidth < 768 ? "chat" : "split");
      setShowParsedContent(false);
      
      // Extract key if it's a proxy URL
      let urlToSend = pdfUrl;
      if (pdfUrl.includes("/api/proxy/pdf?key=")) {
        const key = new URL(pdfUrl, "http://localhost").searchParams.get("key");
        if (key) urlToSend = key;
      }

      // Show processing overlay
      const overlay = document.querySelector('.processing-overlay');
      if (overlay && overlay.classList.contains('hidden')) {
        overlay.classList.remove('hidden');
      }
      
      // Start processing
      if (typeof pdfProcessing.setPdfStorageUrl === 'function') {
        pdfProcessing.setPdfStorageUrl(urlToSend);
      }
      if (typeof pdfProcessing.startProcessing === 'function') {
        pdfProcessing.startProcessing(urlToSend);
      }
      
      announceToScreenReader('Document processing has started. Please wait.');
    } catch (err) {
      console.error("Error processing PDF:", err);
      setError(err instanceof Error ? err.message : "Failed to process PDF");
      
      if (typeof pdfProcessing.setProcessingState === 'function') {
        pdfProcessing.setProcessingState('failed');
      }
    }
  }

  function retryProcessing() {
    if (chat?.pdfStorageUrl) {
      if (typeof pdfProcessing.retry === 'function') {
        pdfProcessing.retry();
      } else {
        processPdf(chat.pdfStorageUrl);
      }
    }
  }

  // Effects
  useEffect(() => {
    if (messagesEndRef.current) {
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chat?.messages]);

  useEffect(() => {
    const loadPdf = async () => {
      if (chat?.pdfStorageUrl) {
        try {
          setLoading(true);
          const url = getPublicPdfUrl(chat.pdfStorageUrl);
          setPdfUrl(url);
        } catch (err) {
          console.error("Error loading PDF:", err);
          setError("Failed to load PDF");
        } finally {
          setLoading(false);
        }
      }
    };

    loadPdf();
  }, [chat?.pdfStorageUrl]);

  // Conditional rendering
  if (!chat) return <NoChatSelected />;
  if (!pdfUrl && !loading && !chat.pdfStorageUrl) return <UploadPrompt onUploadComplete={handleFileUpload} />;
  if (loading) return <LoadingState />;
  if (error && !pdfUrl) return <ErrorDisplay error={error} onRetry={retryProcessing} />;

  // Input disabled conditions
  const isInputDisabled = !pdfUrl || sendMessageMutation.isPending || showParsedContent || pdfProcessing.isPending || false;

  return (
    <>
      <ProcessingOverlay
        state={pdfProcessing.processingState}
        errorMessage={pdfProcessing.errorMessage}
        metadata={pdfProcessing.metadata}
      />

      <Card className="h-full w-full flex flex-col border-0 rounded-none">
        {/* Header */}
        <CardHeader className="border-b px-4 py-3 bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex-none">
          <div className="flex items-center justify-between">
            {(chat.parsedContentId || chat.parsedContent) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowParsedContent(!showParsedContent)}
                      className="flex items-center gap-1"
                      disabled={pdfProcessing.isPending}
                    >
                      <FileJson className="h-4 w-4" />
                      <span className="hidden sm:inline">{showParsedContent ? "Hide raw content" : "View raw content"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showParsedContent ? "Hide document analysis" : "View document analysis"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {pdfProcessing.isPending && (
              <div className="text-xs text-primary animate-pulse flex items-center">
                <Loader2 className="animate-spin h-3 w-3 mr-2" />
                Processing document...
              </div>
            )}
          </div>
        </CardHeader>

        {/* Content */}
        <CardContent className="flex-1 overflow-hidden p-0">
          {showParsedContent ? (
            <div className="p-4 h-full">
              <ParsedContentViewer chatId={chat.id} onClose={() => setShowParsedContent(false)} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="mx-4 mt-2 justify-start bg-muted/50">
                <TabsTrigger value="split" className="text-xs">Split View</TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">Chat Only</TabsTrigger>
                <TabsTrigger value="pdf" className="text-xs">PDF Only</TabsTrigger>
              </TabsList>

              <TabsContent value="split" className="flex-1 overflow-hidden m-0 border-0 h-full">
                <div className="flex flex-1 h-full overflow-hidden">
                  <div className="w-full h-full overflow-hidden">
                    <PDFViewer url={pdfUrl || ""} chatId={chat.id} isSplitView={true} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="flex-1 overflow-hidden m-0 border-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 min-h-full">
                    {chat.messages && chat.messages.length > 0 ? (
                      <MessageList messages={chat.messages} messagesEndRef={messagesEndRef} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Your messages will appear here</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pdf" className="flex-1 overflow-hidden m-0 border-0">
                {pdfUrl && <PDFViewer url={pdfUrl} chatId={chat.id} />}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        {/* Footer */}
        <CardFooter className="border-t p-4 bg-background/95 backdrop-blur-sm flex-none">
          <div className="w-full flex flex-col gap-3">
            <ChatInput 
              message={message}
              setMessage={setMessage}
              onSendMessage={handleSendMessage}
              isDisabled={isInputDisabled}
            />
            
            {chat.messages && chat.messages.length > 0 && (
              <div className="flex items-center justify-end">
                <TextToSpeech 
                  text={chat.messages[chat.messages.length - 1].content} 
                  fullText={chat.messages
                    .filter(msg => msg.role === "assistant")
                    .map(msg => msg.content)
                    .join('\n\n')}
                />
              </div>
            )}
          </div>
        </CardFooter>
      </Card>
    </>
  );
}
