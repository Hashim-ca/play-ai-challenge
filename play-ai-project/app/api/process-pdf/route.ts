export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import ParsedContent from '@/lib/models/parsedContent';
import { processPdfWithReducto } from '@/lib/utils/pdf-processor';

/**
 * API endpoint to process a PDF document with Reducto
 * 
 * Takes a chat ID and PDF storage URL, processes the document,
 * and stores the results in the ParsedContent collection.
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request
    const { chatId, pdfStorageUrl } = await request.json();
    
    if (!chatId || !pdfStorageUrl) {
      return NextResponse.json(
        { error: 'Chat ID and PDF storage URL are required' },
        { status: 400 }
      );
    }

    // Connect to database
    await connectToDatabase();

    // Find the chat
    const chat = await Chat.findOne({ id: chatId });
    if (!chat) {
      return NextResponse.json(
        { error: 'Chat not found' },
        { status: 404 }
      );
    }
    
    // Update chat to processing state
    chat.processingState = 'processing';
    await chat.save();
    
    try {
      // Process PDF with Reducto using our utility function
      const result = await processPdfWithReducto({ chatId, pdfStorageUrl });

      if (result.success && result.response) {
        const { response } = result;
        
        // Extract metadata if available
        const metadata = {
          pageCount: 0, // Default value
          documentType: 'pdf',
          processingTimeMs: 0 // Default value
        };
        
        // Extract page count if available using type guards
        if (response.result && 
            typeof response.result === 'object' && 
            'pages' in response.result && 
            Array.isArray(response.result.pages)) {
          metadata.pageCount = response.result.pages.length;
        }
        
        // Extract processing time if available
        if ('processing_time' in response && 
            typeof response.processing_time === 'number') {
          metadata.processingTimeMs = response.processing_time;
        }
        
        // Create a new ParsedContent document
        const parsedContent = new ParsedContent({
          chatId: chatId,
          jobId: 'job_id' in response ? response.job_id : null,
          result: JSON.stringify(response),
          status: 'completed',
          metadata
        });
        
        // Save the parsed content
        await parsedContent.save();
        
        // Update the chat with reference to the parsed content
        chat.parsedContentId = parsedContent._id;
        chat.processingState = 'completed';
        
        // For backward compatibility, also store in legacy field
        chat.parsedContent = JSON.stringify(response);
        await chat.save();
        
        return NextResponse.json({
          success: true,
          jobId: 'job_id' in response ? response.job_id : null,
          parsedContentId: parsedContent._id,
          pageCount: metadata.pageCount
        });
      } else {
        // Processing failed
        const errorMessage = result.error instanceof Error ? result.error.message : 'Unknown error';
        
        // Create a failed parsed content record
        const parsedContent = new ParsedContent({
          chatId: chatId,
          status: 'failed',
          errorMessage
        });
        
        await parsedContent.save();
        
        // Update chat status
        chat.processingState = 'failed';
        await chat.save();
        
        return NextResponse.json(
          { 
            error: 'Failed to process PDF with Reducto API',
            details: errorMessage 
          },
          { status: 500 }
        );
      }
    } catch (processingError) {
      console.error('Error in PDF processing:', processingError);
      
      // Update chat status
      chat.processingState = 'failed';
      await chat.save();
      
      // Create a failed record
      const parsedContent = new ParsedContent({
        chatId: chatId,
        status: 'failed',
        errorMessage: processingError instanceof Error ? processingError.message : 'Unknown error'
      });
      
      await parsedContent.save();
      
      return NextResponse.json(
        { error: 'Unexpected error processing PDF', details: processingError instanceof Error ? processingError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error handling process-pdf request:', error);
    return NextResponse.json(
      { error: 'Failed to handle PDF processing request' },
      { status: 500 }
    );
  }
}