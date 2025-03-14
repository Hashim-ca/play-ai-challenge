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
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
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
      audioRef.current.volume = volume
      audioRef.current.playbackRate = playbackRate
      
      // Add better error handling for mobile devices
      audioRef.current.onerror = (e) => {
        console.error('Audio loading error:', e)
        setError('Audio could not be loaded. Try again or check your connection.')
        setIsLoading(false)
        setIsPlaying(false)
      }
      
      // Play audio - wrap in try/catch since play() can fail
      try {
        await audioRef.current.play()
        setIsPlaying(true)
        
        // Announce to screen readers
        const announcement = document.createElement('div')
        announcement.setAttribute('aria-live', 'polite')
        announcement.classList.add('sr-only')
        announcement.textContent = `Playing audio${isPlayingFullText ? ' for full document' : ''}`
        document.body.appendChild(announcement)
        setTimeout(() => document.body.removeChild(announcement), 1000)
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
  
  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }
  
  const changeVolume = (vol: number) => {
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
    }
  }
  
  const toggleSettings = () => {
    setShowSettings(!showSettings)
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
      <div className="flex flex-wrap items-center gap-2 tts-controls">
        <Button
          variant="outline"
          size="sm"
          onClick={() => togglePlay(false)}
          disabled={!text}
          className={`h-8 w-8 p-0 ${isLoading && !isPlayingFullText ? 'bg-blue-50 dark:bg-blue-950' : ''}`}
          title={isLoading && !isPlayingFullText ? "Loading audio..." : isCurrentTextPlaying ? "Pause" : "Play"}
          aria-label={isLoading && !isPlayingFullText ? "Loading audio..." : isCurrentTextPlaying ? "Pause" : "Play"}
        >
          {isLoading && !isPlayingFullText ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : isCurrentTextPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleMute}
          disabled={isLoading || (!isPlaying && !audioRef.current?.src)}
          className="h-8 w-8 p-0"
          title={isMuted ? "Unmute" : "Mute"}
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSettings}
          className="h-8 w-8 p-0"
          title="Audio settings"
          aria-label="Audio settings"
          aria-expanded={showSettings}
          aria-controls="audio-settings-panel"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="h-4 w-4"
          >
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
          </svg>
        </Button>
        
        {audioQueue.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowQueueDetails(!showQueueDetails)}
            className="h-8 px-2 flex items-center gap-1 text-xs"
            title="Toggle queue details"
            aria-label={`Audio queue (${audioQueue.length} items)`}
            aria-expanded={showQueueDetails}
            aria-controls="audio-queue-panel"
          >
            <ListMusic className="h-3 w-3" />
            <span className="font-medium">{audioQueue.length}</span>
          </Button>
        )}
        
        {queueNotification && (
          <span 
            className="text-xs text-green-600 animate-pulse font-medium"
            aria-live="polite"
          >
            {queueNotification}
          </span>
        )}
        
        {error && !queueNotification && (
          <span 
            className="text-xs text-destructive"
            aria-live="assertive"
          >
            {error}
          </span>
        )}
      </div>
      
      {/* Audio settings panel */}
      {showSettings && (
        <div 
          id="audio-settings-panel"
          className="mt-2 p-3 bg-muted/30 rounded-md text-xs border border-border"
        >
          <div className="font-medium mb-2">Audio Settings</div>
          
          <div className="mb-3">
            <label htmlFor="playback-speed" className="block mb-1">Playback Speed: {playbackRate}x</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">0.5x</span>
              <input
                id="playback-speed"
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={playbackRate}
                onChange={(e) => changePlaybackRate(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
                aria-label="Playback speed"
              />
              <span className="text-muted-foreground">2x</span>
            </div>
          </div>
          
          <div>
            <label htmlFor="volume-control" className="block mb-1">Volume: {Math.round(volume * 100)}%</label>
            <div className="flex items-center gap-2">
              <VolumeX className="h-3 w-3 text-muted-foreground" />
              <input
                id="volume-control"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => changeVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
                aria-label="Volume"
              />
              <Volume2 className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}
      
      {/* Queue details */}
      {showQueueDetails && audioQueue.length > 0 && (
        <div 
          id="audio-queue-panel"
          className="mt-2 p-3 bg-muted/30 rounded-md text-xs border border-border"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="font-medium">Audio Queue</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAudioQueue([])}
              className="h-6 px-1.5 text-[10px]"
              aria-label="Clear queue"
            >
              Clear All
            </Button>
          </div>
          <ol className="pl-5 list-decimal max-h-40 overflow-y-auto">
            {audioQueue.map((item, index) => (
              <li key={item.id} className="mb-1 flex justify-between items-center">
                <div className="truncate max-w-[200px]">
                  {item.isFullText ? "Full document" : truncateText(item.text)}
                  {index === 0 && isPlaying && <span className="ml-2 text-green-600 font-medium">(Playing)</span>}
                  {index === 0 && !isPlaying && <span className="ml-2 text-blue-600 font-medium">(Next)</span>}
                </div>
                {index > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAudioQueue(prev => prev.filter((_item, i) => i !== index))
                    }}
                    className="h-5 w-5 p-0"
                    aria-label="Remove from queue"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
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
            aria-label={isLoading && isPlayingFullText ? "Loading audio..." : isFullTextPlaying ? "Pause" : "Read Full Document"}
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
        <div 
          className="text-xs text-muted-foreground mt-1"
          aria-live="polite"
        >
          Loading audio... {isPlayingFullText ? "(full document)" : "(selected text)"}
        </div>
      )}
      
      {/* Hidden screen reader content */}
      <div className="sr-only" aria-live="polite">
        {isPlaying ? `Playing audio${isPlayingFullText ? ' of full document' : ' of selected text'} at speed ${playbackRate}x` : ''}
      </div>
    </div>
  )
}