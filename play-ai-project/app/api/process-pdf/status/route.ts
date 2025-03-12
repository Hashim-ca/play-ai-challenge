import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';

export async function GET(request: NextRequest) {
  try {
    const chatId = request.nextUrl.searchParams.get('chatId');
    
    if (!chatId) {
      return NextResponse.json(
        { error: 'Chat ID is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    // Find the chat
    const chat = await Chat.findOne({ id: chatId });
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      processed: Boolean(chat.parsedContent),
      parsedContent: chat.parsedContent ? JSON.parse(chat.parsedContent) : null
    });
  } catch (error) {
    console.error('Error checking PDF processing status:', error);
    return NextResponse.json(
      { error: 'Failed to check PDF processing status' },
      { status: 500 }
    );
  }
}