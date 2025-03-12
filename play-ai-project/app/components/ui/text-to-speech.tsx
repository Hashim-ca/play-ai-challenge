"use client"

import { useState, useEffect, useRef } from "react"
import { Play, Pause, Volume2, VolumeX, ListMusic } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TextToSpeechProps {
  text: string | null
  apiKey?: string
  fullText?: string | null
}

interface QueueItem {
  text: string
  isFullText: boolean
  id: string  // Add unique ID for each queue item
  addedAt: number  // Add timestamp for sorting
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
  // Queue for audio requests
  const [audioQueue, setAudioQueue] = useState<QueueItem[]>([])
  const [queueProcessing, setQueueProcessing] = useState(false)
  const [queueNotification, setQueueNotification] = useState<string | null>(null)
  const [showQueueDetails, setShowQueueDetails] = useState(false)
  
  useEffect(() => {
    // Clean up audio on unmount
    return () => {
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
    if (audioRef.current && !isPlaying) {
      audioRef.current.pause()
      
      // Clear any previous audio blob URLs to prevent memory leaks
      if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioRef.current.src)
      }
      
      audioRef.current.src = ""
      setIsPlaying(false)
      setIsPlayingFullText(false)
    }
  }, [text, isLoading, isPlaying])

  // Process the audio queue
  useEffect(() => {
    let isMounted = true;
    
    const processQueue = async () => {
      if (audioQueue.length > 0 && !queueProcessing && !isPlaying && isMounted) {
        setQueueProcessing(true)
        const nextItem = audioQueue[0]
        
        try {
          await playAudio(nextItem.isFullText)
          // Remove the processed item from the queue
          if (isMounted) {
            setAudioQueue(prev => prev.slice(1))
          }
        } catch (err) {
          console.error('Error processing queue item:', err)
          // Remove the failed item from the queue to prevent getting stuck
          if (isMounted) {
            setAudioQueue(prev => prev.slice(1))
          }
        } finally {
          if (isMounted) {
            setQueueProcessing(false)
          }
        }
      }
    }

    processQueue()
    
    return () => {
      isMounted = false;
    }
  }, [audioQueue, queueProcessing, isPlaying])

  // Clear notification after delay
  useEffect(() => {
    if (queueNotification) {
      const timer = setTimeout(() => {
        setQueueNotification(null)
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [queueNotification])

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
      
      // Clean up any existing audio
      if (audioRef.current) {
        // Remove old event listeners to prevent memory leaks
        const oldAudio = audioRef.current
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
        // Process the next item in the queue immediately after current audio ends
        if (audioQueue.length > 0) {
          setTimeout(() => {
            setQueueProcessing(false) // Ensure queue processing can start again
          }, 100)
        }
      })
      
      audioRef.current.addEventListener('error', (e) => {
        // Get detailed error information
        let errorMessage = 'Failed to play audio';
        
        if (audioRef.current && audioRef.current.error) {
          const audioError = audioRef.current.error;
          
          switch (audioError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorMessage = 'Playback aborted by the user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error occurred while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorMessage = 'Audio decoding error';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Audio format not supported';
              break;
            default:
              errorMessage = `Audio error: ${audioError.message || 'Unknown error'}`;
          }
        }
        
        console.error('Audio playback error:', errorMessage);
        setError(errorMessage);
        setIsPlaying(false);
        setIsPlayingFullText(false);
        setIsLoading(false);
      })
      
      // Create audio stream from API
      const response = await fetch('/api/chat/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: contentToPlay }),
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
      console.error('Text-to-speech error:', err)
      setError(err instanceof Error ? err.message : 'Failed to get audio')
      
      setIsPlaying(false)
      setIsPlayingFullText(false)
      setIsLoading(false)
    }
  }

  const addToQueue = (playFullText: boolean = false) => {
    const contentToAdd = playFullText ? fullText : text
    
    if (!contentToAdd) return
    
    // Create a unique ID for this queue item
    const newItem: QueueItem = {
      text: contentToAdd,
      isFullText: playFullText,
      id: Math.random().toString(36).substring(2, 9),
      addedAt: Date.now()
    }
    
    // Add to queue
    setAudioQueue(prev => [...prev, newItem])
    
    // Show notification with queue position
    const queuePosition = audioQueue.length + 1
    setQueueNotification(`Added to queue (position #${queuePosition})`)
    
    // Show queue details for a few seconds
    setShowQueueDetails(true)
    setTimeout(() => {
      setShowQueueDetails(false)
    }, 5000)
  }

  const togglePlay = async (playFullText: boolean = false) => {
    // If we're already loading, prevent multiple requests
    if (isLoading) {
      return
    }
    
    // If we're already playing, either pause or add to queue
    if (isPlaying) {
      // If the user clicks the same button that's currently playing, pause it
      if ((playFullText && isPlayingFullText) || (!playFullText && !isPlayingFullText)) {
        if (audioRef.current) {
          audioRef.current.pause()
          setIsPlaying(false)
        }
      } else {
        // If the user clicks a different button while audio is playing, add to queue
        addToQueue(playFullText)
      }
      return
    }
    
    // If there's already audio loaded and we're just resuming
    if (audioRef.current && audioRef.current.src) {
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.error('Error resuming playback:', err)
        setError('Failed to resume playback. Try again.')
      }
      return
    }
    
    // Otherwise, add to queue
    addToQueue(playFullText)
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
  
  // Get a truncated version of text for display
  const truncateText = (text: string, maxLength: number = 30) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  return (
    <div className="flex flex-col gap-2 mt-2">
      <div className="flex items-center gap-2 tts-controls">
        <Button
          variant="outline"
          size="sm"
          onClick={() => togglePlay(false)}
          disabled={!text}
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
        
        {audioQueue.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQueueDetails(!showQueueDetails)}
            className="h-8 px-2 flex items-center gap-1 text-xs"
            title="Toggle queue details"
          >
            <ListMusic className="h-3 w-3" />
            <span className="font-medium">{audioQueue.length}</span>
            <span className="sr-only">in queue</span>
          </Button>
        )}
        
        {queueNotification && (
          <span className="text-xs text-green-600 animate-pulse font-medium">{queueNotification}</span>
        )}
        
        {error && !queueNotification && (
          <span className="text-xs text-destructive">{error}</span>
        )}
      </div>
      
      {/* Queue details */}
      {showQueueDetails && audioQueue.length > 0 && (
        <div className="mt-2 p-2 bg-muted/30 rounded-md text-xs">
          <div className="font-medium mb-1">Audio Queue:</div>
          <ol className="pl-5 list-decimal">
            {audioQueue.map((item, index) => (
              <li key={item.id} className="mb-1">
                {item.isFullText ? "Full document" : truncateText(item.text)}
                {index === 0 && isPlaying && <span className="ml-2 text-green-600 font-medium">(Now Playing)</span>}
                {index === 0 && !isPlaying && <span className="ml-2 text-blue-600 font-medium">(Next Up)</span>}
              </li>
            ))}
          </ol>
        </div>
      )}
      
      {fullText && (
        <div className="flex items-center mt-1">
          <Button
            variant="outline" 
            size="sm"
            onClick={() => togglePlay(true)}
            disabled={!fullText} 
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