import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';

// GET /api/chat/[id] - Get a single chat by ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // Safe access to params
    const id = context.params.id;
    
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
    // Safe access to params
    const id = context.params.id;
    const body = await request.json();
    
    await connectToDatabase();
    
    const updatedChat = await Chat.findOneAndUpdate(
      { id },
      {
        ...(body.title && { title: body.title }),
        ...(body.pdfStorageUrl && { pdfStorageUrl: body.pdfStorageUrl }),
        ...(body.pdfFileName && { pdfFileName: body.pdfFileName }),
        ...(body.parsedContent && { parsedContent: body.parsedContent }),
        ...(body.audioInfo && { audioInfo: body.audioInfo }),
      },
      { new: true }
    );
    
    if (!updatedChat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
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
    // Safe access to params
    const id = context.params.id;
    
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