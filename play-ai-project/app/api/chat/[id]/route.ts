import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import Message from '@/lib/models/message';

// GET /api/chat/[id] - Get a specific chat by ID
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    
    await connectToDatabase();
    
    // Find the chat
    const chat = await Chat.findOne({ id });
    
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    // Fetch messages for this chat
    const messages = await Message.find({ chatId: id })
      .sort({ timestamp: 1 })
      .lean();
    
    // Combine chat data with messages
    const chatData = chat.toObject();
    chatData.messages = messages;
    
    return NextResponse.json(chatData, { status: 200 });
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
    const { id } = await context.params;
    const body = await request.json();
    
    await connectToDatabase();
    
    // Find and update the chat
    const updatedChat = await Chat.findOneAndUpdate(
      { id },
      { $set: body },
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
    const { id } = await context.params;
    
    await connectToDatabase();
    
    // Find and delete the chat
    const deletedChat = await Chat.findOneAndDelete({ id });
    
    if (!deletedChat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    // Also delete all messages associated with this chat
    await Message.deleteMany({ chatId: id });
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: 'Failed to delete chat' },
      { status: 500 }
    );
  }
} 