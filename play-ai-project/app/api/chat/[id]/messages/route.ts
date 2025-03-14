import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Message from '@/lib/models/message';

// GET /api/chat/[id]/messages - Get all messages for a chat
// @ts-ignore Next.js canary version has type issues with API route handlers
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    
    // Pagination parameters
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    
    await connectToDatabase();
    
    // Get total count for pagination
    const total = await Message.countDocuments({ chatId: id });
    
    // Fetch messages with pagination
    const messages = await Message.find({ chatId: id })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .lean();
    
    return NextResponse.json({
      messages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
} 