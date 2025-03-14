import { useState, useEffect, useRef, useCallback } from "react";
import { TTSSettings, TTSQueueItem } from "../types/tts";

// Default TTS settings
const DEFAULT_TTS_SETTINGS: TTSSettings = {
  model: "Play3.0-mini",
  voice: "s3://voice-cloning-zero-shot/baf1ef41-36b6-428c-9bdf-50ba54682bd8/original/manifest.json", // Angelo
  quality: "medium",
  outputFormat: "mp3",
  speed: 1,
  sampleRate: 24000,
  language: "english",
  seed: null,
  temperature: null,
  voiceGuidance: null,
  styleGuidance: null,
  textGuidance: 1,
};

export function useTextToSpeech() {
  // State for playback, loading, error and the audio queue.
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queue, setQueue] = useState<TTSQueueItem[]>([]);
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);

  // Persistent audio element reference.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Store the current blob URL to revoke later.
  const currentBlobUrlRef = useRef<string | null>(null);

  // Cleanup function to revoke the current audio source if it's a blob URL.
  const cleanupAudioSrc = useCallback(() => {
    if (audioRef.current && currentBlobUrlRef.current) {
      if (audioRef.current.src.startsWith("blob:")) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current.src = "";
      currentBlobUrlRef.current = null;
    }
  }, []);

  // On mount: initialize the Audio element and attach event listeners only once.
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;

    const handleEnded = () => {
      // When the current audio finishes, mark playback as not playing
      // and remove the completed item from the queue.
      setIsPlaying(false);
      setQueue(prev => prev.slice(1));
    };

    const handleError = () => {
      setError("Audio playback error");
      setIsPlaying(false);
      setQueue(prev => prev.slice(1));
    };

    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    // Load saved settings from localStorage if available
    const savedSettings = localStorage.getItem('tts-settings');
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(parsedSettings);
      } catch (e) {
        console.error('Error parsing saved TTS settings', e);
        // Reset to defaults if there's an error
        localStorage.removeItem('tts-settings');
      }
    }

    return () => {
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      cleanupAudioSrc();
    };
  }, [cleanupAudioSrc]);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tts-settings', JSON.stringify(settings));
  }, [settings]);

  // Fetch the audio URL from the TTS API for the given text.
  const fetchAudioUrl = useCallback(async (text: string): Promise<string> => {
    // Prepare the request body with all settings
    const requestBody = {
      text,
      ...settings
    };
    
    const response = await fetch("/api/chat/tts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }, [settings]);

  // Play the current item from the queue.
  const playQueueItem = useCallback(
    async (item: TTSQueueItem) => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch the audio source from the API.
        const url = await fetchAudioUrl(item.text);
        // Clean up any previous audio blob URL.
        cleanupAudioSrc();
        if (audioRef.current) {
          audioRef.current.src = url;
          currentBlobUrlRef.current = url;
          // Optionally set additional properties such as volume or playback rate here.
          await audioRef.current.play();
          setIsPlaying(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message || "Failed to play audio");
        } else {
          setError("Failed to play audio");
        }
        // Remove the problematic item from the queue.
        setQueue(prev => prev.slice(1));
      } finally {
        setIsLoading(false);
      }
    },
    [cleanupAudioSrc, fetchAudioUrl]
  );

  // When not playing and the queue is non-empty, automatically start playing the first item.
  useEffect(() => {
    if (!isPlaying && queue.length > 0 && !isLoading) {
      playQueueItem(queue[0]);
    }
  }, [isPlaying, isLoading, queue, playQueueItem]);

  // Function to add a new text to the queue.
  // If nothing is playing, it will start immediately; otherwise, it will be queued.
  const playText = useCallback((text: string, isFullText: boolean = false) => {
    if (!text) return;
    const newItem: TTSQueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      text,
      isFullText
    };
    setQueue(prev => [...prev, newItem]);
  }, []);

  // Function to stop playback and clear the audio queue.
  const stopPlayback = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    cleanupAudioSrc();
    setIsPlaying(false);
    setQueue([]);
  }, [cleanupAudioSrc]);

  // Function to update TTS settings
  const updateSettings = useCallback((newSettings: Partial<TTSSettings>) => {
    setSettings(current => ({
      ...current,
      ...newSettings
    }));
  }, []);

  return {
    playText,
    stopPlayback,
    isPlaying,
    isLoading,
    error,
    queue,
    settings,
    updateSettings
  };
}
