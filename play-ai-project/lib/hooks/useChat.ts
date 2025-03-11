import { useState, useCallback } from 'react';
import { useChatContext } from '../context/ChatContext';

export function useChat() {
  const { messages, addMessage, clearMessages, isLoading, setIsLoading } = useChatContext();
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    try {
      setError(null);
      setIsLoading(true);
      
      // Add user message immediately
      addMessage(content, 'user');

      // Here you can add your API call to get the assistant's response
      // For example:
      // const response = await fetch('/api/chat', {
      //   method: 'POST',
      //   body: JSON.stringify({ message: content }),
      // });
      // const data = await response.json();
      // addMessage(data.message, 'assistant');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, setIsLoading]);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error,
  };
} 