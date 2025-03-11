import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

// Create S3 client
const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.NEXT_PUBLIC_S3_ENDPOINT || "https://7edd61f3351f4d16685af7f75e63b78d.r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.NEXT_PUBLIC_R2_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.NEXT_PUBLIC_R2_BUCKET_NAME || "play-ai";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  
  if (!key) {
    return NextResponse.json({ error: 'No key provided' }, { status: 400 });
  }
  
  try {
    // Get the file from S3/R2
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });
    
    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('No body in the response');
    }
    
    // Convert readable stream to ArrayBuffer
    const bytes = await response.Body.transformToByteArray();
    
    // Return the PDF with appropriate headers
    return new NextResponse(bytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=86400',
        // Add CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      }
    });
  } catch (error) {
    console.error('Error fetching PDF from S3:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      }
    );
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}