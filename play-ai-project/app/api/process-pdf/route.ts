export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getSignedPdfUrl } from '@/lib/s3';
import connectToDatabase from '@/lib/mongodb';
import Chat from '@/lib/models/chat';
import Reducto from 'reductoai';

// Reducto API endpoint
const reductoClient = new Reducto({
  apiKey: process.env.REDUCTO_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
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

    // Generate a signed URL for the PDF (valid for 1 hour)
    const s3Url = await getSignedPdfUrl(pdfStorageUrl);

    try {
      // Call the Reducto API directly with fetch instead of using the client library
      const response = await reductoClient.parse.run({ 
        document_url: s3Url, 
        options: {
          extraction_mode: 'hybrid',
          chunking: {
            chunk_mode: 'page'
          },
          filter_blocks: ['Discard', 'Comment']
        },
        advanced_options: {
          ocr_system: 'multilingual',
          keep_line_breaks: true,
          add_page_markers: true,
          table_output_format: 'dynamic',
          continue_hierarchy: true,
          remove_text_formatting: false,
          merge_tables: true,
          spreadsheet_table_clustering: 'default'
        }
      });


      console.log(response);

      
      // Store the API response directly in parsedContent
      chat.parsedContent = JSON.stringify(response);
      await chat.save();

      return NextResponse.json({
        success: true,
        jobId: response.job_id || null,
      });
    } catch (reductoError) {
      console.error('Error calling Reducto API:', reductoError);
      return NextResponse.json(
        { error: 'Failed to process PDF with Reducto API', details: reductoError instanceof Error ? reductoError.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF' },
      { status: 500 }
    );
  }
}