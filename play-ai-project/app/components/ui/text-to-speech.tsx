"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TextToSpeechProps {
  text: string | null
  apiKey?: string
}

export function TextToSpeech({ text, apiKey }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  
  useEffect(() => {
    // Clean up audio on unmount
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ""
      }
    }
  }, [])

  // Reset audio when text changes
  useEffect(() => {
    if (audioRef.current && isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [text])

  const playAudio = async () => {
    if (!text) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Create or get audio element
      if (!audioRef.current) {
        audioRef.current = new Audio()
        
        // Add event listeners
        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false)
        })
        
        audioRef.current.addEventListener('error', (e) => {
          console.error('Audio playback error:', e)
          setError('Failed to play audio')
          setIsPlaying(false)
          setIsLoading(false)
        })
      }
      
      // Create audio stream from API
      const response = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      })
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      // Get blob from response
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      // Set audio source and play
      audioRef.current.src = url
      audioRef.current.muted = isMuted
      
      // Play audio
      await audioRef.current.play()
      setIsPlaying(true)
      setIsLoading(false)
    } catch (err) {
      console.error('Text-to-speech error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get audio')
      setIsPlaying(false)
      setIsLoading(false)
    }
  }

  const togglePlay = async () => {
    if (!audioRef.current || !audioRef.current.src) {
      await playAudio()
      return
    }
    
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      await audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted
    }
    setIsMuted(!isMuted)
  }

  if (!text) {
    return null
  }

  return (
    <div className="flex items-center gap-2 mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={togglePlay}
        disabled={isLoading || !text}
        className="h-8 w-8 p-0"
      >
        {isLoading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        <span className="sr-only">{isPlaying ? "Pause" : "Play"}</span>
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleMute}
        disabled={isLoading || (!isPlaying && !audioRef.current?.src)}
        className="h-8 w-8 p-0"
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
        <span className="sr-only">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>
      
      {error && (
        <span className="text-xs text-destructive">{error}</span>
      )}
    </div>
  )
}