import { NextRequest, NextResponse } from 'next/server';

export const POST = async (req: NextRequest) => {
  try {
    // Get parameters from request
    const body = await req.json();
    const { 
      text,
      model = 'Play3.0-mini',
      voice = 's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json',
      quality,
      outputFormat = 'mp3',
      speed,
      sampleRate,
      seed,
      temperature,
      voiceGuidance,
      styleGuidance,
      textGuidance,
      language = 'english'
    } = body;
    
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

    // Prepare the request payload with all optional parameters
    const payload: Record<string, string | number | boolean> = {
      model,
      text,
      voice,
      outputFormat,
      language
    };

    // Only add optional parameters if they have values
    if (quality) payload.quality = quality;
    if (speed !== undefined) payload.speed = speed;
    if (sampleRate) payload.sampleRate = sampleRate;
    if (seed !== null && seed !== undefined) payload.seed = seed;
    if (temperature !== null && temperature !== undefined) payload.temperature = temperature;
    if (voiceGuidance !== null && voiceGuidance !== undefined) payload.voiceGuidance = voiceGuidance;
    if (styleGuidance !== null && styleGuidance !== undefined) payload.styleGuidance = styleGuidance;
    if (textGuidance !== null && textGuidance !== undefined) payload.textGuidance = textGuidance;

    // Make request to PlayDialog API
    const options = {
      method: 'POST',
      headers: {
        'AUTHORIZATION': apiKey,
        'X-USER-ID': userId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    console.log('TTS request payload:', JSON.stringify(payload, null, 2));

    // Fetch from PlayDialog TTS API
    const response = await fetch('https://api.play.ai/api/v1/tts/stream', options as RequestInit);
    
    if (!response.ok) {
      console.error('PlayDialog API error:', response.status);
      let errorMessage = `API Error: ${response.status}`;
      
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // If we can't parse the error response, just use the status
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    // Get the binary audio data
    const audioData = await response.arrayBuffer();
    
    // Return the audio data with the correct content type
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': `audio/${outputFormat === 'mulaw' ? 'basic' : outputFormat}`,
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