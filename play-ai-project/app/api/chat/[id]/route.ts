import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';

// GET /api/chat/[id] - Get a single chat by ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Safe access to params - await params to fix Next.js warning
    const { id } = await context.params;
    
    await connectToDatabase();
    const chat = await Chat.findOne({ id });
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(chat, { status: 200 });
  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

// PUT /api/chat/[id] - Update a chat
export async function PUT(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Safe access to params - await params to fix Next.js warning
    const { id } = await context.params;
    const body = await request.json();
    
    await connectToDatabase();
    
    // Check if pdfStorageUrl is being updated
    const pdfUpdated = body.pdfStorageUrl ? true : false;
    
    // If PDF is updated, we should clear any existing parsed content
    const updateObj = {
      ...(body.title && { title: body.title }),
      ...(body.pdfStorageUrl && { pdfStorageUrl: body.pdfStorageUrl }),
      ...(body.pdfFileName && { pdfFileName: body.pdfFileName }),
      // Only use provided parsedContent if PDF isn't being updated
      ...(!pdfUpdated && body.parsedContent && { parsedContent: body.parsedContent }),
      // If PDF is updated, clear existing parsedContent
      ...(pdfUpdated && { parsedContent: null }),
      ...(body.audioInfo && { audioInfo: body.audioInfo }),
    };
    
    const updatedChat = await Chat.findOneAndUpdate(
      { id },
      updateObj,
      { new: true }
    );
    
    if (!updatedChat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    // If a new PDF was uploaded, trigger processing with Reducto API
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
            chatId: id,
            pdfStorageUrl: body.pdfStorageUrl,
          }),
        }).catch(err => {
          console.error('Error triggering PDF processing:', err);
          // Continue execution - non-blocking
        });
      } catch (processingError) {
        // Log error but don't fail chat update
        console.error('Error initiating PDF processing:', processingError);
      }
    }
    
    return NextResponse.json(updatedChat, { status: 200 });
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: 'Failed to update chat' },
      { status: 500 }
    );
  }
}

// DELETE /api/chat/[id] - Delete a chat
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Safe access to params - await params to fix Next.js warning
    const { id } = await context.params;
    
    await connectToDatabase();
    const deletedChat = await Chat.findOneAndDelete({ id });
    
    if (!deletedChat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Chat deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 