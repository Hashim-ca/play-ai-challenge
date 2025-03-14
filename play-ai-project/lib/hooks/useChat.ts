import { useState, useCallback, useEffect } from 'react';
import { useChatContext } from '../context/ChatContext';
import { ChatMessage } from '../types/chat';

export function useChat(chatId?: string) {
  const { messages, addMessage, clearMessages, isLoading, setIsLoading, setMessages } = useChatContext();
  const [error, setError] = useState<string | null>(null);

  // Fetch messages when chat ID changes
  useEffect(() => {
    if (chatId) {
      fetchMessages(chatId);
    } else {
      clearMessages();
    }
  }, [chatId]);

  // Function to fetch messages for a specific chat
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

  const sendMessage = useCallback(async (content: string) => {
    if (!chatId) {
      setError('No active chat');
      return;
    }

    try {
      setError(null);
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
      setIsLoading(false);
    }
  }, [chatId, addMessage, setIsLoading]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
    refreshMessages: chatId ? () => fetchMessages(chatId) : null,
  };
} 