import { useState, useCallback, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { ChatMessage } from '../types/chat';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchChatById, sendMessage as sendMessageApi } from '../chatService';
import { queryKeys } from './useChats';

interface UseLegacyChatOptions {
  useReactQuery?: boolean;
}

/**
 * Enhanced chat hook that provides both React Query and legacy context support
 * 
 * This unified approach allows gradual migration to React Query while
 * maintaining compatibility with existing code
 */
export function useChat(chatId?: string, options: UseLegacyChatOptions = {}) {
  const { useReactQuery = false } = options;
  const queryClient = useQueryClient();
  
  // Legacy context access
  const { 
    messages, 
    addMessage, 
    clearMessages, 
    isLoading, 
    setIsLoading, 
    setMessages 
  } = useChatContext();
  
  const [error, setError] = useState<string | null>(null);

  // React Query mutation for sending messages
  const sendMessageMutation = useMutation({
    mutationFn: ({ chatId, message }: { chatId: string; message: string }) => 
      sendMessageApi(chatId, message),
    onSuccess: (_, { chatId }) => {
      // Invalidate chat queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.chat(chatId) });
      
      // If using legacy context, we need to fetch messages manually
      if (!useReactQuery && chatId) {
        fetchMessages(chatId);
      }
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  });

  // Fetch messages when chat ID changes (for legacy context mode)
  useEffect(() => {
    if (!useReactQuery) {
      if (chatId) {
        fetchMessages(chatId);
      } else {
        clearMessages();
      }
    }
  }, [chatId, useReactQuery]);

  // Function to fetch messages for a specific chat (legacy)
  const fetchMessages = async (chatId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/chat/${chatId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      console.error('Error fetching messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Unified sendMessage function that works with both approaches
  const sendMessage = useCallback(async (content: string) => {
    if (!chatId) {
      setError('No active chat');
      return;
    }

    try {
      setError(null);
      
      if (useReactQuery) {
        // For React Query mode, use the mutation
        // Add optimistic update if needed in the future
        return sendMessageMutation.mutate({ chatId, message: content });
      }
      
      // Legacy approach
      setIsLoading(true);
      
      // Add user message immediately for UI feedback
      const tempUserMessage: ChatMessage = {
        id: 'temp-' + Date.now(),
        content,
        role: 'user',
        timestamp: new Date()
      };
      addMessage(tempUserMessage);

      // Send message to API
      const response = await fetch(`/api/chat/${chatId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Refresh messages from server to get accurate data
      await fetchMessages(chatId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      if (!useReactQuery) {
        setIsLoading(false);
      }
    }
  }, [chatId, addMessage, setIsLoading, useReactQuery, sendMessageMutation]);

  // Return different interfaces based on the mode
  if (useReactQuery) {
    return {
      sendMessage,
      isLoading: sendMessageMutation.isPending,
      error: error || (sendMessageMutation.error ? String(sendMessageMutation.error) : null),
    };
  }

  // Legacy interface
  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    refreshMessages: chatId ? () => fetchMessages(chatId) : null,
  };
}