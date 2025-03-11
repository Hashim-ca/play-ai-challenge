import { v4 as uuidv4 } from 'uuid';
import { Chat, CreateChatParams, UpdateChatParams } from './types/chat';

// Function to fetch all chats
export async function fetchChats(): Promise<Chat[]> {
  try {
    const response = await fetch('/api/chat', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chats');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }
}

// Function to fetch a single chat by ID
export async function fetchChatById(id: string): Promise<Chat> {
  try {
    const response = await fetch(`/api/chat/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch chat');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching chat:', error);
    throw error;
  }
}

// Function to create a new chat
export async function createChat(params: CreateChatParams): Promise<Chat> {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...params,
        id: uuidv4(), // Generate a unique ID for the chat
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create chat');
    }

    return response.json();
  } catch (error) {
    console.error('Error creating chat:', error);
    throw error;
  }
}

// Function to update an existing chat
export async function updateChat(params: UpdateChatParams): Promise<Chat> {
  try {
    const response = await fetch(`/api/chat/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error('Failed to update chat');
    }

    return response.json();
  } catch (error) {
    console.error('Error updating chat:', error);
    throw error;
  }
}

// Function to delete a chat
export async function deleteChat(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/chat/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to delete chat');
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
    throw error;
  }
} 