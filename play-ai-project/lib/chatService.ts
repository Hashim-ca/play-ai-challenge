import { v4 as uuidv4 } from 'uuid';
import { Chat, CreateChatParams, UpdateChatParams } from './types/chat';

/**
 * Base API client function to reduce duplication
 */
async function apiClient<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  errorMessage: string = 'API request failed'
): Promise<T> {
  try {
    // Set default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Try to get more detailed error message from the response
      try {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || `${errorMessage} (${response.status})`);
      } catch (e) {
        // If parsing fails, throw generic error with status code
        throw new Error(`${errorMessage} (${response.status})`);
      }
    }

    // For DELETE requests which may not return content
    if (response.status === 204 || options.method === 'DELETE') {
      return {} as T;
    }

    return response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
}

// Function to fetch all chats
export async function fetchChats(): Promise<Chat[]> {
  return apiClient<Chat[]>('/api/chat', {
    method: 'GET',
  }, 'Failed to fetch chats');
}

// Function to fetch a single chat by ID
export async function fetchChatById(id: string): Promise<Chat> {
  return apiClient<Chat>(`/api/chat/${id}`, {
    method: 'GET',
  }, 'Failed to fetch chat');
}

// Function to create a new chat
export async function createChat(params: CreateChatParams): Promise<Chat> {
  return apiClient<Chat>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      id: uuidv4(), // Generate a unique ID for the chat
    }),
  }, 'Failed to create chat');
}

// Function to update an existing chat
export async function updateChat(params: UpdateChatParams): Promise<Chat> {
  return apiClient<Chat>(`/api/chat/${params.id}`, {
    method: 'PUT',
    body: JSON.stringify(params),
  }, 'Failed to update chat');
}

// Function to delete a chat
export async function deleteChat(id: string): Promise<void> {
  return apiClient<void>(`/api/chat/${id}`, {
    method: 'DELETE',
  }, 'Failed to delete chat');
}

// Function to send a message to the chat
export async function sendMessage(chatId: string, message: string): Promise<{ response: string }> {
  return apiClient<{ response: string }>(`/api/chat/${chatId}/message`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  }, 'Failed to send message');
} 