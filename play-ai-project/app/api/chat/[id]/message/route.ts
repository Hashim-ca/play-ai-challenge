import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';

// POST /api/chat/[id]/message - Send a message to the chat
// @ts-ignore Next.js canary version has type issues with API route handlers
export async function POST(
  request: NextRequest,
  context: any
) {
  try {
    // Safe access to params
    const id = context.params.id;
    const { message } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the chat
    const chat = await Chat.findOne({ id });
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    // In a real implementation, you would:
    // 1. Process the PDF content
    // 2. Send the user message to an AI service
    // 3. Get the AI response
    
    // For now, we'll just simulate a response
    const simulatedResponse = `This is a simulated response to: "${message}"`;
    
    // Create the user message
    const userMessageId = uuidv4();
    const userMessage = {
      id: userMessageId,
      content: message,
      role: 'user',
      timestamp: new Date(),
    };
    
    // Create the assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage = {
      id: assistantMessageId,
      content: simulatedResponse,
      role: 'assistant',
      timestamp: new Date(),
    };
    
    // Add messages to the chat
    chat.messages.push(userMessage, assistantMessage);
    await chat.save();
    
    return NextResponse.json({ 
      response: simulatedResponse,
      userMessageId,
      assistantMessageId,
      chatId: id
    }, { status: 200 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}