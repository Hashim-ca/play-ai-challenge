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

interface ChatProps {
  chat: ChatType
  onChatUpdate?: (updatedChat: ChatType) => void
}

export function Chat({ chat, onChatUpdate }: ChatProps) {
  const [message, setMessage] = useState("")
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showParsedContent, setShowParsedContent] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // React Query hooks
  const updateChatMutation = useUpdateChat()
  const sendMessageMutation = useSendMessage()

  // Helper function to fetch latest chat data
  const fetchChatUpdate = async () => {
    if (!chat?.id) return

    try {
      const response = await fetch(`/api/chat/${chat.id}`)
      if (response.ok) {
        const updatedChat = await response.json()
        if (onChatUpdate) {
          onChatUpdate(updatedChat)
        }
      }
    } catch (err) {
      console.error("Error fetching updated chat:", err)
    }
  }

  // PDF processing hook - with safe fallbacks for undefined chat
  const pdfProcessing = usePdfProcessing({
    chatId: chat?.id ?? "",
    pdfStorageUrl: chat?.pdfStorageUrl,
    initialState: chat?.processingState || "idle",
    onSuccess: () => {
      // Refresh chat data to get the updated parsedContentId
      fetchChatUpdate()
    },
    onError: (error) => {
      setError(`Failed to process PDF: ${error.message}`)
    },
  })

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      // Use a small timeout to ensure the DOM has updated
      const timer = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [chat?.messages])

  useEffect(() => {
    const loadPdf = async () => {
      if (chat?.pdfStorageUrl) {
        try {
          setLoading(true)
          const url = getPublicPdfUrl(chat.pdfStorageUrl)
          setPdfUrl(url)
        } catch (err) {
          console.error("Error loading PDF:", err)
          setError("Failed to load PDF")
        } finally {
          setLoading(false)
        }
      }
    }

    loadPdf()
  }, [chat?.pdfStorageUrl])

  // Handle case when chat is undefined
  if (!chat) {
    return (
      <Card className="h-full w-full flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <p className="text-muted-foreground">Chat not found or loading...</p>
        </CardContent>
      </Card>
    )
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !chat.id) return

    try {
      const trimmedMessage = message.trim()
      setMessage("")

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
        }
        onChatUpdate(optimisticChat)
      }

      // Send message to API
      await sendMessageMutation.mutateAsync({
        chatId: chat.id,
        message: trimmedMessage,
      })
    } catch (err) {
      console.error("Error sending message:", err)
      setError("Failed to send message")
    }
  }

  const handleFileUpload = async (key: string, fileName: string) => {
    try {
      // First, generate the URL for displaying the PDF
      const url = getPublicPdfUrl(key)
      setPdfUrl(url)

      // Update chat with PDF info and set initial processing state
      const updatedChat = await updateChatMutation.mutateAsync({
        id: chat.id,
        title: fileName.replace(/\.pdf$/i, ''), // Remove .pdf extension for cleaner name
        pdfStorageUrl: key,
        pdfFileName: fileName,
        processingState: "processing", // Set initial processing state
      })

      if (onChatUpdate) {
        onChatUpdate(updatedChat)
      }

      // After the chat is updated, start processing the PDF
      processPdf(key)
    } catch (err) {
      console.error("Error updating chat with PDF:", err)
      setError("Failed to update chat with PDF")
    }
  }

  const processPdf = async (pdfUrl: string) => {
    try {
      setError(null)

      // Extract the key if it's a proxy URL
      let urlToSend = pdfUrl
      if (pdfUrl.includes("/api/proxy/pdf?key=")) {
        const key = new URL(pdfUrl, "http://localhost").searchParams.get("key")
        if (key) {
          urlToSend = key
        }
      }

      // Update the PDF URL in the hook and start processing
      pdfProcessing.setPdfStorageUrl(urlToSend)
      pdfProcessing.startProcessing(urlToSend)
    } catch (err) {
      console.error("Error processing PDF:", err)
      setError(err instanceof Error ? err.message : "Failed to process PDF")
    }
  }

  const retryProcessing = () => {
    if (chat.pdfStorageUrl) {
      processPdf(chat.pdfStorageUrl)
    }
  }

  // Render upload prompt if no PDF
  if (!pdfUrl && !loading && !chat.pdfStorageUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-accent/30">
        <div className="max-w-md w-full bg-background rounded-lg shadow-sm p-8 text-center">
          <div className="mb-6 bg-primary/10 rounded-full p-4 w-16 h-16 flex items-center justify-center mx-auto">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Upload a Document</h2>
          <p className="text-muted-foreground mb-6">
            Upload a PDF document to start analyzing and chatting about its contents.
          </p>
          <FileUpload onUploadComplete={handleFileUpload} className="max-w-xs mx-auto" />
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <p className="text-muted-foreground">Loading PDF document...</p>
        </div>
      </div>
    )
  }

  // Error display
  if (error && !pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md text-center">
          <AlertCircle className="h-10 w-10 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">Error Loading Document</h3>
          <p>{error}</p>
          <Button variant="outline" className="mt-4" onClick={retryProcessing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Processing Overlay - only visible during processing */}
      <ProcessingOverlay
        state={pdfProcessing.processingState}
        errorMessage={pdfProcessing.errorMessage}
        metadata={pdfProcessing.metadata}
      />

      <Card className="h-full w-full flex flex-col border-0 rounded-none">
        <CardHeader className="border-b px-4 py-3 bg-background/95 backdrop-blur-sm sticky top-0 z-10 flex-none">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-medium truncate">{chat.pdfFileName || "Document Chat"}</h2>
            </div>
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
                      <span className="hidden sm:inline">{showParsedContent ? "Hide Analysis" : "View Analysis"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showParsedContent ? "Hide document analysis" : "View document analysis"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {pdfProcessing.isPending && (
            <div className="text-xs text-primary animate-pulse flex items-center mt-1">
              <Loader2 className="animate-spin h-3 w-3 mr-2" />
              Processing document...
            </div>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Parsed Content Viewer */}
          {showParsedContent ? (
            <div className="p-4 h-full">
              <ParsedContentViewer chatId={chat.id} onClose={() => setShowParsedContent(false)} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full">
              <TabsList className="mx-4 mt-2 justify-start bg-muted/50">
                <TabsTrigger value="split" className="text-xs">
                  Split View
                </TabsTrigger>
                <TabsTrigger value="chat" className="text-xs">
                  Chat Only
                </TabsTrigger>
                <TabsTrigger value="pdf" className="text-xs">
                  PDF Only
                </TabsTrigger>
              </TabsList>

              <TabsContent value="split" className="flex-1 overflow-hidden m-0 border-0 h-full">
                <div className="flex flex-1 h-full overflow-hidden">
                  {/* PDF Viewer */}
                  <div className="w-full h-full overflow-hidden">
                    <PDFViewer url={pdfUrl || ""} chatId={chat.id} isSplitView={true} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="chat" className="flex-1 overflow-hidden m-0 border-0 h-full">
                <ScrollArea className="h-full">
                  <div className="p-4 min-h-full">
                    {chat.messages && chat.messages.length > 0 ? (
                      <div className="space-y-4 max-w-3xl mx-auto">
                        {chat.messages.map((msg) => (
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
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <p>Your messages will appear here</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="pdf" className="flex-1 overflow-hidden m-0 border-0">
                {pdfUrl && (
                  <PDFViewer url={pdfUrl} chatId={chat.id} />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>

        <CardFooter className="border-t p-4 bg-background/95 backdrop-blur-sm flex-none">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2 w-full"
          >
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              disabled={!pdfUrl || sendMessageMutation.isPending || showParsedContent || pdfProcessing.isPending}
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
              {sendMessageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </form>
        </CardFooter>
      </Card>
    </>
  )
}
