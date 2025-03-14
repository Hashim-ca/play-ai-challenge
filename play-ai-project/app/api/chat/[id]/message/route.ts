import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import Message from '@/lib/models/message';

// POST /api/chat/[id]/message - Send a message to the chat
export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Safe access to params - await params to fix Next.js warning
    const { id } = await context.params;
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
    
    // Check if we have parsed PDF content to use in the response
    let parsedPdf = null;
    if (chat.parsedContent) {
      try {
        parsedPdf = JSON.parse(chat.parsedContent);
      } catch (e) {
        console.error('Error parsing chat.parsedContent:', e);
      }
    }
    
    // In a real implementation, you would send the user message to an AI service
    // along with the parsed PDF content
    
    // For now, we'll generate a response with PDF info if available
    let simulatedResponse = '';
    if (parsedPdf) {
      simulatedResponse = `This is a simulated response to: "${message}" with PDF data.`;
      // Add job ID if available
      if (parsedPdf.job_id) {
        simulatedResponse += ` (Job ID: ${parsedPdf.job_id})`;
      }
    } else {
      simulatedResponse = `This is a simulated response to: "${message}"`;
      if (chat.pdfStorageUrl) {
        simulatedResponse += " (PDF is still being processed by AI)";
      }
    }
    
    // Create the user message
    const userMessageId = uuidv4();
    const userMessage = new Message({
      id: userMessageId,
      chatId: id,
      content: message,
      role: 'user',
      timestamp: new Date(),
    });
    
    // Create the assistant message
    const assistantMessageId = uuidv4();
    const assistantMessage = new Message({
      id: assistantMessageId,
      chatId: id,
      content: simulatedResponse,
      role: 'assistant',
      timestamp: new Date(),
    });
    
    // Save both messages to the database
    await userMessage.save();
    await assistantMessage.save();
    
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