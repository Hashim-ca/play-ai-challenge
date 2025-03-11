'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchChatById, updateChat } from '@/lib/chatService';
import { Chat } from '@/lib/types/chat';
import { Edit, Check, X, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadChat = async () => {
      try {
        setLoading(true);
        const fetchedChat = await fetchChatById(chatId);
        setChat(fetchedChat);
        setEditTitle(fetchedChat.title);
        setError(null);
      } catch (err) {
        setError('Failed to load chat');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (chatId) {
      loadChat();
    }
  }, [chatId]);

  const startEditingTitle = () => {
    setIsEditingTitle(true);
  };

  const cancelEditingTitle = () => {
    setIsEditingTitle(false);
    if (chat) {
      setEditTitle(chat.title);
    }
  };

  const saveTitle = async () => {
    if (!editTitle.trim() || !chat) {
      return;
    }

    try {
      const updatedChat = await updateChat({
        id: chatId,
        title: editTitle,
      });
      setChat(updatedChat);
      setIsEditingTitle(false);
    } catch (err) {
      setError('Failed to update chat title');
      console.error(err);
    }
  };

  const handleSendMessage = () => {
    // TODO: Implement message sending
    console.log('Sending message:', message);
    setMessage('');
  };

  if (loading) {
    return <div className="p-4">Loading chat...</div>;
  }

  if (error || !chat) {
    return <div className="p-4 text-destructive">{error || 'Chat not found'}</div>;
  }

  return (
    <Card className="h-full flex flex-col rounded-none border-0">
      <CardHeader className="border-b px-4 py-3 space-y-0">
        {isEditingTitle ? (
          <div className="flex items-center gap-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="flex-1"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveTitle();
                } else if (e.key === 'Escape') {
                  cancelEditingTitle();
                }
              }}
            />
            <Button
              onClick={saveTitle}
              variant="ghost"
              size="icon"
              className="text-green-500 hover:text-green-600 hover:bg-green-50"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              onClick={cancelEditingTitle}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">{chat.title}</h1>
            <Button
              onClick={startEditingTitle}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-y-auto p-4">
        {chat.parsedContent ? (
          <div className="whitespace-pre-wrap">{chat.parsedContent}</div>
        ) : (
          <div className="text-center text-muted-foreground mt-10">
            No content available for this chat.
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
          />
          <Button type="submit" disabled={!message.trim()}>
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 