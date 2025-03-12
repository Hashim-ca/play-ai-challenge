'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  fetchChats, 
  fetchChatById, 
  createChat, 
  updateChat, 
  deleteChat,
  sendMessage
} from '@/lib/chatService';
import type { CreateChatParams, UpdateChatParams } from '@/lib/types/chat';

// Keys for React Query
export const queryKeys = {
  chats: 'chats',
  chat: (id: string) => ['chat', id],
};

// Hook for fetching all chats
export function useChats() {
  return useQuery({
    queryKey: [queryKeys.chats],
    queryFn: fetchChats,
  });
}

// Hook for fetching a single chat
export function useChat(id: string) {
  return useQuery({
    queryKey: queryKeys.chat(id),
    queryFn: () => fetchChatById(id),
    enabled: !!id,
  });
}

// Hook for creating a new chat
export function useCreateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: CreateChatParams) => createChat(params),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.chats] });
      queryClient.setQueryData(queryKeys.chat(newChat.id), newChat);
    },
  });
}

// Hook for updating a chat
export function useUpdateChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (params: UpdateChatParams) => updateChat(params),
    onSuccess: (updatedChat) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.chats] });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(updatedChat.id) });
    },
  });
}

// Hook for deleting a chat
export function useDeleteChat() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => deleteChat(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [queryKeys.chats] });
      queryClient.removeQueries({ queryKey: queryKeys.chat(id) });
    },
  });
}

// Hook for sending a message in a chat
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) => 
      sendMessage(chatId, message),
    onSuccess: (_, { chatId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
    },
  });
}