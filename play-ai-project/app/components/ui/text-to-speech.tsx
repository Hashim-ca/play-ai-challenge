"use client";

import { Play, Pause, ListMusic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTextToSpeech } from "@/lib/hooks/useTextToSpeech";
import { TTSSettingsDialog } from "./tts-settings";

interface TextToSpeechProps {
  text: string | null;
  fullText?: string | null;
}

export function TextToSpeech({ text, fullText }: TextToSpeechProps) {
  // Use our custom hook that encapsulates all the TTS logic.
  const { 
    playText, 
    stopPlayback, 
    isPlaying, 
    isLoading, 
    error, 
    queue, 
    settings,
    updateSettings
  } = useTextToSpeech();

  // Toggle playback for selected text.
  const handlePlaySelected = () => {
    if (!text) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      playText(text, false);
    }
  };

  // Toggle playback for full document.
  const handlePlayFull = () => {
    if (!fullText) return;
    if (isPlaying) {
      stopPlayback();
    } else {
      playText(fullText, true);
    }
  };

  // Get the name of the current voice
  const getVoiceName = () => {
    const voiceValue = settings.voice;
    const voices = [
      { name: 'Angelo', value: 's3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json' },
      { name: 'Deedee', value: 's3://voice-cloning-zero-shot/e040bd1b-f190-4bdb-83f0-75ef85b18f84/original/manifest.json' },
      { name: 'Jennifer', value: 's3://voice-cloning-zero-shot/801a663f-efd0-4254-98d0-5c175514c3e8/jennifer/manifest.json' },
      { name: 'Briggs', value: 's3://voice-cloning-zero-shot/71cdb799-1e03-41c6-8a05-f7cd55134b0b/original/manifest.json' },
      { name: 'Samara', value: 's3://voice-cloning-zero-shot/90217770-a480-4a91-b1ea-df00f4d4c29d/original/manifest.json' }
    ];
    
    const voice = voices.find(v => v.value === voiceValue);
    return voice ? voice.name : 'Voice';
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* Now Playing banner */}
      {isPlaying && (
        <div className="text-xs bg-primary/10 text-primary py-1.5 px-3 rounded-md mb-2 font-medium flex items-center gap-1.5 animate-pulse">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 5.5v13a.5.5 0 0 0 .812.39L17.223 12 8.812 5.11A.5.5 0 0 0 8 5.5z"
              fill="currentColor"
            />
          </svg>
          <span>Now Playing</span>
          <Badge variant="outline" className="ml-1 px-1.5 py-0 h-4 text-[10px]">
            {getVoiceName()} • {settings.speed}x
          </Badge>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 tts-controls">
        {/* Play/Pause for selected text */}
        <Button
          variant="outline"
          size="sm"
          onClick={handlePlaySelected}
          disabled={!text || isLoading}
          className="h-8 w-8 p-0"
          title={isLoading ? "Loading audio..." : isPlaying ? "Stop" : "Play"}
          aria-label={isLoading ? "Loading audio..." : isPlaying ? "Stop" : "Play"}
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        {/* Optionally, if fullText is provided, add a separate control */}
        {fullText && (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlayFull}
            disabled={!fullText || isLoading}
            className="text-xs h-8 flex items-center"
            title={isLoading ? "Loading audio..." : isPlaying ? "Stop" : "Read Full Document"}
            aria-label={isLoading ? "Loading audio..." : isPlaying ? "Stop" : "Read Full Document"}
          >
            {isLoading ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isPlaying ? "Stop" : "Read Full Document"}
          </Button>
        )}

        {/* TTS Settings Dialog */}
        <TTSSettingsDialog 
          settings={settings}
          onSettingsChange={updateSettings}
        />

        {/* Display queue status if there are queued items */}
        {queue.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 flex items-center gap-1 text-xs"
            title={`Audio queue (${queue.length} items)`}
            aria-label={`Audio queue (${queue.length} items)`}
          >
            <ListMusic className="h-3 w-3" />
            <span className="font-medium">{queue.length}</span>
          </Button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600" aria-live="assertive">
          {error}
        </div>
      )}
    </div>
  );
}
