'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { PlusCircle, Edit, Trash2, Check, X, MoreHorizontal, Search, MessageSquare, Loader2 } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useChats, useCreateChat, useUpdateChat, useDeleteChat } from '@/lib/hooks/useChats';
import { Badge } from '@/components/ui/badge';

interface ChatListProps {
  onSelectChat?: () => void;
}

export default function ChatList({ onSelectChat }: ChatListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Local state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<string | null>(null);
  
  // React Query hooks
  const { 
    data: chats = [], 
    isLoading, 
    isError, 
    error 
  } = useChats();
  
  const createChatMutation = useCreateChat();
  const updateChatMutation = useUpdateChat();
  const deleteChatMutation = useDeleteChat();

  // Focus search input when pressing Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    if (searchQuery.trim() === '') {
      return chats;
    }
    return chats.filter((chat) => 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, chats]);

  const handleCreateChat = async () => {
    try {
      const newChat = await createChatMutation.mutateAsync({
        title: `New Chat ${new Date().toLocaleTimeString()}`,
      });
      
      router.push(`/chat/${newChat.id}`);
      if (onSelectChat) onSelectChat();
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  const confirmDeleteChat = (id: string) => {
    setChatToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteChat = async () => {
    if (!chatToDelete) return;

    try {
      await deleteChatMutation.mutateAsync(chatToDelete);
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const startEditing = (chat: { id: string; title: string }) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const saveTitle = async (id: string) => {
    if (!editTitle.trim()) return;

    try {
      await updateChatMutation.mutateAsync({
        id,
        title: editTitle,
      });
      
      setEditingId(null);
    } catch (err) {
      console.error('Failed to update chat title:', err);
    }
  };

  const navigateToChat = (chatId: string) => {
    router.push(`/chat/${chatId}`);
    if (onSelectChat) onSelectChat();
  };

  const renderSkeletons = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <div key={index} className="p-4 border-b">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        </div>
      ));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Chats</h2>
          <Button 
            onClick={handleCreateChat} 
            size="sm" 
            className="gap-1"
            disabled={createChatMutation.isPending}
          >
            {createChatMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="h-4 w-4" />
            )}
            <span>New</span>
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search chats... (⌘K)"
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
      </div>

      {isError && (
        <div className="p-4 m-2 text-sm bg-destructive/10 text-destructive rounded-md">
          {error?.toString() || 'Failed to load chats'}
        </div>
      )}

      <ScrollArea className="flex-1">
        {isLoading ? (
          renderSkeletons()
        ) : filteredChats.length === 0 ? (
          <div className="p-8 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-medium text-muted-foreground mb-1">No chats found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? 'Try a different search term' : 'Start a new conversation'}
            </p>
            {!searchQuery && (
              <Button 
                onClick={handleCreateChat} 
                size="sm"
                disabled={createChatMutation.isPending}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                New Chat
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredChats.map((chat) => {
              const isActive = pathname === `/chat/${chat.id}`;
              const hasPdf = Boolean(chat.pdfFileName);

              return (
                <div key={chat.id} className={cn('transition-colors', isActive ? 'bg-accent' : 'hover:bg-accent/50')}>
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
                        disabled={updateChatMutation.isPending}
                      />
                      <Button
                        onClick={() => saveTitle(chat.id)}
                        variant="ghost"
                        size="icon"
                        className="text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/30"
                        disabled={updateChatMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                        <span className="sr-only">Save</span>
                      </Button>
                      <Button 
                        onClick={cancelEditing} 
                        variant="ghost" 
                        size="icon"
                        disabled={updateChatMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Cancel</span>
                      </Button>
                    </div>
                  ) : (
                    <div className="group p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div 
                          className="flex-1 min-w-0 cursor-pointer" 
                          onClick={() => navigateToChat(chat.id)}
                        >
                          <div className="flex items-center gap-2">
                            <h3 className={cn('font-medium truncate', isActive && 'text-primary')}>
                              {chat.title}
                            </h3>
                            {hasPdf && (
                              <Badge variant="outline" className="text-xs">PDF</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {new Date(chat.updatedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => startEditing(chat)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => confirmDeleteChat(chat.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
              disabled={deleteChatMutation.isPending}
            >
              {deleteChatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
