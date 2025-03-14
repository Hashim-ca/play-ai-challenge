import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { ProcessingState } from '@/lib/types/chat';

interface ProcessingOverlayProps {
  state: ProcessingState;
  message?: string;
  errorMessage?: string | null;
  metadata?: {
    pageCount?: number;
    documentType?: string;
    processingTimeMs?: number;
  } | null;
  onContinue?: () => void;
}

/**
 * Overlay that displays PDF processing status
 * 
 * This component creates a full-screen overlay to indicate
 * the current state of PDF processing and prevents interaction
 * while processing is in progress.
 */
export function ProcessingOverlay({
  state,
  message,
  errorMessage,
  metadata,
  onContinue,
}: ProcessingOverlayProps) {
  const [isVisible, setIsVisible] = useState(state !== 'idle');
  const [currentState, setCurrentState] = useState(state);

  // Update visibility and state when props change
  useEffect(() => {
    if (state === 'idle') {
      // Fade out smoothly
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Match transition duration
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
      setCurrentState(state);
    }
  }, [state]);

  if (!isVisible && state === 'idle') {
    return null;
  }
  
  const getContent = () => {
    switch (currentState) {
      case 'processing':
        return (
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6">
              <Loader2 className="absolute inset-0 w-full h-full text-primary animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 bg-primary/20 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-3">
              {message || 'Processing Document'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-2">
              Please wait while we analyze your document. This may take a few moments...
            </p>
            <p className="text-xs text-primary animate-pulse">
              Do not navigate away from this page
            </p>
          </div>
        );
        
      case 'completed':
        return (
          <div className="flex flex-col items-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {message || 'Processing Complete'}
            </h3>
            {metadata && (
              <p className="text-muted-foreground text-center">
                {metadata.pageCount ? `Processed ${metadata.pageCount} pages. ` : ''}
                {metadata.processingTimeMs ? `Completed in ${(metadata.processingTimeMs / 1000).toFixed(1)}s` : ''}
              </p>
            )}
          </div>
        );
        
      case 'failed':
        return (
          <div className="flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {message || 'Processing Failed'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {errorMessage || 'There was an error processing your document. Please try again.'}
            </p>
          </div>
        );
      
      default:
        return null;
    }
  };
  
  // Only make the overlay fully blocking during processing
  const isBlocking = currentState === 'processing';
  
  return (
    <div 
      className={`fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 processing-overlay transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        ${isBlocking ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div className={`bg-card p-8 rounded-lg shadow-xl border border-primary/20 pointer-events-auto max-w-md w-full
        ${currentState === 'completed' ? 'border-green-500/20' : ''}
        ${currentState === 'failed' ? 'border-destructive/20' : ''}`}
      >
        {getContent()}
        
        {!isBlocking && currentState !== 'processing' && (
          <div className="mt-6 flex justify-center">
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              onClick={() => {
                // Use either the provided callback or handle internally
                if (onContinue) {
                  onContinue();
                } else {
                  setIsVisible(false);
                  setTimeout(() => setCurrentState('idle'), 300);
                }
              }}
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}