import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import ParsedContent from '@/lib/models/parsedContent';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const chatId = params.id;
    
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

    // Check if we have a parsedContentId, if so use that
    if (chat.parsedContentId) {
      const parsedContent = await ParsedContent.findById(chat.parsedContentId);
      
      if (parsedContent) {
        return NextResponse.json({
          success: true,
          status: parsedContent.status,
          parsedContent: parsedContent.status === 'completed' && parsedContent.result ? 
            JSON.parse(parsedContent.result) : null,
          errorMessage: parsedContent.errorMessage || null,
          createdAt: parsedContent.createdAt,
          updatedAt: parsedContent.updatedAt,
          _id: parsedContent._id
        });
      }
    }
    
    // Fallback to legacy field for backward compatibility
    if (chat.parsedContent) {
      return NextResponse.json({
        success: true,
        status: 'completed',
        parsedContent: JSON.parse(chat.parsedContent),
        legacy: true
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'No parsed content found for this chat'
    }, { status: 404 });
    
  } catch (error) {
    console.error('Error fetching parsed content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch parsed content' },
      { status: 500 }
    );
  }
}