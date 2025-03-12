import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
    // Get text from request
    const { text } = await req.json();
    
    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Get API key from environment variable
    const apiKey = process.env.NEXT_PUBLIC_PLAY_AI_API_KEY;
    const userId = process.env.NEXT_PUBLIC_PLAY_AI_USER_ID;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Make request to PlayDialog API
    const options = {
      method: 'POST',
      headers: {
        'AUTHORIZATION': apiKey,
        'X-USER-ID': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "PlayDialog",
        text,
        voice: "s3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json",
        outputFormat: "mp3",
        speed: 1,
        sampleRate: 24000,
        language: "english"
      })
    };

    // Fetch from PlayDialog TTS API
    const response = await fetch('https://api.play.ai/api/v1/tts/stream', options as RequestInit);
    
    if (!response.ok) {
      console.error('PlayDialog API error:', response.status);
      return NextResponse.json(
        { error: `API Error: ${response.status}` },
        { status: response.status }
      );
    }

    // Get the binary audio data
    const audioData = await response.arrayBuffer();
    
    // Return the audio data with the correct content type
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error('Text-to-speech processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process text-to-speech request' },
      { status: 500 }
    );
  }
};