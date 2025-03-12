import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';

// GET /api/chat - Get all chats
export async function GET() {
  try {
    await connectToDatabase();
    const chats = await Chat.find({}).sort({ updatedAt: -1 });
    
    return NextResponse.json(chats, { status: 200 });
  } catch (error) {
    console.error('Error fetching chats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    );
  }
}

// POST /api/chat - Create a new chat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    await connectToDatabase();
    
    const newChat = new Chat({
      id: body.id,
      title: body.title,
      pdfStorageUrl: body.pdfStorageUrl,
      pdfFileName: body.pdfFileName,
      parsedContent: body.parsedContent,
      audioInfo: body.audioInfo,
    });
    
    await newChat.save();
    
    // If a PDF was uploaded, trigger processing with Reducto API
    if (body.pdfStorageUrl) {
      try {
        // Use absolute URL for internal API call
        const url = new URL('/api/process-pdf', request.nextUrl.origin);
        
        // Fire and forget - don't await the response
        fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chatId: body.id,
            pdfStorageUrl: body.pdfStorageUrl,
          }),
        }).catch(err => {
          console.error('Error triggering PDF processing:', err);
          // Continue execution - non-blocking
        });
      } catch (processingError) {
        // Log error but don't fail chat creation
        console.error('Error initiating PDF processing:', processingError);
      }
    }
    
    return NextResponse.json(newChat, { status: 201 });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    );
  }
} 