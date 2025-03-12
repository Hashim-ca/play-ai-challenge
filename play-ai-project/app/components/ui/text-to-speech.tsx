"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TextToSpeechProps {
  text: string | null
  apiKey?: string
  fullText?: string | null
}

export function TextToSpeech({ text, apiKey, fullText }: TextToSpeechProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPlayingFullText, setIsPlayingFullText] = useState(false)
  // Add a ref to track the current selected text for cancellation purposes
  const currentTextRef = useRef<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null)
  
  useEffect(() => {
    // Clean up audio on unmount
    return () => {
      // Abort any in-progress requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      
      // Clean up audio element and release memory
      if (audioRef.current) {
        audioRef.current.pause()
        
        // Revoke any blob URLs
        if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
          URL.revokeObjectURL(audioRef.current.src)
        }
        
        audioRef.current.src = ""
        
        // Remove event listeners
        audioRef.current.onended = null
        audioRef.current.onerror = null
      }
    }
  }, [])

  // Text change handler with lock protection
  useEffect(() => {
    // If we're currently loading or playing, don't reset immediately
    if (isLoading) {
      return; // Don't interrupt an in-progress load
    }
    
    // Safely clean up any existing audio
    if (audioRef.current) {
      audioRef.current.pause()
      
      // Clear any previous audio blob URLs to prevent memory leaks
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src)
      }
      
      audioRef.current.src = ""
      setIsPlaying(false)
      setIsPlayingFullText(false)
    }
  }, [text, isLoading])

  const playAudio = async (playFullText: boolean = false) => {
    const contentToPlay = playFullText ? fullText : text
    
    if (!contentToPlay) return
    
    try {
      // Save the current text we're processing
      currentTextRef.current = contentToPlay
      
      // Indicate loading state
      setIsLoading(true)
      setError(null)
      setIsPlayingFullText(playFullText)
      
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      // Create a new abort controller for this request
      abortControllerRef.current = new AbortController()
      const signal = abortControllerRef.current.signal
      
      // Clean up any existing audio
      if (audioRef.current) {
        // Remove old event listeners to prevent memory leaks
        const oldAudio = audioRef.current
        const clonedListeners = oldAudio.cloneNode(false) // Clone without listeners
        oldAudio.pause()
        
        if (oldAudio.src && oldAudio.src.startsWith('blob:')) {
          URL.revokeObjectURL(oldAudio.src)
        }
        
        // Create a fresh audio element to avoid stale event handlers
        audioRef.current = new Audio()
      } else {
        audioRef.current = new Audio()
      }
      
      // Add event listeners to the new audio element
      audioRef.current.addEventListener('ended', () => {
        setIsPlaying(false)
        setIsPlayingFullText(false)
      })
      
      audioRef.current.addEventListener('error', (e) => {
        // Only show error if it's not due to intentional cancellation
        if (!signal.aborted) {
          console.error('Audio playback error:', e)
          setError('Failed to play audio')
          setIsPlaying(false)
          setIsPlayingFullText(false)
          setIsLoading(false)
        }
      })
      
      // Check if the request has been aborted or the text has changed
      if (signal.aborted || currentTextRef.current !== contentToPlay) {
        throw new Error('Request cancelled - selection changed')
      }
      
      // Create audio stream from API with abort signal
      const response = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: contentToPlay }),
        signal, // Add the abort signal
      })
      
      // Check again if the request has been aborted or the text has changed
      if (signal.aborted || currentTextRef.current !== contentToPlay) {
        throw new Error('Request cancelled - selection changed')
      }
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }
      
      // Get blob from response
      const blob = await response.blob()
      
      // Final check before playing
      if (signal.aborted || currentTextRef.current !== contentToPlay) {
        throw new Error('Request cancelled - selection changed')
      }
      
      const url = URL.createObjectURL(blob)
      
      // Set audio source and play
      audioRef.current.src = url
      audioRef.current.muted = isMuted
      
      // Play audio - wrap in try/catch since play() can fail
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (playError) {
        console.error('Play error:', playError)
        // This is likely a user interaction issue - browsers require user gesture to play audio
        setError('Could not play audio. Try clicking play again.')
        throw playError
      } finally {
        setIsLoading(false)
      }
    } catch (err) {
      // Don't show errors for intentional cancellations
      if (err instanceof Error && err.message.includes('cancelled')) {
        console.log('Request cancelled:', err.message)
      } else {
        console.error('Text-to-speech error:', err)
        setError(err instanceof Error ? err.message : 'Failed to get audio')
      }
      
      setIsPlaying(false)
      setIsPlayingFullText(false)
      setIsLoading(false)
    }
  }

  const togglePlay = async (playFullText: boolean = false) => {
    // If we're already loading, prevent multiple requests
    if (isLoading) {
      // If user clicks same button during loading, cancel the request
      if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
        abortControllerRef.current.abort()
        setIsLoading(false)
        setError(null)
      }
      return
    }
    
    // If we're already playing full text and trying to play selected text, or vice versa,
    // we need to stop the current playback and start a new one
    if ((isPlayingFullText && !playFullText) || (!isPlayingFullText && playFullText)) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      
      // Cancel any in-flight requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      
      await playAudio(playFullText)
      return
    }
    
    // If audio hasn't been loaded yet, or if it's a new selection
    if (!audioRef.current || !audioRef.current.src) {
      await playAudio(playFullText)
      return
    }
    
    // If we already have audio loaded and just need to play/pause
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Error resuming playback:', err)
        setError('Failed to resume playback. Try again.')
      }
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

  // Calculate if the current text matches what's being played
  const isCurrentTextPlaying = text === currentTextRef.current && isPlaying && !isPlayingFullText
  const isFullTextPlaying = isPlaying && isPlayingFullText
  
  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => togglePlay(false)}
          disabled={!text || (isLoading && isPlayingFullText)}
          className={`h-8 w-8 p-0 ${isLoading && !isPlayingFullText ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
          title={isLoading && !isPlayingFullText ? "Loading audio..." : isCurrentTextPlaying ? "Pause" : "Play"}
        >
          {isLoading && !isPlayingFullText ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isCurrentTextPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="sr-only">{isCurrentTextPlaying ? "Pause" : "Play"}</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMute}
          disabled={isLoading || (!isPlaying && !audioRef.current?.src)}
          className="h-8 w-8 p-0"
          title={isMuted ? "Unmute" : "Mute"}
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
      
      {fullText && (
        <div className="flex items-center mt-1">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => togglePlay(true)}
            disabled={!fullText || (isLoading && !isPlayingFullText)} 
            className={`text-xs h-8 flex items-center ${isLoading && isPlayingFullText ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
            title={isLoading && isPlayingFullText ? "Loading audio..." : isFullTextPlaying ? "Pause" : "Read Full Document"}
          >
            {isLoading && isPlayingFullText ? (
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : isFullTextPlaying ? (
              <Pause className="h-4 w-4 mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isFullTextPlaying ? "Pause Full Document" : "Read Full Document"}
          </Button>
        </div>
      )}
      
      {/* Status indicator */}
      {isLoading && (
        <div className="text-xs text-muted-foreground mt-1">
          Loading audio... {isPlayingFullText ? "(full document)" : "(selected text)"}
        </div>
      )}
    </div>
  )
}