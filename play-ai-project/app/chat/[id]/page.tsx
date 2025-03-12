'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Edit, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader } from "@/components/ui/card";
import { Chat } from '@/app/components/Chat';
import { useChat, useUpdateChat } from '@/lib/hooks/useChats';
import { Skeleton } from "@/components/ui/skeleton";

export default function ChatPage() {
  const params = useParams();
  const chatId = params.id as string;
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  
  // React Query hooks
  const { 
    data: chat, 
    isLoading, 
    isError, 
    error
  } = useChat(chatId);
  
  const updateChatMutation = useUpdateChat();

  // Initialize title when chat data is loaded
  if (chat && editTitle === '' && !isEditingTitle) {
    setEditTitle(chat.title);
  }

  const startEditingTitle = () => {
    if (chat) {
      setEditTitle(chat.title);
    }
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
      await updateChatMutation.mutateAsync({
        id: chatId,
        title: editTitle,
      });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update chat title:', err);
    }
  };

  if (isLoading) {
    return (
      <Card className="h-full flex flex-col rounded-none border-0">
        <CardHeader className="border-b px-4 py-3 space-y-0">
          <Skeleton className="h-8 w-64" />
        </CardHeader>
        <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full max-w-md" />
        </div>
      </Card>
    );
  }

  if (isError || !chat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-destructive/10 text-destructive p-6 rounded-lg max-w-md">
          <h3 className="font-semibold text-lg mb-2">Error Loading Chat</h3>
          <p>{error?.toString() || 'Chat not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col rounded-none border-0">
      <CardHeader className="border-b px-4 py-3 space-y-0 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
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
              disabled={updateChatMutation.isPending}
            />
            <Button
              onClick={saveTitle}
              variant="ghost"
              size="icon"
              className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
              disabled={updateChatMutation.isPending}
            >
              <Check className="h-4 w-4" />
              <span className="sr-only">Save</span>
            </Button>
            <Button
              onClick={cancelEditingTitle}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
              disabled={updateChatMutation.isPending}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Cancel</span>
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold truncate">{chat.title}</h1>
            <Button
              onClick={startEditingTitle}
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit title</span>
            </Button>
          </div>
        )}
      </CardHeader>
      
      <div className="flex-1 overflow-hidden">
        <Chat chat={chat} />
      </div>
    </Card>
  );
}
