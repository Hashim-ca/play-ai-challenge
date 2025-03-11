'use client';

import { useState, useEffect } from 'react';
import { fetchChats, createChat, deleteChat, updateChat } from '@/lib/chatService';
import { Chat } from '@/lib/types/chat';
import { PlusCircle, Edit, Trash2, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function ChatList() {
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Load chats on component mount
  useEffect(() => {
    const loadChats = async () => {
      try {
        setLoading(true);
        const fetchedChats = await fetchChats();
        setChats(fetchedChats);
        setError(null);
      } catch (err) {
        setError('Failed to load chats');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, []);

  const handleCreateChat = async () => {
    try {
      const newChat = await createChat({
        title: `New Chat ${new Date().toLocaleString()}`,
      });
      setChats((prevChats) => [newChat, ...prevChats]);
    } catch (err) {
      setError('Failed to create new chat');
      console.error(err);
    }
  };

  const handleDeleteChat = async (id: string) => {
    try {
      await deleteChat(id);
      setChats((prevChats) => prevChats.filter((chat) => chat.id !== id));
    } catch (err) {
      setError('Failed to delete chat');
      console.error(err);
    }
  };

  const startEditing = (chat: Chat) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveTitle = async (id: string) => {
    if (!editTitle.trim()) {
      return;
    }

    try {
      const updatedChat = await updateChat({
        id,
        title: editTitle,
      });

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === id ? { ...chat, title: updatedChat.title } : chat
        )
      );
      setEditingId(null);
    } catch (err) {
      setError('Failed to update chat title');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading chats...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background border-r">
      <div className="p-4 border-b">
        <Button
          onClick={handleCreateChat}
          className="w-full"
          size="sm"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            No chats yet. Create your first chat!
          </div>
        ) : (
          <div className="divide-y divide-border">
            {chats.map((chat) => (
              <Card key={chat.id} className="rounded-none border-0 shadow-none">
                {editingId === chat.id ? (
                  <div className="p-4 flex items-center gap-2">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveTitle(chat.id);
                        } else if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                    />
                    <Button
                      onClick={() => saveTitle(chat.id)}
                      variant="ghost"
                      size="icon"
                      className="text-green-500 hover:text-green-600 hover:bg-green-50"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={cancelEditing}
                      variant="ghost"
                      size="icon"
                      className="text-gray-500 hover:text-gray-600 hover:bg-gray-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <CardContent 
                    className="p-0 cursor-pointer hover:bg-accent/50"
                    onClick={() => router.push(`/chat/${chat.id}`)}
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{chat.title}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {new Date(chat.updatedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            startEditing(chat);
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-primary"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteChat(chat.id);
                          }}
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 