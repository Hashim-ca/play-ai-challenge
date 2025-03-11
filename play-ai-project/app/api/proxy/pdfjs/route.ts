import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const pdfjsPath = url.searchParams.get('path');
  
  if (!pdfjsPath) {
    return NextResponse.json({ error: 'No path provided' }, { status: 400 });
  }
  
  try {
    const version = pdfjsPath.split('@')[1].split('/')[0];
    const file = pdfjsPath.split('/').pop();
    
    const response = await fetch(`https://unpkg.com/pdfjs-dist@${version}/build/${file}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch worker: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type') || 'application/javascript';
    const buffer = await response.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching PDF.js worker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch PDF.js worker' },
      { status: 500 }
    );
  }
}