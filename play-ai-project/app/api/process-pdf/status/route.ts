import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import ParsedContent from '@/lib/models/parsedContent';

/**
 * API endpoint to check the status of PDF processing
 * 
 * Returns the current processing state and parsed content if available.
 */
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
    
    // Create standardized response
    let result = {
      processed: false,
      processingState: chat.processingState || 'idle',
      status: 'pending',
      parsedContent: null,
      errorMessage: null,
      metadata: null
    };
    
    // Check if we have a parsedContentId, if so use that
    if (chat.parsedContentId) {
      const parsedContent = await ParsedContent.findById(chat.parsedContentId);
      
      if (parsedContent) {
        result = {
          processed: parsedContent.status === 'completed',
          processingState: chat.processingState || 'idle',
          status: parsedContent.status,
          parsedContent: parsedContent.status === 'completed' && parsedContent.result ? 
            JSON.parse(parsedContent.result) : null,
          errorMessage: parsedContent.errorMessage || null,
          metadata: parsedContent.metadata || null
        };
      }
    } 
    // Fallback to legacy field for backward compatibility
    else if (chat.parsedContent) {
      result = {
        processed: true,
        processingState: 'completed',
        status: 'completed',
        parsedContent: JSON.parse(chat.parsedContent),
        errorMessage: null,
        metadata: null
      };
    }
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking PDF processing status:', error);
    return NextResponse.json(
      { error: 'Failed to check PDF processing status' },
      { status: 500 }
    );
  }
}